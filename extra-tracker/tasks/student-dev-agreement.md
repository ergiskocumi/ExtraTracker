# Conversazione Studente - Sviluppatore: ExtraTracker

> Sessione di feedback realistica basata sul codice sorgente del progetto.
> Data simulata: Marzo 2026

---

## La Conversazione

**STUDENTE:** Ok, devo parlarti di alcune cose che mi stanno mandando fuori di testa. Uso questa app ogni giorno per preparare gli esami e ci sono dei problemi che mi bloccano il workflow. Partiamo da quello più grosso: la sidebar del DeckDetailPage ha lo streak hardcoded a "12 giorni". Ho aperto il codice, l'ho guardato con i miei occhi. `value="12"` fisso, nel `StatCard`. Ma io lo streak ce l'ho davvero? Non lo saprò mai?

**SVILUPPATORE:** Sì, lo so. È uno stub che ho lasciato lì perché il backend non espone ancora un endpoint per le streak. Il frontend è pronto concettualmente — il componente `StatCard` riceve già `value` come prop — ma il dato non arriva dall'API. È nella lista delle cose da fare, ma per implementarlo correttamente serve tracciare le sessioni giornaliere lato backend e calcolare la streak in modo affidabile. Non è due righe.

**STUDENTE:** Non è due righe lo capisco, ma intanto mi mostri un numero falso! Mostrami un trattino, mostrami "N/D", mostrami zero — qualsiasi cosa è meglio di "12" hardcoded. Ogni volta che apro il mazzo penso di avere uno streak di 12 giorni e non è vero. È un dato che mi condiziona psicologicamente.

**SVILUPPATORE:** Su questo hai ragione al cento per cento. Non è una questione di complessità backend, è una questione di onestà verso l'utente. Sostituire `"12"` con `"—"` e mettere un tooltip "Funzionalità in arrivo" è un fix di trenta secondi. Ammetto l'errore. Questa la sistemo domani.

**STUDENTE:** Bene. Seconda cosa: la sezione "Attività Recenti" nella sidebar destra del DeckDetailContent — anche quella è hardcoded. Tre voci fisse: "Studio completato 2h fa", "10 carte aggiunte 5h fa", "Magic Generate 1g fa". Stessa cosa per tutti i mazzi, sempre. Ma che attività recenti sono se sono le stesse da quando ho aperto l'app per la prima volta?

**SVILUPPATORE:** Anche lì è uno skeleton UI che non ho mai connesso a dati reali. L'idea era di mostrare un activity feed per mazzo, ma richiederebbe un sistema di event logging lato backend che non esiste ancora. L'alternativa a breve termine sarebbe derivare qualcosa dai dati che già abbiamo: per esempio, `deck.updatedAt` per l'ultima modifica, `deck.dueCount` per capire se ci sono state sessioni recenti. Ma è un'approssimazione grezza.

**STUDENTE:** Perfetto, anche lì: o la connetti a dati reali, anche approssimativi, o la togli. Una sezione con dati falsi è peggio di nessuna sezione. Mi distrae, mi fa pensare che l'app stia tracciando cose che non sta tracciando.

**SVILUPPATORE:** Concordo. In assenza di un event log, la soluzione è rimuovere la sezione o renderla basata sui campi che esistono già nel `Deck` type: `createdAt`, `updatedAt` e il numero di carte. Non è ricca, ma è onesta.

**STUDENTE:** Terzo punto, e questo mi fa incazzare di più: il reset del progresso. Quando vado su Impostazioni e premo "Reset Progresso", il `handleResetProgress` in `DeckDetailPage` costruisce localmente un array di carte con `status: 'new'` e aggiorna lo state, poi chiama `loadDeck()`. Ma non chiama nessun endpoint API per persistere il reset. Se ricarico la pagina, il progresso è tornato com'era. Ho perso un anno di SRS per niente — o meglio, non l'ho perso, ma pensavo di farlo. C'è un commento nel codice che dice letteralmente "Per ora simuliamo il reset locale". Questo è un bug critico.

