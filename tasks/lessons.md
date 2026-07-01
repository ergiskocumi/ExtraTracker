# Lezioni apprese (ExtraTracker)

**Uso**: Leggere all'inizio di ogni sessione rilevante. Dopo ogni correzione dell'utente o fix importante, aggiungere/aggiornare una voce qui. Obiettivo: ridurre errori ripetuti e standardizzare il modo di lavorare.

---

## Come usare questo file

1. **Prima di iniziare un task**: scorrere le sezioni sotto e applicare le regole pertinenti.
2. **Dopo una correzione utente**: aggiungere una voce in "Pattern che evitano errori" o "Cosa abbiamo imparato".
3. **Dopo un refactor/feature**: documentare in "Come abbiamo fatto X" se il pattern è riutilizzabile.
4. Mantenere voci **concrete** (file, classi, nomi) e **azioni** (cosa fare / non fare).

---

## Pattern che evitano errori

### Accessibilità e tema (light/dark)

- **Testo bianco su pulsanti colorati in light theme**: in questo progetto la regola globale `[data-theme="light"] [class*="text-white"]` forza il testo scuro. Per mantenere il testo bianco sui bottoni (es. Exam Solver, Studia) usare la classe **`keep-light-text`** sull’elemento che ha `text-white`. File rilevante: `index.css` (regola con `:not([class*="keep-light-text"])`).
- **Contrasto badge/icone**: evitare `text-violet-200` / `text-amber-200` su sfondi chiari. Preferire toni più scuri (es. `text-violet-700`, `text-amber-700`) e, se serve, sfondo un po’ più coprente (es. `bg-*-500/25`).
- **Landmark**: un solo `<main>` per pagina. Se il layout (es. `AuthLayout`) espone già `<main id="main-content">`, le pagine figlie non devono usare un altro `<main>`.

### Componenti React

- **Nuove props usate nel componente**: se si usa una prop (es. `compactMode`) nel corpo del componente, va **sempre** inclusa nella destructuring delle props, altrimenti `ReferenceError` a runtime.
- **Stato usato nel JSX**: ogni variabile usata nel render (es. `isModalOpen`) deve essere dichiarata (useState o simile); altrimenti la UI non aggiorna o errore.
- **Import di componenti usati nel JSX**: se nel JSX c’è `<FullscreenEditModal />`, l’import da `./CardEditor` (o percorso corretto) deve esistere; altrimenti build/run fallisce.

### Stili e design system

- **Separazione visiva tra card**: usare `border-theme-default`, `bg-theme-card`, `shadow-theme-sm` dalle costanti (es. `CARD_STYLES.default`) e applicare l’ombra di default nel componente (non solo in hover). Aumentare `gap` nel contenitore (es. `gap-4` / `gap-5`) per dare respiro tra le card.
- **Colori tema**: preferire classi tema (`text-theme-primary`, `bg-theme-card`, `border-theme-default`) invece di `text-white/70` o `bg-white/10` per contrasto corretto in light e dark.

### Tooltip e portali

- **Gerarchia z-index (riferimento)**: modali/overlay usano 99999 (`FullscreenEditModal`), 99998/99999 (DeckCardMenu), 50–101 (altri modali). I **tooltip** in portal devono stare sopra: in `CardEditor/Tooltip.tsx` è definito **`TOOLTIP_Z_INDEX = 100000`**. Nuovi overlay/modali non devono superare 99999 se vogliamo che i tooltip restino sempre visibili.
- **Tooltip sopra modali**: i tooltip renderizzati in portal su `document.body` devono avere **z-index maggiore** del wrapper del modale. Applicare `TOOLTIP_Z_INDEX` con **inline style** (`style={{ zIndex: TOOLTIP_Z_INDEX, ... }}`), altrimenti la classe Tailwind da sola può non vincere su un altro stacking context (es. `isolation: 'isolate'` sul modale).
- **Tooltip in portal**: per non essere tagliati da `overflow-hidden` dei genitori (es. modale), i tooltip vanno renderizzati con `createPortal(tooltipElement, document.body)`. Il posizionamento va fatto con `position: fixed` e coordinate da `triggerRef.current.getBoundingClientRect()`; usare variabili CSS in inline style (`var(--bg-elevated)`, `var(--text-primary)`) perché il nodo è fuori dal DOM del tema e le classi Tailwind potrebbero non ereditare il tema correttamente.

