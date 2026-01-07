/**
 * 🧞 AI GOAL SERVICE - Smart Goal Wizard
 * ======================================
 * 
 * Servizio AI per generare piani strategici completi (Blueprint).
 * L'utente esprime un desiderio e il sistema genera:
 * - Titolo e descrizione ottimizzati
 * - Milestones con deadline calcolate
 * - Reasoning (perché questo step)
 * - Action steps concreti
 * - Risorse consigliate (libri, link, app)
 * 
 * Utilizza LangChain con Zod per Structured Output (contratto garantito).
 */

const { ChatOpenAI } = require('@langchain/openai');
const { StructuredOutputParser } = require('@langchain/core/output_parsers');
const { z } = require('zod');

// =========================================
// ZOD SCHEMAS (Contratto AI)
// =========================================

/**
 * Schema per una singola milestone AI-generata
 */
const AIMilestoneSchema = z.object({
    title: z.string().describe('Titolo breve e chiaro della milestone (max 100 caratteri)'),
    deadline: z.string().describe('Data di scadenza in formato ISO (YYYY-MM-DD)'),
    reasoning: z.string().describe('Spiegazione del PERCHÉ questo step è necessario (2-3 frasi)'),
    actionSteps: z.array(z.string()).min(2).max(3).describe('2-3 azioni concrete e specifiche da compiere'),
    resources: z.array(z.string()).min(1).max(3).describe('1-3 risorse utili: libri, siti web, app, strumenti'),
});

/**
 * Schema completo per il Goal Plan generato dall'AI
 */
const AIGoalPlanSchema = z.object({
    title: z.string().describe('Titolo accattivante e motivante per l\'obiettivo (max 100 caratteri)'),
    description: z.string().describe('Descrizione strategica dell\'obiettivo in 2-3 frasi'),
    type: z.enum(['target', 'habit', 'milestone', 'challenge', 'project']).describe('Tipo di obiettivo più adatto'),
    targetValue: z.number().nullable().describe('Valore target numerico se applicabile, altrimenti null'),
    unit: z.string().describe('Unità di misura (€, km, libri, sessioni, ecc.) o stringa vuota'),
    frequency: z.number().nullable().describe('Frequenza settimanale per habit (1-7), altrimenti null'),
    milestones: z.array(AIMilestoneSchema).min(3).max(7).describe('3-7 milestones progressive per raggiungere l\'obiettivo'),
});

// =========================================
// INTENSITY CONFIGURATIONS
// =========================================

const INTENSITY_CONFIG = {
    relax: {
        label: 'Relax 🐢',
        durationMultiplier: 1.5, // 50% più tempo
        milestonesCount: 3,
        systemNote: 'L\'utente preferisce un approccio rilassato. Distribuisci le milestone su un periodo più lungo con meno pressione.',
    },
    normal: {
        label: 'Normale 🚶',
        durationMultiplier: 1.0,
        milestonesCount: 5,
        systemNote: 'L\'utente vuole un approccio equilibrato. Milestone sfidanti ma raggiungibili.',
    },
    hardcore: {
        label: 'Hardcore 🔥',
        durationMultiplier: 0.7, // 30% meno tempo
        milestonesCount: 7,
        systemNote: 'L\'utente vuole una sfida intensa! Crea un piano ambizioso con deadline ravvicinate e milestone frequenti.',
    },
};

// =========================================
// CATEGORY CONTEXT
// =========================================

const CATEGORY_CONTEXT = {
    finance: 'Obiettivi finanziari: risparmio, investimenti, budget, debiti, entrate passive.',
    health: 'Obiettivi salute: fitness, alimentazione, sonno, abitudini sane, sport.',
    learning: 'Obiettivi apprendimento: corsi, libri, certificazioni, lingue, competenze tecniche.',
    career: 'Obiettivi carriera: promozione, networking, side project, skill professionali.',
    personal: 'Obiettivi personali: hobby, viaggi, decluttering, journaling, crescita personale.',
    relationships: 'Obiettivi relazioni: famiglia, amicizie, networking sociale, comunicazione.',
    creativity: 'Obiettivi creativi: arte, musica, scrittura, design, progetti creativi.',
    mindfulness: 'Obiettivi mindfulness: meditazione, yoga, gratitudine, digital detox, benessere mentale.',
};

