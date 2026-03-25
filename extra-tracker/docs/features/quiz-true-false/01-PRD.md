# PRD: Quiz Vero/Falso AI-Generated

## 1. Problema

Il sistema attuale di quiz V/F (`_transformToTrueFalse`) e' una trasformazione naive:
- Prende card esistenti e sostituisce randomicamente la risposta con una sbagliata
- Nessuna generazione AI dedicata per statements V/F
- Il commento nel codice conferma: `"true_false non completamente implementato"`
- Zero controllo pedagogico sulla qualita' degli statements falsi

## 2. Soluzione MVP

Ogni **deck = un capitolo** dell'esame. Se il deck ha un PDF caricato, l'utente puo' generare un quiz V/F basato sull'**intero testo estratto** dal PDF di quel capitolo.

Generazione AI di quiz Vero/Falso con:
- **Scope = intero PDF del deck** (nessuna selezione pagine, il capitolo e' gia' definito dal deck)
- **Statements pedagogicamente corretti** generati da OpenAI
- **Spiegazione AI** per ogni statement falso (perche' e' falso + verita' corretta)
- **Doppio entry point UX**: inline nel study session + sezione dedicata nel deck

## 3. User Stories

### US-1: Genera quiz V/F per capitolo
> Come studente, voglio generare un quiz Vero/Falso per un capitolo dell'esame (deck con PDF gia' caricato), cosi' posso verificare la comprensione di quel capitolo specifico.

**Acceptance Criteria:**
- [ ] Il sistema usa l'intero `extractedText` del deck come sorgente
- [ ] Il sistema genera N statements V/F dal testo del PDF
- [ ] ~50% statements veri, ~50% falsi (con varianza +-10%)
- [ ] Ogni statement falso ha spiegazione AI

### US-2: Studio quiz V/F con feedback
> Come studente, voglio rispondere Vero o Falso a ogni statement e ricevere feedback immediato con spiegazione se ho sbagliato.

**Acceptance Criteria:**
- [ ] Vedo lo statement e due bottoni: Vero / Falso
- [ ] Feedback immediato: verde se corretto, rosso se sbagliato
- [ ] Se sbaglio: vedo la spiegazione AI (perche' e' falso/vero)
- [ ] La review viene registrata con rating SM-2

### US-3: Salva e ripeti quiz V/F
> Come studente, voglio salvare un quiz V/F generato e poterlo rifare in futuro.

**Acceptance Criteria:**
- [ ] Posso salvare il quiz con nome personalizzato
- [ ] Il quiz appare nella sezione "Quiz Salvati" del deck
- [ ] Posso rilanciare il quiz salvato con le stesse domande
- [ ] Il deck (e il suo PDF) da cui e' basato il quiz viene preservato come riferimento

### US-4: Avvia quiz V/F dal deck detail
> Come studente, voglio una sezione dedicata nella pagina del deck per avviare un quiz V/F.

**Acceptance Criteria:**
- [ ] Sezione visibile solo se il deck ha un PDF gia' caricato
- [ ] Usa automaticamente tutto il PDF del capitolo (no selezione pagine)
- [ ] Posso scegliere il numero di domande
- [ ] Preview del testo disponibile (es. "42 pagine · ~65.000 caratteri")

### US-5: Avvia quiz V/F inline nello study session
> Come studente, voglio poter avviare un quiz V/F anche dal modale di avvio sessione.

**Acceptance Criteria:**
- [ ] Opzione "Vero/Falso" nel selettore modalita' studio
- [ ] Disponibile solo se il deck ha PDF
- [ ] Funziona come le altre modalita' (quiz, flashcard, ecc.)

## 4. Scope MVP vs Future

### MVP (v1)
- Generazione AI statements V/F dall'intero PDF del deck
- QuizView adattato per V/F con spiegazioni
- Salvataggio quiz snapshot
- Entry point inline + sezione deck
- Tracking review SM-2

### Future (v2+)
- Selezione range pagine specifiche (sub-capitolo)
- Difficolta' adattiva (statements piu' sottili dopo N quiz corretti)
- Generazione V/F da card manuali (senza PDF)
- Quiz V/F cross-deck (aggregare piu' capitoli)
- Statistiche per capitolo
- Modalita' "marathon" con timer
- Export quiz V/F in formato stampabile

## 5. Metriche di Successo

| Metrica | Target MVP |
|---------|-----------|
| Qualita' statements (user rating) | >= 4/5 media |
| Tempo generazione (10 domande) | < 8 secondi |
| Costo AI per quiz (10 domande) | < $0.02 |
| Adoption rate (utenti che provano V/F) | > 30% utenti attivi |

## 6. Vincoli Tecnici

- **Dipendenza PDF**: Il deck DEVE avere `extractedText` (PDF caricato)
- **Minimo testo**: Almeno 500 caratteri di testo estratto
- **Rate limiting AI**: Rispettare i limiti esistenti (1.5s tra chunks)
- **Compatibilita'**: Il sistema V/F attuale (card-based) resta funzionante come fallback
- **Chunking**: Per PDF lunghi, il testo viene spezzato in chunk come per MCQ (pipeline esistente)

## 7. Rischi

| Rischio | Impatto | Mitigazione |
|---------|---------|-------------|
| Qualita' statements falsi troppo ovvi | Alto | Prompt engineering con errori plausibili (inversioni, generalizzazioni) |
| Latenza generazione per PDF grandi | Medio | Chunking + parallelizzazione (pipeline gia' esistente per MCQ) |
| Costo AI per utenti heavy | Basso | Rate limiting per utente + budget giornaliero |
| PDF con poco testo estratto (scan/immagini) | Medio | Validazione minimo 500 chars, messaggio chiaro all'utente |