### JSX e sintassi

- **`{cond && ( ... )}`**: dentro le parentesi deve esserci **un solo** elemento/espressione. Non si possono avere due fratelli (es. un commento JSX `{/* ... */}` e un `<div>`): causa "Unexpected token, expected `,`". Soluzione: mettere il commento **dentro** il primo elemento (es. come primo child del `<div>`) o rimuoverlo.

### Git e verifiche

- **Prima di commit**: eseguire `npm run build` (in `extra-tracker`) e correggere eventuali errori TypeScript/lint nei file toccati. Non dare per completo un task senza build verde (o spiegazione esplicita di errori preesistenti).
- **Commit in italiano**: per richieste esplicite, messaggi di commit dettagliati in italiano (titolo + corpo con elenco modifiche).

---

## Cosa abbiamo imparato (sessioni recenti)

1. **Design Review (32 issue)**  
   Fix applicati: landmark (un solo `main` in AuthLayout, pagine auth senza doppio main), contrasto Register (barra strength con `bg-theme-surface`), Toast `role="status"`, password toggle con `aria-label` italiano e `focus-visible`, `aria-describedby` sugli input, classi tema per ExamGrid/ExamGridCard, gradienti login in CSS, ThemeToggle con variabili CSS, Logo su Register.  
   **Lezione**: per liste lunghe di issue, lavorare per fasi (Critical → High → Medium) e raggruppare modifiche per file.

2. **Modale fullscreen per modifica card**  
   Il refactor che aveva rimosso la modale (solo editing inline) è stato ripristinato: in `FlashcardItem` di nuovo `compactMode`, `isModalOpen`, `handleModalSave`, `FullscreenEditModal`; click su card (se non compactMode) apre la modale; pulsante Modifica idem.  
   **Lezione**: prima di rimuovere una feature “vecchia”, verificare se è ancora il comportamento desiderato; la cronologia Git (`git show <commit>^:path`) aiuta a recuperare la versione precedente.

3. **Badge Q/A poco visibili**  
   In `FlashcardItem.constants.ts` (BADGE_STYLES) i colori testo erano troppo chiari su sfondo chiaro. Fix: testo più scuro (`text-violet-700`, `text-amber-700`), font `text-xs font-bold`, sfondo/bordo leggermente più marcati, `shadow-sm`.  
   **Lezione**: contrasto sufficiente su sfondo chiaro richiede testo scuro (o sfondo molto scuro con testo chiaro).

4. **Pulsanti Exam Solver e Studia con testo scuro in light theme**  
   La regola globale in light theme sovrascrive `text-white`. Aggiunta classe `keep-light-text` ai due pulsanti in `DeckDetailHeader.tsx` per escluderli e mantenere testo bianco.  
   **Lezione**: in progetti con override per tema, cercare in CSS (es. `[data-theme="light"]`) e usare le classi di eccezione già previste (`keep-light-text`).

5. **Build fallita (SortableItem, AppLayout)**  
   Errori preesistenti: `compactMode` mancante in `SortableItemProps`, `variant="with-version"` non valido per `Logo`. Fix: aggiungere `compactMode` a interfaccia e pass-through a `FlashcardItem`; usare `variant="full"` per `Logo`.  
   **Lezione**: prima di considerare “fatto” un refactor che tocca più file, verificare che la build passi; fixare subito gli errori nei file modificati.

