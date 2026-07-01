/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

// Usa require CJS per ottenere gli STESSI singleton che i moduli server usano
// internamente (l'import ESM crea un wrapper diverso e lo spy non colpirebbe).
const require = createRequire(import.meta.url);
const sessionQuizService = require('../../../../../server/services/study/sessionQuizService.js');
const aiUsageService = require('../../../../../server/services/aiUsageService.js');

/**
 * Riproduce lo scenario reale dai log di produzione: il modello restituisce un JSON
 * troncato a metà (finish_reason = "length"). Prima della fix il parser scartava
 * TUTTO → 0 domande → circuit breaker → fallimento. Ora deve recuperare le domande
 * complete già presenti nel JSON parziale.
 */
describe('quiz generation — recupero da risposta AI troncata', () => {
    beforeEach(() => {
        process.env.ANTHROPIC_AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || 'test-token';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('recupera le domande complete da un JSON MCQ troncato invece di fallire', async () => {
        // 2 domande complete + una terza tagliata a metà (come nei log reali).
        const truncatedJson = `{
  "questions": [
    {
      "questionText": "Perché l'ammortamento viene aggiunto al reddito netto nel flusso di cassa?",
      "correctAnswer": "È un costo non monetario che non comporta uscita di cassa.",
      "difficulty": "standard",
      "correctAnswerExplanation": "L'ammortamento riduce l'utile contabile ma non muove cassa.",
      "distractors": ["Aumenta i ricavi", "È una tassa", "Riduce il capitale sociale"],
      "explanations": ["Non è un ricavo", "Non è un tributo", "Non tocca il capitale"]
    },
    {
      "questionText": "Cosa misura il flusso di cassa operativo?",
      "correctAnswer": "La liquidità generata dalla gestione caratteristica.",
      "difficulty": "standard",
      "correctAnswerExplanation": "Isola la cassa prodotta dal core business.",
      "distractors": ["L'utile netto", "Il patrimonio netto", "I debiti totali"],
      "explanations": ["È un dato contabile", "È uno stock", "Sono passività"]
    },
    {
      "questionText": "Perché la gestione della liquidità è fondamentale? La ris`;

        const completion = {
            choices: [{ message: { content: truncatedJson }, finish_reason: 'length' }],
            usage: { prompt_tokens: 3000, completion_tokens: 8192 },
        };

        // Intercetta la chiamata AI reale restituendo la risposta troncata.
        vi.spyOn(aiUsageService, 'runTrackedChatCompletion').mockResolvedValue(completion);

        const questions = await sessionQuizService.generateQuizFromPDFText(
            'Testo PDF di finanza aziendale sufficientemente lungo per il test. '.repeat(10),
            5,
        );

        // Prima della fix: 0 domande + throw. Dopo: 2 domande complete recuperate.
        expect(questions).toHaveLength(2);
        expect(questions[0].questionText).toContain('ammortamento');
        expect(questions[0].distractors).toHaveLength(3);
        expect(questions[1].correctAnswer).toContain('liquidità generata');
    });
});