**SVILUPPATORE:** Hai ragione che è un problema. Il codice ha quel commento perché all'epoca in cui ho scritto quella parte il backend non aveva ancora un endpoint `POST /decks/:id/reset-progress`. Adesso ce l'ha, ma non ho mai aggiornato il frontend. Il comportamento è incoerente: visivamente sembra che il reset sia avvenuto, ma dopo un reload tutto torna indietro. È un falso positivo pericoloso. Il fix è diretto: chiamare l'endpoint reale invece di mutare lo state localmente.

**STUDENTE:** E lo toast dice "Progresso resettato con successo" anche quando non è successo nulla di reale. Questo è design ingannevole. Capisco i trade-off temporanei, ma un toast di successo su un'operazione che non persiste è un bug, non un TODO.

**SVILUPPATORE:** Concordo senza riserve. Il toast dovrebbe venire emesso solo dopo la conferma dal server. Metto questa in cima alla lista insieme alla streak.

**STUDENTE:** Quarto punto: il `QuizView`. Dentro c'è un `useEffect` che fa una `fetch` verso `http://127.0.0.1:7244/ingest/f83237b4-4e05-491b-b343-eba64fcbd5fe` ogni volta che cambia `card.id` e anche su ogni resize della finestra. Manda dati di layout: viewport width, viewport height, dimensioni del container, ID della carta. Questo è un endpoint di debug locale — probabilmente un agent di instrumentazione che usavi per sviluppare. In produzione questa `fetch` fallisce silenziosamente (c'è un `.catch(() => {})`) ma viene eseguita comunque. Su mobile con connessione lenta questo significa decine di richieste di rete inutili durante il quiz. Cosa ci fa quel codice lì?

**SVILUPPATORE:** Quello è rimasto da una sessione di debugging con uno strumento di analisi layout AI-assisted che usavo per ottimizzare il responsive del QuizView. Il `.catch(() => {})` fa sì che non rompa nulla, ma hai ragione: è codice di debug che non doveva finire in produzione e che genera traffico inutile. Su mobile peggiora le performance proprio durante la parte più critica dell'app — il quiz. Va rimosso immediatamente. Non c'è nessuna giustificazione per tenerlo.

**STUDENTE:** Esatto. E c'è anche il commento `// #region agent log` nel codice, quindi è chiaramente identificato come temporaneo. Il fatto che sia arrivato in produzione mi preoccupa: quante altre cose simili ci sono in giro?

**SVILUPPATORE:** Punto legittimo. Il processo di review dovrebbe catturare questi pattern — fetch a localhost, console.log, endpoint hardcoded. Aggiungo una rule ESLint per bloccare `fetch('http://127.0.0.1')` e `fetch('http://localhost')` in produzione.

**STUDENTE:** Parliamo della modalità di studio. Ho sette modalità definite in `STUDY_MODES`: flashcard, quiz, typing, mix, sprint, focus, exam. Ma quando avvio una sessione dalla pagina del mazzo, posso scegliere solo il numero di domande e il tipo di quiz. Non c'è nessuna UI per scegliere la modalità prima di iniziare. "Studia" ti porta direttamente in modalità flashcard senza chiederti niente. Dove sono le altre modalità?

**SVILUPPATORE:** Le modalità esistono e il backend le gestisce tutte. Il punto di accesso principale per scegliere la modalità è la pagina di sessione con i query params — puoi passare `?mode=typing` nell'URL e funziona. Ma hai ragione che manca una UI di selezione prima di iniziare. C'era un modal di configurazione della sessione, ma l'ho rimosso perché era diventato troppo complesso e confondeva gli utenti. L'idea era di rifarlo più semplice, ma non l'ho mai rifatto.

**STUDENTE:** Quindi le modalità "typing", "mix", "sprint", "focus" sono accessibili solo via URL manuale? Questo è un problema enorme. Il typing mode è fantastico per memorizzare, lo uso tantissimo — ma devo costruirmi i link a mano? Non si può sapere che esiste se non si legge il codice sorgente.

**SVILUPPATORE:** Hai ragione. La soluzione minima è un dropdown o un set di pill prima dell'avvio della sessione. Non serve rifare tutto il modal complesso — bastano cinque pulsanti: Flashcard, Quiz, Typing, Mix, Esame. Il resto lo teniamo accessibile via URL per usi avanzati.

