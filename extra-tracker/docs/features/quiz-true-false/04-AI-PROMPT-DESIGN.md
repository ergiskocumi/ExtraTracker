# AI Prompt Design: Quiz Vero/Falso

## 1. Strategia

Il prompt attuale per MCQ (`quizHelpers.js`) usa un approccio pedagogico basato su Instructional Design e Cognitive Load Theory. Il prompt V/F deve essere diverso perche' il formato richiede:
- **Statements assertivi** (non domande)
- **Errori sottili** per gli statements falsi (non errori ovvi)
- **Bilanciamento 50/50** tra vero e falso
- **Spiegazioni per entrambi** (perche' e' vero, perche' e' falso)

Il testo sorgente e' l'intero `extractedText` del deck (= PDF del capitolo). Viene chunked con la stessa strategia MCQ (5000 chars, 500 overlap).

---

## 2. System Prompt

```
You are an expert educational assessment designer specializing in True/False statements for university-level exams. You follow evidence-based assessment design principles from Bloom's Taxonomy and Cognitive Load Theory.

Your task: Generate True/False statements from the provided academic text.

## RULES (STRICT)

### Statement Quality
1. Each statement MUST be self-contained and understandable WITHOUT access to the source text
2. Statements must test UNDERSTANDING, not memorization of exact wording
3. Statements must be UNAMBIGUOUS - there must be only one correct answer (True or False)
4. Avoid absolute terms ("always", "never", "all", "none") unless the source material explicitly supports them
5. Avoid double negatives
6. Each statement should test ONE concept only

### False Statement Design (CRITICAL)
False statements must contain PLAUSIBLE errors that test real understanding. Use these distortion patterns:
- **Causal Inversion**: Swap cause and effect ("X causes Y" -> "Y causes X")
- **Quantitative Distortion**: Change numbers, percentages, or quantities slightly
- **Category Confusion**: Attribute a property of concept A to concept B (within the same domain)
- **Overgeneralization**: Make a specific truth into a universal claim
- **Temporal Displacement**: Change the order or timing of events/processes
- **Mechanism Swap**: Replace the correct mechanism/process with a related but incorrect one

FORBIDDEN distortion patterns:
- Obvious contradictions that any student would catch
- Adding "not" to a true statement
- Changing names to completely unrelated concepts
- Absurd claims disconnected from the subject matter

### Distribution
- Generate approximately 50% True and 50% False statements (variance: +-10%)
- Mix difficulties: ~70% standard, ~30% hard
- Hard statements should use subtle distortions that require deep understanding

### Explanation Format
- For TRUE statements: Explain WHY it's true with additional context
- For FALSE statements: Explain WHAT specifically is wrong AND provide the corrected version
- Explanations must be 1-3 sentences, pedagogically useful
- The corrected version must be a clear, factual restatement
```

---

## 3. User Prompt Template

```
Generate {questionCount} True/False statements from the following academic text.

{previousStatements.length > 0 ? `
IMPORTANT: Avoid generating statements that overlap with these previously generated ones:
${previousStatements.map((s, i) => `${i+1}. ${s}`).join('\n')}
` : ''}

--- START OF TEXT ---
{textChunk}
--- END OF TEXT ---
```

---

## 4. JSON Schema (Structured Output)

```json
{
  "name": "true_false_quiz",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "statements": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "statement": {
              "type": "string",
              "description": "A clear, self-contained True/False statement"
            },
            "isTrue": {
              "type": "boolean",
              "description": "Whether the statement is factually correct"
            },
            "explanation": {
              "type": "string",
              "description": "1-3 sentence explanation of why the statement is true or false"
            },
            "correctStatement": {
              "type": ["string", "null"],
              "description": "For FALSE statements only: the corrected version. Null for TRUE statements."
            },
            "difficulty": {
              "type": "string",
              "enum": ["standard", "hard"]
            },
            "distortionPattern": {
              "type": ["string", "null"],
              "enum": [
                "causal_inversion",
                "quantitative_distortion",
                "category_confusion",
                "overgeneralization",
                "temporal_displacement",
                "mechanism_swap",
                null
              ],
              "description": "For FALSE statements: which distortion pattern was used. Null for TRUE statements."
            }
          },
          "required": [
            "statement",
            "isTrue",
            "explanation",
            "correctStatement",
            "difficulty",
            "distortionPattern"
          ],
          "additionalProperties": false
        }
      }
    },
    "required": ["statements"],
    "additionalProperties": false
  }
}
```

---

## 5. Parametri Modello

```javascript
{
  model: DISTRACTOR_AI_MODEL,  // Stesso modello usato per MCQ (gpt-4o / gpt-5.2)
  temperature: 0.4,            // Leggermente piu' alto di MCQ (0.35) per varieta' statements
  max_tokens: 4000,            // ~15 statements richiedono ~3000 tokens
  response_format: {
    type: 'json_schema',
    json_schema: trueFalseSchema  // Schema sopra
  }
}
```

---

## 6. Post-Processing & Validation

### 6.1 Validazione Output AI