// =========================================
// AI GOAL SERVICE
// =========================================

class AIGoalService {
    constructor() {
        this.model = null;
    }

    /**
     * Inizializza il modello LangChain (lazy loading)
     */
    _getModel() {
        if (!this.model) {
            this.model = new ChatOpenAI({
                modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                temperature: 0.7,
                openAIApiKey: process.env.OPENAI_API_KEY,
            });
        }
        return this.model;
    }

    /**
     * Calcola le date delle milestone basate sull'intensità
     * @param {number} milestoneCount - Numero di milestones
     * @param {number} durationMultiplier - Moltiplicatore durata
     * @returns {Date[]} Array di date
     */
    _calculateMilestoneDates(milestoneCount, durationMultiplier) {
        const today = new Date();
        const dates = [];
        
        // Base: 3 mesi per un obiettivo standard
        const baseDurationDays = 90;
        const totalDays = Math.round(baseDurationDays * durationMultiplier);
        const intervalDays = Math.round(totalDays / milestoneCount);

        for (let i = 1; i <= milestoneCount; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + (intervalDays * i));
            dates.push(date);
        }

        return dates;
    }

    /**
     * Genera un piano strategico completo per un obiettivo
     * @param {string} userId - ID dell'utente
     * @param {string} category - Categoria obiettivo
     * @param {string} userQuery - Desiderio/intento dell'utente
     * @param {string} intensity - 'relax' | 'normal' | 'hardcore'
     * @returns {Promise<Object>} Piano strutturato
     */
    async generateGoalPlan(userId, category, userQuery, intensity = 'normal') {
        const model = this._getModel();
        const config = INTENSITY_CONFIG[intensity] || INTENSITY_CONFIG.normal;
        const categoryContext = CATEGORY_CONTEXT[category] || '';

        // Calcola le date suggerite per le milestone
        const suggestedDates = this._calculateMilestoneDates(
            config.milestonesCount,
            config.durationMultiplier
        );

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const finalDeadline = suggestedDates[suggestedDates.length - 1];
        const finalDeadlineStr = finalDeadline.toISOString().split('T')[0];

        // Parser Zod per garantire l'output strutturato
        const parser = StructuredOutputParser.fromZodSchema(AIGoalPlanSchema);

        const formatInstructions = parser.getFormatInstructions();

        const systemPrompt = `Sei Silvi, un Life Coach esperto di livello mondiale con anni di esperienza nel coaching strategico.

CONTESTO:
- Data odierna: ${todayStr}
- Categoria: ${category} - ${categoryContext}
- Intensità richiesta: ${config.label}
- ${config.systemNote}
- Deadline finale suggerita: ${finalDeadlineStr}

IL TUO COMPITO:
Analizza l'obiettivo dell'utente e crea un PIANO STRATEGICO CONCRETO.

REGOLE FONDAMENTALI:
1. NON essere vago - ogni step deve essere SPECIFICO e AZIONABILE
2. Le date delle milestone devono essere distribuite da ${todayStr} a ${finalDeadlineStr}
3. Per ogni milestone, suggerisci RISORSE REALI:
   - Libri specifici con autore (es. "Atomic Habits di James Clear")
   - Siti web esistenti (es. "Coursera.org", "Duolingo")
   - App reali (es. "MyFitnessPal", "Notion", "Anki")
   - Strumenti concreti (es. "Google Sheets per il budget")
4. Gli action steps devono essere completabili in 1-2 settimane
5. Il reasoning deve spiegare PERCHÉ questo step è cruciale nel percorso
6. Usa la lingua ITALIANA per tutto
7. RISPOSTA: restituisci SOLO JSON valido, senza markdown, senza testo extra
8. Formato JSON obbligatorio:
${formatInstructions}

NUMERO MILESTONE: Genera esattamente ${config.milestonesCount} milestone progressive.`;

        const userPrompt = `L'utente vuole: "${userQuery}"

Genera un piano strategico completo con:
- Titolo motivante
- Descrizione che ispiri all'azione
- Tipo di obiettivo più adatto (target/habit/milestone/challenge/project)
- ${config.milestonesCount} milestone con date, reasoning, azioni concrete e risorse reali`;

        try {
            console.log('🤖 AI Goal Service: Calling OpenAI...');
            console.log('📝 Category:', category, '| Intensity:', intensity);

            const result = await model.invoke([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ]);

            // Estrai il testo grezzo dalla risposta del modello
            const rawContent = typeof result.content === 'string'
                ? result.content
                : Array.isArray(result.content)
                    ? result.content.map((c) => (typeof c === 'string' ? c : c?.text || '')).join('\n')
                    : JSON.stringify(result.content);

            // Valida e struttura l'output con Zod
            let parsed;
            try {
                parsed = await parser.parse(rawContent);
            } catch (parseErr) {
                // Retry: estrai eventuale blocco JSON tra ``` o dopo Markdown
                const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/i) || rawContent.match(/```\s*([\s\S]*?)```/i);
                if (jsonMatch && jsonMatch[1]) {
                    parsed = await parser.parse(jsonMatch[1]);
                } else {
                    throw parseErr;
                }
            }

            console.log('✅ AI Goal Service: Response parsed');

            // Post-process: aggiusta le date se necessario
            const processedMilestones = parsed.milestones.map((milestone, index) => {
                // Usa la data suggerita se quella dell'AI non è valida
                let deadlineDate;
                try {
                    deadlineDate = new Date(milestone.deadline);
                    if (isNaN(deadlineDate.getTime())) {
                        deadlineDate = suggestedDates[index] || suggestedDates[suggestedDates.length - 1];
                    }
                } catch {
                    deadlineDate = suggestedDates[index] || suggestedDates[suggestedDates.length - 1];
                }

                return {
                    ...milestone,
                    deadline: deadlineDate.toISOString(),
                    weight: Math.min(index + 1, 5), // Peso crescente
                    isCompleted: false,
                };
            });

            return {
                success: true,
                data: {
                    title: parsed.title,
                    description: parsed.description,
                    type: parsed.type,
                    targetValue: parsed.targetValue,
                    unit: parsed.unit || '',
                    frequency: parsed.frequency,
                    category,
                    deadline: finalDeadline.toISOString(),
                    milestones: processedMilestones,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                        intensity,
                        aiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    },
                },
            };
        } catch (error) {
            console.error('❌ AI Goal Service Error:', error.message);
            console.error('❌ Full error:', JSON.stringify(error, null, 2));
            
            // Fallback con struttura base in caso di errore
            return {
                success: false,
                error: error.message || 'Errore nella generazione del piano',
                fallback: this._generateFallbackPlan(category, userQuery, suggestedDates),
            };
        }
    }

    /**
     * Genera un piano fallback in caso di errore AI
     */
    _generateFallbackPlan(category, userQuery, dates) {
        const truncatedQuery = userQuery.length > 80 
            ? userQuery.substring(0, 77) + '...' 
            : userQuery;

        return {
            title: truncatedQuery,
            description: `Piano per raggiungere: ${userQuery}`,
            type: 'milestone',
            targetValue: null,
            unit: '',
            frequency: null,
            category,
            deadline: dates[dates.length - 1]?.toISOString() || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            milestones: [
                {
                    title: 'Definisci il punto di partenza',
                    deadline: dates[0]?.toISOString() || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    reasoning: 'Capire dove sei ora è fondamentale per tracciare il percorso giusto.',
                    actionSteps: ['Fai un assessment della situazione attuale', 'Identifica le risorse disponibili'],
                    resources: ['Notion.so per organizzare le idee'],
                    weight: 1,
                    isCompleted: false,
                },
                {
                    title: 'Primi passi concreti',
                    deadline: dates[1]?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    reasoning: 'Le prime azioni creano momentum e costruiscono fiducia.',
                    actionSteps: ['Completa la prima azione chiave', 'Monitora i progressi'],
                    resources: ['Google Calendar per schedulare le attività'],
                    weight: 2,
                    isCompleted: false,
                },
                {
                    title: 'Raggiungi il traguardo',
                    deadline: dates[2]?.toISOString() || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                    reasoning: 'La fase finale richiede focus e determinazione.',
                    actionSteps: ['Completa le azioni rimanenti', 'Celebra il successo'],
                    resources: ['Habitica per gamificare il progresso'],
                    weight: 3,
                    isCompleted: false,
                },
            ],
        };
    }
}

// Singleton export
module.exports = new AIGoalService();