**STUDENTE:** Sul TypingView ho un'altra osservazione. Il feedback è binario: "Esatto!" o "Non proprio." Non viene mostrato il punteggio di similarità (`similarity` nella response di `onVerify`), e il rating SRS è sempre 1 (sbagliato) o 5 (perfetto) — non c'è via di mezzo. Se scrivo "la cellula è l'unità fondamentale della vita" e la risposta corretta è "la cellula è la struttura base di tutti gli organismi viventi", il sistema dice sbagliato e mi mette rating 1, come se non sapessi niente. La similarità è calcolata, è nella risposta, ma non la mostri e non la usi.

**SVILUPPATORE:** Questo è un punto tecnico valido. Il `TypingView` riceve `similarity` nella risposta di `onVerify` ma il campo non viene usato. Il problema è decidere la soglia: similarity >= 0.85 è "abbastanza corretto" o no? Ho scelto conservativamente il binary match per semplicità, ma hai ragione che perde sfumatura. Mostrare il punteggio di similarità all'utente sarebbe già un miglioramento, anche senza cambiare il rating — così l'utente capisce che era vicino.

**STUDENTE:** Esatto. Almeno dimmi "risposta simile all'80%" invece di dirmi solo "sbagliato". E magari dai rating 3 invece di 1 per similarità alta. Anche questo migliora il SRS nel lungo periodo.

**SVILUPPATORE:** Concordo sulla visualizzazione. Sul rating graduale sono più cauto — cambiare la curva SRS richiede testing. Ma mostrare la percentuale di similarità è una cosa che si fa in tre righe.

**STUDENTE:** Parlami del `buildOptions` nel QuizView. Ho notato che quando le opzioni generate dall'AI sono meno di 4, il sistema aggiunge fallback come "Nessuna delle precedenti", "Altro", "Non specificato". Questi distrattori generici sono inutili — in un quiz a risposta multipla su contenuti universitari, "Nessuna delle precedenti" non aiuta a imparare nulla, anzi depotenzia la domanda. Se l'AI genera meno di 4 distrattori validi, cosa succede?

**SVILUPPATORE:** La logica in `buildOptions` è un safety net per evitare che il quiz si rompa quando l'AI restituisce meno di 4 opzioni. Il flag `aiDistractorsFailed` sulla card segnala quando è successo questo. Hai ragione che "Nessuna delle precedenti" è una risposta inutile pedagogicamente. La soluzione corretta sarebbe: se i distrattori sono < 3, non mostrare la domanda in formato multiple choice ma passare a true/false o skipparla. Ma il `buildOptions` non ha accesso alla logica di routing della sessione — è un problema architetturale.

**STUDENTE:** Quindi se vedo "Nessuna delle precedenti" come opzione, so che qualcosa è andato storto nell'AI, ma non me lo dice esplicitamente. Potrei star studiando domande malate senza saperlo. Almeno mostrami un badge "Generato con fallback" sulla domanda.

**SVILUPPATORE:** Il flag `aiDistractorsFailed` esiste proprio per quello. È sulla `card`, viene passato a `QuizView`, ma non viene usato nella UI. Aggiungere un badge giallo "Distrattori non ottimali" quando `card.aiDistractorsFailed === true` è un fix piccolo con impatto visivo alto.

**STUDENTE:** Il PDF Reader — ho un mazzo con un PDF enorme, 400 pagine. Il lettore PDF funziona, i flash scard hanno il `sourceMetadata` con `pageNumber` e `originalText` per il "Jump to Source". Ma quando clicco "Jump to Source" non succede niente se il PDF non è già caricato a quella pagina. Non c'è nessun loading state, nessuna indicazione che stia saltando. Il sistema semplicemente non risponde visibilmente.

**SVILUPPATORE:** Il "Jump to Source" dipende da come `FluidPDFViewer` gestisce il cambio pagina. Se il viewer non ha ancora renderizzato quella pagina, il salto potrebbe non funzionare o funzionare con ritardo. È un problema di sincronizzazione tra il comando esterno e lo stato interno del viewer PDF. Non è banale da risolvere perché `pdfjs` carica le pagine in modo asincrono. Un feedback visuale minimo — uno spinner o un toast "Navigando alla pagina X" — è però fattibile subito.