6. **Modale Impostazioni mazzo (stile + contenuto)**  
   Miglioramenti: (1) Modale in `DeckDetailPage`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="deck-settings-title"`, pulsante chiudi con `aria-label="Chiudi impostazioni"`, icona ingranaggio in header con sfondo primary, overlay con `bg-theme-overlay` (aggiunta utility in `index.css`), transizione `type: 'tween'`. (2) `DeckSettings`: tutti i colori fissi (`text-white`, `border-white/10`, `bg-white/5`) sostituiti con classi tema (`text-theme-primary`, `text-theme-secondary`, `border-theme-default`, `bg-theme-card`, `bg-theme-surface`); select/input con `bg-theme-surface border-theme-default text-theme-primary`; box info con `text-primary-700 dark:text-primary-300`; pulsanti primary con `keep-light-text`; spinner con `border-theme-default border-t-primary-500`.  
   **Lezione**: i form/modali che usano solo `white`/`white/10` vanno male in light theme; refactor sistematico a `theme-*` + `primary-700 dark:primary-300` per testi su sfondo primary.

7. **Vista lista unica (rimozione toggle griglia/lista)**  
   In `DeckCardFilters.tsx`: rimosso il blocco "View Mode Toggle" (due pulsanti griglia/lista), rimosse props `viewMode` e `onViewModeChange`, rimosso tipo esportato `ViewMode`, rimossi import `LayoutGrid` e `List` (lucide-react). In `DeckDetailContent.tsx`: rimosso stato `viewMode` e import `ViewMode`; l’area carte usa sempre `flex flex-col gap-4` (nessun branch `viewMode === 'grid'`); rimosso `className={viewMode === 'grid' ? 'self-start' : ''}` dal wrapper di ogni card. Test: `DeckCardFilters.test.tsx` (buildProps senza viewMode/onViewModeChange, test "changes sort option" al posto del toggle), `DeckCardFilters.theme.test.tsx` (rimosse viewMode/onViewModeChange e click "vista lista"), `DeckDetailContent.test.tsx` (mock DeckCardFilters senza onViewModeChange e pulsanti view-grid/view-list, rimosse righe che cliccavano su di essi).  
   **Lezione**: per rimuovere una feature da un componente condiviso, aggiornare interfaccia, implementazione e tutti i test che mockano o usano quelle props.

8. **FullscreenEditModal: scroll orizzontale e pulsante Salva**  
   I due contenitori degli editor (Domanda/Risposta) avevano `overflow-auto` e mostravano barre orizzontali. Sostituiti con `flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pb-4`: `min-w-0` permette al flex child di restringersi e non forzare overflow, `overflow-x-hidden` nasconde lo scroll orizzontale. Pulsante "Salva Modifiche" (gradiente viola/indaco): aggiunta classe `keep-light-text` perché in light theme la regola globale sovrascrive `text-white`.  
   **Lezione**: in layout flex/grid, i figli che scrollano vanno con `min-w-0` + `overflow-y-auto overflow-x-hidden` se non si vuole scroll orizzontale; pulsanti primary in modale vanno con `keep-light-text` se il testo deve restare bianco.

9. **Shortcut pills e footer modale**  
   Gli shortcut "Ctrl+Enter salva" e "Esc chiudi" spostati dall’header al footer in basso a sinistra come due pill non cliccabili: `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-[11px] font-medium text-violet-700 dark:text-violet-300 cursor-default select-none`; `<kbd>` con `bg-violet-500/20`. Footer: `flex justify-between`, a sinistra le pill (`hidden sm:flex`), a destra i pulsanti in un `div` con `ml-auto`.  
   **Lezione**: le pill di hint vanno in footer con tema primary/violet e testo leggibile in entrambi i temi (`*-700` / `dark:*-300`).

10. **Header modale: Chiudi sempre rosso, titolo più grande, Tooltip tema**  
    Pulsante Chiudi: da solo hover rosso a sempre rosso: `bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400`, hover `hover:bg-red-500/15 hover:border-red-500/30`. Titolo "Modifica Flashcard": da `text-sm` a `text-base`. Componente `Tooltip` (CardEditor): da stile fisso scuro a tema (`bg-theme-elevated`, `text-theme-primary`, `border-theme-default`); freccia con `var(--bg-elevated)` per colore in linea con il tema.  
    **Lezione**: pulsanti di chiusura/azione distruttiva possono avere sfondo e bordo sempre visibili; i tooltip condivisi vanno a tema per coerenza light/dark.

11. **Tooltip: portal, z-index, visibilità sopra il modale**  
    I tooltip (Chiudi, voci toolbar WYSIWYG) venivano tagliati da `overflow-hidden` del modale e poi apparivano dietro perché lo z-index era inferiore. Refactor in `CardEditor/Tooltip.tsx`: (1) **Portal**: contenuto renderizzato con `createPortal(tooltipElement, document.body)` così non è discendente del modale e non viene clippato. (2) **Posizionamento**: stato `position: { left, top } | null`; in `useLayoutEffect` (quando `visible` e `triggerRef.current`) si calcola `left = tr.left + tr.width/2`, `top = tr.top - TOOLTIP_HEIGHT_ESTIMATE - 8` (o sotto se `side === 'bottom'`); il portal si renderizza solo quando `position !== null` per evitare flash a (0,0). (3) **Stile**: `position: fixed`, colori con inline style `var(--bg-elevated)`, `var(--text-primary)`, `var(--border-default)` perché il nodo è in `body` e le classi tema potrebbero non applicarsi. (4) **Z-index**: costante `TOOLTIP_Z_INDEX = 100000`; applicata con **inline style** `style={{ zIndex: TOOLTIP_Z_INDEX, ... }}` perché `FullscreenEditModal` usa `zIndex: 99999` e `isolation: 'isolate'`; una classe Tailwind `z-[100000]` può non vincere su un altro stacking context. Con 100000 i tooltip restano sempre sopra il modale.  
    **Lezione**: tooltip che devono apparire sopra modali/overlay vanno in portal su body, con z-index esplicito (inline) superiore a tutti i modali; posizione da `getBoundingClientRect()` del trigger; colori con variabili CSS in inline style se il portal è fuori dal wrapper del tema.

12. **Errore sintassi FullscreenEditModal**  
    Dopo `{isOpen && (` era stato aggiunto un commento JSX `{/* ... */}` e subito dopo il `<div>` del modale. In JSX l’espressione dopo `&&` deve essere un **unico** elemento: due fratelli (commento + div) causano "Unexpected token, expected `,`" (142:20). Fix: rimuovere il commento (la documentazione z-index resta in `Tooltip.tsx`).  
    **Lezione**: dentro `{cond && ( ... )}` non mettere mai due nodi affiancati; mettere il commento come primo child dell’elemento o altrove.

---

## Come abbiamo fatto X (pattern riutilizzabili)

- **Ripristinare comportamento rimosso da un commit**: `git show <commit>^:path/to/file` per vedere il file prima del commit; confrontare con la versione attuale e reintrodurre solo le parti necessarie (stato, handler, JSX).
- **Testo bianco su bottoni in light theme**: aggiungere la classe `keep-light-text` al `<button>` (o al wrapper) che ha `text-white`, così la regola light theme non lo sovrascrive.
- **Migliorare contrasto senza rompere il tema**: usare le variabili/classi tema (`theme-primary`, `theme-card`, `theme-default`, `shadow-theme-sm`) invece di colori fissi o opacity generiche (`white/10`, `violet-200`).
- **Aumentare separazione tra card**: (1) costanti: `border-theme-default`, `bg-theme-card`, `shadow-theme-sm`; (2) componente: applicare anche l’ombra di default (non solo in hover); (3) contenitore: aumentare `gap` e, se utile, padding dell’area.
- **Modale con stile e ARIA**: overlay con `bg-theme-overlay` (definire `.bg-theme-overlay { background: var(--bg-overlay); }` se manca); pannello con `role="dialog"` sull’overlay, `aria-modal="true"`, `aria-labelledby` sul titolo; pulsante chiudi `type="button"` e `aria-label="Chiudi …"`; header con icona in box arrotondato (`bg-primary-500/15`, `text-primary-600 dark:text-primary-400`).
- **Tooltip sempre sopra modali**: (1) render in portal: `createPortal(<div role="tooltip" style={{ position: 'fixed', zIndex: 100000, left, top, transform: 'translate(-50%,0)', ... }}>, document.body)`. (2) z-index via inline style (es. `100000`), superiore al wrapper del modale (es. `99999`). (3) Posizione da `triggerRef.current.getBoundingClientRect()` in `useLayoutEffect`; altezza tooltip stimata (es. 32px) se non si misura il nodo. (4) Colori con `var(--bg-elevated)`, `var(--text-primary)` in inline style se il portal è fuori dal DOM del tema. (5) Mostrare il portal solo quando `position !== null` per evitare flash a (0,0).
- **Niente scroll orizzontale in pannelli flex**: contenitore `flex-1 min-w-0 overflow-y-auto overflow-x-hidden`; `min-w-0` evita che il flex child forzi larghezza e generi overflow orizzontale.
- **JSX: un solo elemento dopo `&&`**: dopo `{cond && (` deve seguire un unico elemento (es. un `<div>`). Non scrivere `{/* comment */} <div>...</div>`; mettere il commento dentro il div come primo child.
- **Generazione quiz che FALLISCE sempre (0 domande) = JSON troncato, NON prompt/modello sbagliato**: i modelli DeepSeek via proxy (`deepseek-v4-pro`/`flash`) si comportano come reasoning model: spendono i token di output in ragionamento interno e restituiscono JSON tagliato a metà (`finish_reason: length`, `outputTokens` = tetto `max_tokens`). Sintomo nei log: `_parseJSONResponse: Fallito parsing JSON` con preview che finisce a metà parola, poi `nessuna domanda generata` × retry × circuit breaker. Root cause: il parser (`helpers.js`) usa regex `\{[\s\S]*\}` che richiede la graffa di chiusura → JSON troncato = 0 recuperi. FIX: (1) parser tollerante `quizJsonParser.js` (`parseQuizArrayResponse`) che cammina char-by-char e recupera gli oggetti `{...}` bilanciati/completi dall'array parziale; (2) alzare `max_tokens` (costante `QUIZ_MAX_OUTPUT_TOKENS`, default 8192); (3) NON ritentare su troncamento (stesso prompt = stesso taglio, spreca 3×~50s) — il recupero parziale basta; (4) circuit breaker: valutare DOPO aver raccolto tutti i result del batch e solo se `!hasAnyQuestions`, altrimenti un fallimento processato per primo scarta i task riusciti dello stesso batch. Diagnosi: loggare SEMPRE (info, non debug) `finishReason`+`outputTokens`+`maxTokens`+`model`+`contentLength` per ogni chiamata AI.
- **Lentezza generazione quiz = modello + strategia di chiamata, NON orchestrazione**: per quiz ≤12 domande scatta il *fast path* (`quizTextSelection.js`) = 1 sola chiamata AI. Sleep/retry/batch-delay in `QuizGenerationService.js` e nei generator riguardano solo quiz >12 domande. Il tempo è dominato dai **token in output per chiamata**. Leve efficaci: (1) usare `deepseek-v4-flash` (costante `QUIZ_GENERATION_MODEL` in `constants.js`, non più `DISTRACTOR_AI_MODEL`=pro) per generazione MCQ+V/F; (2) **parallelizzare il fast path** in N task piccoli (`computeFastPathTaskCount`/`buildFastPathTaskTexts`, `QUIZ_FAST_PATH_TASK_SIZE`=5) invece di 1 chiamata monolitica — la latenza cala perché ogni chiamata produce meno token; (3) alzare `QUIZ_CHUNK_CONCURRENCY` (default ora 4) così i task girano davvero in parallelo nello stesso batch; (4) con task paralleli serve **dedup finale** delle domande in `processJob` (`dedupeQuestions`) perché i task non si vedono tra loro. L'infra async (job + SSE + polling fallback) è solida: NON riscriverla, intervenire chirurgicamente. Nei test che mockano `processChunkFn`, generare `questionText` unici per chunk (usare `chunkTelemetry.chunkIndex`) altrimenti il dedup li collassa.
- **Refactor tema/leggibilità su larga scala (~80 file, ~350 occorrenze hardcoded)**: il pattern efficace è (1) sistemare PRIMA le variabili CSS base (`--bg-card`/`--bg-surface`/`--text-muted`/`--border-*` in `[data-theme="light"]`, `src/index.css`) e la scala z-index (`tailwind.config.js` → `theme.extend.zIndex`, valori semantici tipo `modal-backdrop:60, modal:70, popover:80, toast:90, tooltip:100, max:9999`) — sono le fondamenta da cui dipende tutto il resto; (2) SOLO DOPO sostituire i colori hardcoded per batch (condivisi → feature per feature), mai con sed/regex cieco ma leggendo ogni riga nel suo contesto JSX reale. Regola di classificazione: `text-white`/`bg-white` accanto a uno sfondo saturo esplicito nello stesso elemento (`bg-red-500 text-white`, gradient primary) è whitelist e resta invariato; senza sfondo saturo (testo/card generici) va sostituito con `text-theme-*`/`bg-theme-*`. **Non tutto ciò che è "grigio Tailwind hardcoded" è un bug**: se ha già il ramo `dark:` corrispondente ed è leggibile in entrambi i temi (es. `text-gray-700 dark:text-gray-200`), è solo uno stile diverso dal brand, non va toccato in un refactor di leggibilità — altrimenti il lavoro esplode senza necessità. I bug REALI da cercare attivamente: colori fissi (`rgba(255,255,255,...)`/`text-white` senza `dark:`) dentro pannelli con sfondo trasparente/glassmorphism (es. `Flashcard.tsx`, `ToastItem.tsx`) — questi restano illeggibili in light perché il colore non cambia mai; sfondi scenici hardcoded (`radial-gradient` nero fisso in `FluidPDFViewer.tsx`) che restano scuri anche in light; badge/testo semantico con contrasto insufficiente calcolabile (es. `text-red-500` su bianco = 3.76:1, sotto WCAG AA — verificare con `(L1+0.05)/(L2+0.05)` sulla luminanza relativa, non a occhio). Deleghi paralleli a sub-agenti con le stesse regole di classificazione scritte esplicitamente funzionano bene su batch larghi (6-25 file), ma vanno sempre riverificati a campione dall'orchestratore leggendo i file col contesto completo, perché gli agenti a volte segnalano correttamente casi ambigui (es. modal con sfondo scuro fisso by-design, "sempre dark" e coerente al suo interno) invece di indovinare — questi vanno decisi manualmente, non delegati di nuovo.
- **Eliminare una feature = grep sul percorso file NON basta, serve grep sui nomi esportati**: rimuovendo `src/features/feedback/` e la cartella `settings/components/feedback/` (creduta codice morto perché nessun file importava `SettingsFeedback.tsx` per nome), la build è fallita: 3 componenti Settings core (`PrivacySettings.tsx`, `NotificationsSettings.tsx`, `DeleteAccountSection.tsx`) importavano `{ SettingsError, SettingsSuccess } from './feedback'` — nomi ESPORTATI dal file, non il nome del file stesso. L'esplorazione iniziale aveva cercato `grep "SettingsFeedback"` e trovato zero risultati, dando un falso "è orfano". Lezione: prima di eliminare un file/cartella, fare grep sia sul path di import (`from '.../nome-cartella'`) sia sui nomi realmente esportati (leggere gli `export` nel file bersaglio e cercare quelli, non solo il filename) — un barrel file (`index.ts`) o un import per named export nasconde il collegamento a un grep naive. Se la build fallisce dopo una rimozione e il file era sotto git, `git checkout HEAD -- <path>` è il modo più veloce per ripristinarlo intatto invece di riscriverlo. Anche i backend controller vanno grepp­ati per `require('../models/NomeModel')` prima di eliminare un model — `settingsController.js` (flusso elimina-account) faceva `Feedback.deleteMany(...)` in una transazione insieme ad altri model, invisibile finché non si prova ad avviare il processo.
- **Rimuovere una feature con Context globale (es. SettingsContext) ≠ eliminare la cartella intera**: `SettingsContext.tsx` non era solo "il backend della pagina Settings" — è il provider globale che carica tema/profilo al login e li rende disponibili a `ThemeToggle.tsx`, `UserMenuDropdown.tsx`, `DashboardPage.tsx`, `useFormat.ts` (usato in tutta l'app per formato data/ora). Eliminare l'intera cartella `features/settings/` avrebbe rotto il cambio tema e il nome utente ovunque. Pattern corretto: (1) grep di TUTTI i consumer di `useSettings()`/`useFormat()` fuori dalla cartella feature PRIMA di decidere cosa eliminare; (2) tenere il Context ma ridurne l'interfaccia alle sole funzioni ancora consumate (qui: `loadSettings`+`updatePreferences`, non `updateProfile`/`deleteAccount`/`exportData`/ecc.); (3) ridurre di conseguenza anche il service (`settingsService.ts`) e il backend (`settingsController.js`/routes/validators) alle sole 2 funzioni sopravvissute, non eliminarli — altrimenti l'endpoint che il Context chiama sparisce e la UI residua si rompe al primo login. Prima di eliminare interi flussi sensibili (cambio password, cancellazione account GDPR) senza sostituto, chiedere esplicita conferma all'utente — non è una decisione tecnica silenziosa. **ATTENZIONE CRITICA**: `git checkout HEAD -- <path>` su un file di memoria/lezioni condiviso (es. `tasks/lessons.md`) può cancellare silenziosamente edit non ancora committati fatti IN QUESTA STESSA sessione (le voci di lezioni aggiunte prima nella conversazione) — prima di usare `git checkout` per "ripristinare" un file, verificare con `git diff` se le modifiche uncommitted sono proprie del turno corrente (da preservare) o accidentali di un'altra sessione (da scartare); in caso di dubbio, salvare a parte il contenuto attuale prima del checkout.

---

## Checklist pre-implementazione (da rispettare quando applicabile)

- [ ] Ho letto le sezioni rilevanti di questo `lessons.md`?
- [ ] Per task non banali (3+ step / architettura): ho un piano (es. in `tasks/todo.md`) e l’ho verificato prima di codare?
- [ ] Sto usando le convenzioni del progetto (tema, landmark, ARIA, file structure)?
- [ ] Dopo le modifiche: build OK, nessun nuovo lint/errore nei file toccati?
- [ ] Se l’utente ha corretto qualcosa: ho aggiunto/aggiornato una voce in questo file?

---

*Ultimo aggiornamento: 2026-02-17. Sessioni coperte: Modale Impostazioni mazzo; vista lista unica (DeckCardFilters/DeckDetailContent); FullscreenEditModal (scroll orizzontale, Salva keep-light-text, shortcut pills, Chiudi sempre rosso, titolo text-base); Tooltip (portal, z-index 100000, posizionamento fixed, tema var(--*)); fix sintassi JSX (commento dopo &&).*