```javascript
function validateTrueFalseOutput(output, requestedCount) {
  const checks = [];

  // 1. Numero statements
  if (output.statements.length < requestedCount * 0.7) {
    checks.push({ level: 'warning', msg: 'AI ha generato meno statements del richiesto' });
  }

  // 2. Bilanciamento V/F
  const trueCount = output.statements.filter(s => s.isTrue).length;
  const ratio = trueCount / output.statements.length;
  if (ratio < 0.3 || ratio > 0.7) {
    checks.push({ level: 'warning', msg: `Sbilanciamento V/F: ${Math.round(ratio*100)}% veri` });
  }

  // 3. Statements falsi devono avere correctStatement
  for (const s of output.statements) {
    if (!s.isTrue && !s.correctStatement) {
      checks.push({ level: 'error', msg: `Statement falso senza correctStatement: "${s.statement.slice(0,50)}..."` });
    }
  }

  // 4. Spiegazioni presenti
  for (const s of output.statements) {
    if (!s.explanation || s.explanation.length < 20) {
      checks.push({ level: 'warning', msg: `Spiegazione troppo corta per: "${s.statement.slice(0,50)}..."` });
    }
  }

  // 5. Duplicati (similarity check)
  const seen = new Set();
  for (const s of output.statements) {
    const normalized = s.statement.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(normalized)) {
      checks.push({ level: 'error', msg: `Statement duplicato: "${s.statement.slice(0,50)}..."` });
    }
    seen.add(normalized);
  }

  return checks;
}
```

### 6.2 Retry Strategy

```
1. Prima chiamata AI
2. Se output invalido (errori critici):
   a. Retry con temperature +0.1 (max 0.7)
   b. Max 2 retry
3. Se dopo retry ancora invalido:
   a. Filtra statements validi
   b. Se >= 3 validi: ritorna quelli
   c. Se < 3: errore AI_GENERATION_FAILED
```

---

## 7. Chunking Strategy

Stessa pipeline di MCQ gia' presente in `quizHelpers.js`:

```javascript
// Riutilizzare _splitTextIntoChunks() esistente
const chunks = _splitTextIntoChunks(deck.extractedText, 5000, 500);

// Distribuire le domande tra i chunks
const questionsPerChunk = Math.ceil(questionCount / chunks.length);

// Per ogni chunk: generare V/F statements
// Tracciare previousStatements per evitare duplicati tra chunks
// 1.5s delay tra chunks (rate limiting API)
```

Questo riutilizza la logica esistente di `generateQuizFromFullPDF()` adattandola per V/F.

---

## 8. Confronto con Prompt MCQ Esistente

| Aspetto | MCQ (attuale) | V/F (nuovo) |
|---------|--------------|-------------|
| Output | Domanda + 4 opzioni + spiegazioni | Statement + V/F + spiegazione + correzione |
| Temperature | 0.35 | 0.4 |
| Complessita' prompt | Alta (distractor design) | Media (statement design) |
| Token/domanda stimati | ~200 | ~120 |
| Costo stimato (10 dom.) | ~$0.015 | ~$0.01 |
| Post-processing | Shuffle opzioni, map explanations | Validazione bilanciamento |

---

## 9. Esempio Output AI Atteso

**Input**: Intero extractedText di un deck di biologia cellulare, 5 domande

**Output**:
```json
{
  "statements": [
    {
      "statement": "La membrana cellulare e' composta da un doppio strato fosfolipidico con proteine integrate e periferiche.",
      "isTrue": true,
      "explanation": "Corretto. Il modello a mosaico fluido descrive la membrana come un doppio strato di fosfolipidi con proteine che possono attraversarlo (integrali) o aderirvi sulla superficie (periferiche).",
      "correctStatement": null,
      "difficulty": "standard",
      "distortionPattern": null
    },
    {
      "statement": "L'osmosi e' il movimento di soluti attraverso una membrana semipermeabile da una zona a bassa concentrazione a una ad alta concentrazione.",
      "isTrue": false,
      "explanation": "L'osmosi riguarda il movimento del SOLVENTE (acqua), non dei soluti. L'acqua si muove dalla zona a bassa concentrazione di soluto verso quella ad alta concentrazione per equilibrare le concentrazioni.",
      "correctStatement": "L'osmosi e' il movimento del solvente (acqua) attraverso una membrana semipermeabile da una zona a bassa concentrazione di soluto a una ad alta concentrazione di soluto.",
      "difficulty": "hard",
      "distortionPattern": "mechanism_swap"
    },
    {
      "statement": "I mitocondri possiedono un proprio DNA circolare e possono replicarsi indipendentemente dalla divisione cellulare.",
      "isTrue": true,
      "explanation": "Corretto. I mitocondri hanno DNA circolare (mtDNA) e si riproducono per scissione binaria, un processo che puo' avvenire indipendentemente dal ciclo cellulare. Questo supporta la teoria endosimbiotica.",
      "correctStatement": null,
      "difficulty": "standard",
      "distortionPattern": null
    },
    {
      "statement": "Il reticolo endoplasmatico liscio e' il principale sito di sintesi proteica nella cellula.",
      "isTrue": false,
      "explanation": "La sintesi proteica avviene nel reticolo endoplasmatico RUGOSO (dotato di ribosomi), non nel liscio. Il RE liscio e' coinvolto nella sintesi di lipidi, nel metabolismo dei carboidrati e nella detossificazione.",
      "correctStatement": "Il reticolo endoplasmatico rugoso e' il principale sito di sintesi proteica nella cellula eucariotica.",
      "difficulty": "standard",
      "distortionPattern": "category_confusion"
    },
    {
      "statement": "Tutte le cellule eucariotiche contengono cloroplasti per la fotosintesi.",
      "isTrue": false,
      "explanation": "Solo le cellule vegetali e alcune alghe contengono cloroplasti. Le cellule animali e fungine sono eucariotiche ma non possiedono cloroplasti e non effettuano fotosintesi.",
      "correctStatement": "Solo le cellule vegetali e di alcune alghe contengono cloroplasti per la fotosintesi.",
      "difficulty": "standard",
      "distortionPattern": "overgeneralization"
    }
  ]
}
```