**STUDENTE:** Il GenerateQuizModal ha un preset rigido: 10, 20, 30, 40 domande. Se ho un mazzo da 25 carte, posso fare quiz da 10 o 20 — non posso fare "tutte le 25". C'è la logica `needsDynamicAllOption` che aggiunge un pulsante "Tutte (25)" solo se il totale è tra 10 e 40 e non è già un preset. Ma questo pulsante appare solo in un edge case molto specifico. Se il mazzo ha esattamente 20 o 30 carte, il pulsante "Tutte" non compare nemmeno. L'utente vuole usare tutte le carte disponibili — non dovrebbe essere un edge case.

**SVILUPPATORE:** La logica è `!PRESET_COUNTS.includes(totalCards)`, quindi se hai esattamente 20 carte, il pulsante "Tutte" non appare perché 20 è già un preset. Hai ragione che è un comportamento unintuitive — se seleziono il preset 20 e ho esattamente 20 carte, sto già facendo "tutte", ma visivamente non è chiaro. La soluzione più pulita è aggiungere sempre un pulsante "Tutte (N)" e disabilitarlo solo quando coincide con un preset già presente.

**STUDENTE:** O più semplicemente: un input numerico libero con validazione `[MIN_QUIZ_CARDS, totalCards]` invece dei preset fissi. Così l'utente sceglie esattamente quante ne vuole.

**SVILUPPATORE:** L'input numerico è più flessibile ma rompe l'UX dei preset veloci. La soluzione ibrida — preset + input manuale — è la più completa ma anche la più costosa da fare bene con accessibilità. Per ora aggiungere "Tutte (N)" sempre è la fix minimale corretta.

**STUDENTE:** Il `handleShare` nel `DeckDetailPage` costruisce un URL tipo `${window.location.origin}/study/deck/${deck.id}` e lo copia negli appunti. Ma quella URL non corrisponde alla route reale. Guardando il router, la route del deck detail è `/study/deck/:id`, non `/study/deck/${id}`. In realtà coincidono — ma il punto è che quella pagina richiede autenticazione. Se condivido il link con qualcuno, arriverà a una pagina di login. Il link "condividi" è fuorviante: non stai condividendo il mazzo, stai condividendo un link che va al login altrui.

**SVILUPPATORE:** È corretto che l'app è completamente autenticata — non c'è nessuna vista pubblica. La funzione di share in quel contesto è più "copia link per me stesso" (per aprirlo su un altro dispositivo), non "condividi con altri". Questo dovrebbe essere comunicato meglio: il pulsante dovrebbe chiamarsi "Copia link" invece di "Condividi", e il toast dovrebbe dire "Link copiato" invece di "Condividi". Il design attuale crea aspettative false.

**STUDENTE:** Esatto. Oppure non mostri la voce del menu se non hai un sistema di condivisione pubblica. Una feature a metà è peggio di nessuna feature.

**SVILUPPATORE:** Su questo ho posizioni diverse. Il "copia link per me stesso" ha valore anche senza condivisione pubblica. Ma hai ragione sul labeling: "Condividi" implica condivisione con altri. Lo cambio in "Copia link".

**STUDENTE:** Nel `StudySessionPage` c'è ancora un `console.log` in produzione: `console.log('[StudySessionPage] Session loaded:', {...})` con dati sulla sessione, e `console.log('[StudySessionPage] Found saved exam progress')`. Questi log vanno rimossi o sostituiti con un logger condizionale.

**SVILUPPATORE:** Sì, quelli sono rimasti da quando facevo debugging del caricamento sessione. Li rimuovo. La policy dovrebbe essere: nessun `console.log` in produzione, al massimo `console.error` per errori imprevisti che vale la pena monitorare in produzione.

**STUDENTE:** La `SessionComplete` ha un sistema di tab — Panoramica, Domande da rivedere, Performance — molto ben fatto. Ma il tab "Domande da rivedere" mostra contenuto solo se `isExamMode || isQuizMode`. Se faccio una sessione in modalità typing e sbaglio delle carte, quelle non compaiono nel tab "Domande da rivedere". Perché?

**SVILUPPATORE:** In modalità typing le `wrongAnswers` vengono popolate nel `wrongAnswersForReview` state della `StudySessionPage`, ma la `SessionComplete` le mostra solo per quiz e exam. Era una scelta conservativa: in modalità flashcard e typing la logica di "risposta sbagliata" è diversa — l'utente valuta se stesso, non c'è una risposta oggettiva da mostrare come confronto. Ho pensato che mostrare il confronto fosse confuso.

**STUDENTE:** Ma in typing mode la risposta corretta esiste — è il `back` della card. Se sbaglio, voglio vedere cosa avrei dovuto scrivere. Quella sezione mostra già "La tua risposta" vs "Risposta corretta" — funziona perfettamente per il typing. Perché escluderlo?

**SVILUPPATORE:** Hai ragione. La condizione `isExamMode || isQuizMode` dovrebbe essere `isExamMode || isQuizMode || isTypingMode`. Le `wrongAnswers` in typing vengono già tracciate, il rendering è già pronto. È un'if da modificare.

**STUDENTE:** Un'altra cosa sul `SessionComplete`: il tab "Performance" ha questa frase: "Questo riepilogo potrà in futuro confrontare il tempo con i tuoi quiz precedenti." Questa frase è nel codice, hardcoded, da mesi. "In futuro" — ok, ma il futuro quando arriva? È un placeholder che non dovrebbe stare in produzione.

**SVILUPPATORE:** Anche questa è una frase che ho lasciato lì con l'intenzione di fare il confronto storico delle performance. La feature richiederebbe di salvare lato server ogni sessione con timestamp e metriche. Il backend ha un endpoint per `sessionComplete` ma non persiste statistiche storiche per utente. Rimuovere la frase è immediato. Fare la feature vera richiede lavoro backend serio.

**STUDENTE:** Toglila e basta, per ora. Una promessa non mantenuta è peggio del silenzio.

**SVILUPPATORE:** D'accordo. La tolgo.

**STUDENTE:** Il `StudyCard` ha un pulsante occhio — l'`EyeOff` / `Eye` — che dovrebbe mostrare un hint. Ma nell'implementazione attuale `showHint` cambia stato ma non viene usato da nessuna parte nel render del component. L'ho controllato riga per riga. Premi il bottone, cambia icona, ma il contenuto della card non cambia. La feature è incompleta.

**SVILUPPATORE:** Wow, questo non lo avevo notato. Hai ragione — `showHint` viene settato ma non viene letto per condizionare nessun contenuto. L'idea originale era mostrare una porzione ridotta del retro come suggerimento, ma non l'ho implementata. Il pulsante fa finta di fare qualcosa. Lo nascondo finché la feature non è implementata.

**STUDENTE:** O lo implementi davvero. Un hint potrebbe mostrare i primi 20 caratteri del retro, oscurati parzialmente. Sarebbe utile quando una carta è difficile e vuoi un piccolo aiuto prima di girarla.

**SVILUPPATORE:** L'idea mi piace. La feature ha senso pedagogicamente — è la versione digitale di "sbirciare un po'". L'implementazione è semplice: se `showHint`, mostra i primi N caratteri del `back` con un blur CSS. La metto nella lista media priorità.

**STUDENTE:** Il `DeckDetailContent` ha lo stato `viewMode` che alterna tra `'list'` e `'grid'`, e questa preferenza si perde ogni volta che riapro il mazzo. Se preferisco la griglia, devo risselezionarla ogni volta. Non sarebbe meglio salvarla in localStorage?

**SVILUPPATORE:** È un miglioramento di UX semplice. `localStorage.getItem('deckViewMode')` al mount e `localStorage.setItem` al cambio. L'unica attenzione è che la preferenza potrebbe essere globale (stesso viewMode per tutti i mazzi) o per-deck. Globale è più semplice e probabilmente va bene.

**STUDENTE:** Globale va benissimo. Non cambio modalità di visualizzazione in base al mazzo, è una preferenza personale.

**SVILUPPATORE:** Ok, lo metto nella lista.

**STUDENTE:** Ultima cosa importante: l'algoritmo SRS. Nel `Deck` type c'è il campo `algorithm` con valori `'sm2' | 'fsrs' | 'leitner' | 'anki'`. Nelle impostazioni del mazzo si può selezionare l'algoritmo. Ma nel `DeckSettings` component — che non ho letto completamente, ma ho visto nelle impostazioni — quando cambio algoritmo e riavvio una sessione, le carte già "mastered" con SM2 mantengono i loro parametri `easinessFactor` e `interval`. Se passo a FSRS che ha una formula diversa, quei valori sono incompatibili. C'è una migrazione dei dati quando cambi algoritmo?

**SVILUPPATORE:** No, non c'è migrazione. È un problema noto. Il backend usa l'algoritmo specificato nel deck per i calcoli futuri, ma i parametri storici (easinessFactor, interval) rimangono quelli precedenti e vengono usati come punto di partenza. Questo può causare comportamenti strani — carte con interval altissimo da SM2 che vengono riproposte in tempi assurdi con FSRS. La soluzione corretta richiederebbe un sistema di migrazione dei parametri al cambio di algoritmo, oppure un hard reset dei parametri quando cambi algoritmo. Per ora nel DeckSettings non avviso nemmeno l'utente di questo rischio.

**STUDENTE:** Almeno un warning. Tipo "Cambiare algoritmo non reimposta i parametri delle carte esistenti — potresti vedere comportamenti di ripasso anomali. Si consiglia di resettare il progresso." Con link al reset progresso.

**SVILUPPATORE:** Questo è ragionevole e fattibile subito. Un alert box nell'UI delle impostazioni quando l'utente cambia algoritmo. Non risolve il problema architetturale, ma informa l'utente.

**STUDENTE:** Okay. Ho finito la lista principale. Riassumiamo.

---

## Accordo Finale

### Alta Priorita - Fix Immediati (max 1-2 giorni)

| # | Problema | File | Fix |
|---|----------|------|-----|
| 1 | **Streak hardcoded a "12"** | `DeckDetailContent.tsx:321` | Sostituire con `"—"` e tooltip "In arrivo" finché il backend non espone il dato reale |
| 2 | **Attività recenti hardcoded** | `DeckDetailContent.tsx:582-596` | Rimuovere la sezione o basarla su `deck.updatedAt` / `deck.createdAt` (dati reali) |
| 3 | **Reset progresso non persiste** | `DeckDetailPage.tsx:222-249` | Sostituire la simulazione locale con chiamata reale all'endpoint backend; toast di successo solo dopo conferma server |
| 4 | **Fetch a localhost in produzione** | `QuizView.tsx:251-296` (region `agent log`) | Rimuovere l'intero blocco `useEffect` di instrumentazione che fa `fetch('http://127.0.0.1:7244/...')` |
| 5 | **console.log in produzione** | `StudySessionPage.tsx:237-244`, linee 203/211 | Rimuovere tutti i `console.log` di debug |
| 6 | **"Condividi" crea aspettative false** | `DeckDetailContent.tsx:344-349` | Rinominare il pulsante in "Copia link" e aggiornare il toast |
| 7 | **Pulsante hint (occhio) non funziona** | `StudyCard.tsx:181-188` | Nascondere il pulsante finché la feature hint non è implementata, oppure implementare il blur sui primi N caratteri del retro |

---

### Media Priorita - Sprint prossimo (1-2 settimane)

| # | Problema | File | Fix |
|---|----------|------|-----|
| 1 | **Nessuna UI per scegliere la modalità di studio** | `DeckDetailContent.tsx` (area pulsante Studia) | Aggiungere un selector di modalità (pill buttons: Flashcard, Quiz, Typing, Mix, Esame) prima dell'avvio della sessione |
| 2 | **TypingView: similarità non mostrata** | `TypingView.tsx:75-85` | Visualizzare `similarity` come percentuale quando la risposta è sbagliata ma vicina; valutare rating graduato (3 invece di 1) per similarity alta |
| 3 | **QuizView: badge `aiDistractorsFailed`** | `QuizView.tsx` | Mostrare badge giallo "Distrattori non ottimali" quando `card.aiDistractorsFailed === true` |
| 4 | **GenerateQuizModal: pulsante "Tutte"** | `GenerateQuizModal.tsx:52-66` | Aggiungere sempre il pulsante "Tutte (N)" indipendentemente dai preset, gestendo il caso in cui coincide con un preset |
| 5 | **SessionComplete: errori typing mode nascosti** | `SessionComplete.tsx:353` | Cambiare la condizione `isExamMode || isQuizMode` in `isExamMode || isQuizMode || isTypingMode` per mostrare le domande sbagliate anche in modalità typing |
| 6 | **ViewMode non persiste** | `DeckDetailContent.tsx:170` | Salvare e recuperare la preferenza `viewMode` in `localStorage` al mount e al cambio |
| 7 | **Placeholder "In futuro" in SessionComplete** | `SessionComplete.tsx:503` | Rimuovere la frase "Questo riepilogo potrà in futuro confrontare il tempo..." |
| 8 | **Feature hint (occhio) - implementazione** | `StudyCard.tsx` | Implementare la feature: mostrare i primi N caratteri del `back` con blur CSS quando `showHint === true` |

---

### Lungo Termine - Backlog Tecnico (1+ mesi)

| # | Problema | Note |
|---|----------|------|
| 1 | **Streak reale** | Richiede backend: endpoint per calcolo streak giornaliera basato su sessioni completate |
| 2 | **Activity feed reale** | Richiede backend: event log per-deck (sessioni, aggiunte carte, operazioni AI) |
| 3 | **Confronto performance storico** | Richiede backend: salvataggio statistiche sessione per utente con query aggregazione |
| 4 | **PDF Jump to Source con loading state** | Migliorare la sincronizzazione tra comando jump e stato asincrono del viewer pdfjs |
| 5 | **Migrazione parametri SRS al cambio algoritmo** | Architetturalmente complesso: richiede sistema di conversione parametri SM2→FSRS→Leitner |
| 6 | **Linter rule no-localhost-fetch** | Aggiungere regola ESLint per bloccare `fetch('http://127.0.0.1')` e `fetch('http://localhost')` in produzione |

---

### Fuori Scope / Non Fattibile a Breve

| # | Richiesta | Motivo |
|---|-----------|--------|
| 1 | **Input numerico libero per questionCount nel quiz** | L'UX con preset rapidi + "Tutte" copre il 95% dei casi d'uso; un input libero aggiunge complessità senza beneficio proporzionato. Rimane in backlog come nice-to-have |
| 2 | **Condivisione pubblica mazzi** | Richiederebbe auth guest, viste pubbliche, sistema permessi — fuori scope architetturale per ora |
| 3 | **Rating SRS graduale in TypingView (1-5 basato su similarity)** | La calibrazione delle soglie richiede testing esteso per non degradare la qualità del SRS; implementazione prudente rimandata |
| 4 | **Migrazione automatica SRS al cambio algoritmo** | Complessità architetturale alta, rischio regressione dati utente — si risolve a breve con warning + reset manuale |

---

### Fix Immediati Concordati (da committare questa settimana)

1. Rimuovere il blocco `// #region agent log` da `QuizView.tsx` — **nessuna dipendenza, massima priorità**
2. Streak: `value="12"` → `value="—"` con tooltip
3. Attività recenti: rimuovere le voci hardcoded
4. Rimuovere i `console.log` di debug da `StudySessionPage`
5. Rinominare "Condividi" → "Copia link"
6. Nascondere il pulsante hint nel `StudyCard` (o implementarlo)
7. Aggiungere warning nel `DeckSettings` al cambio algoritmo SRS
8. Placeholder "In futuro" → rimosso da `SessionComplete`

> Firma virtuale delle parti: entrambe le parti riconoscono che la qualità del prodotto si misura sui dettagli. I dati falsi sono peggio dei dati mancanti. Le feature a metà sono peggio di nessuna feature.
