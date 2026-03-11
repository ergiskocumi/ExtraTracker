# ExtraTracker — Design Review: Il Collaudo (Parte 3)
> 3 studenti, 1 sviluppatore, gli stessi problemi — alcuni risolti, altri appena scoperti

---

## Il Contesto

È giovedì sera, dieci giorni dopo la parte 2. Ergis ha implementato tutti e 18 i fix concordati nella sessione precedente. Ha mandato il link al branch di staging nel gruppo: *"Branch aggiornato. Ho risolto tutto. TUTTO. Testate."*

Marco era scettico già dal maiuscolo. Giulia ha aperto l'app durante la pausa pranzo del tirocinio, con il telefono in mano, in piedi, in corridoio. Luca ha aspettato la sera, ha aperto Chrome DevTools e ha ispezionato il DOM prima ancora di cliccare qualcosa.

Ergis si aspettava validazione. Ne riceve il 40%.

---

## La Conversazione

**Ergis:** Allora, ho pushato tutto. Studio mode selector prima della sessione — fatto. Exit confirmation — fatto. Feedback quiz prominente — fatto. PDF banner in sidebar — fatto. Cinema mode con le frecce di navigazione — fatto. Visual viewport per la tastiera mobile — fatto. Sono abbastanza soddisfatto di questo sprint.

**Luca:** Il selector per la modalità di studio funziona. L'ho trovato subito, è dove deve essere. Il dropdown con Flashcard, Typing e Mix prima di premere Studia è esattamente quello che avevamo concordato.

**Marco:** Concordo. Quello è uno dei pochi fix dove ho pensato "finalmente" senza riserve. Apro il mazzo, scelgo Typing, premo Studia. Zero click extra. Perfetto.

**Giulia:** Anche io lo uso, e funziona. Ma ho una domanda: cosa fa esattamente "Mix"? Ho provato ieri sera con il mazzo di Farmacologia — 80 carte — e non capisco la logica di alternanza. Alcune sessioni mi dà 5 flashcard di fila, poi 3 typing, poi di nuovo flashcard. Non è casuale? Non è fisso? Non c'è un pattern.

**Ergis:** Mix alterna in modo adattivo basandosi su—

**Giulia:** Aspetta. Non mi interessa la spiegazione tecnica. Mi interessa sapere *cosa aspettarmi*. Se non c'è un pattern visibile, l'utente non capisce perché gli arriva una modalità invece di un'altra. Hai documentazione in-app? Un tooltip? Qualcosa?

**Ergis:** No, è trasparente per design. Ho pensato che—

**Giulia:** Ergis. *Trasparente per design* non vuol dire niente se l'utente pensa che l'app si sia rotta. Ieri l'ho mostrato a una mia collega. Ha fatto il Mix e mi ha detto "ma perché cambia? Ho sbagliato qualcosa?" Non è trasparente. È opaco.

**Luca:** È un principio di Nielsen numero uno: visibilità dello stato del sistema. L'utente deve sempre sapere cosa sta succedendo. Se Mix ha una logica, mostrala. Anche solo un badge piccolo nell'header della sessione: "Flashcard" o "Typing" che indica la modalità corrente di quella carta.

**Ergis:** Okay. Ha senso. Aggiungibile.

**Marco:** Passiamo al tasto Esci dalla sessione. Ho trovato qualcosa. Se sono alla prima carta — zero carte completate — e premo Esci, il dialog di conferma compare comunque. Ma non ho ancora fatto niente. Non ha senso chiedermi conferma se non ho studiato niente.

**Ergis:** Il codice controlla se `currentCardIndex > 0`. Se è zero, il dialog non dovrebbe comparire.

**Marco:** Allora c'è un bug perché compare. Ho screenrecordato. Te lo mando dopo.

**Ergis:** *pausa* Aspetta. Ho guardato il codice. Hai ragione. Il controllo è `currentCardIndex > 0 && !showExitConfirm` ma non esclude il caso `currentCardIndex === 0` — passa direttamente al `navigate`. Aspetta, no, invece per le sessioni di tipo exam fa saltare il dialog sempre. Forse c'è un edge case con la prima carta in modalità Typing?

**Luca:** Non importa dove è il bug. Il punto è che Marco l'ha trovato in dieci minuti di utilizzo reale. I test automatici non l'hanno trovato. Se avessi integration test che simulano il flusso completo — apri mazzo, seleziona modalità, avvia sessione, prima carta, premi Esci — questo sarebbe saltato fuori.

**Ergis:** I test esistono, ma non coprono questo flusso specifico.

**Luca:** Esatto. E non coprono perché li hai scritti *dopo* aver scritto il codice, pensando al caso felice. Test-first su questa feature avrebbe impedito il bug.

**Ergis:** Okay, okay. Lo fixo stasera. Luca, il tuo punto sui test è valido.

**Giulia:** Typing mode — la similarità. Ho il badge che mostra la percentuale quando sbaglio. "Somiglianza: 78%". Buono, lo capisco. Ma quando rispondo correttamente, il badge non compare. Io voglio sapere anche quanto ero vicina quando ho risposto giusto. Se ho risposto con "ipertensione arteriosa" e la risposta era "ipertensione arteriosa sistemica", so che ho risposto correttamente ma voglio vedere che la somiglianza era 91% — mi dà più fiducia.

**Ergis:** Quando è corretto non mostro la percentuale perché pensavo non servisse.

**Giulia:** Pensavi sbagliato. In Medicina studiamo per capire la precisione terminologica. "Giusto" non basta. Voglio sapere se ero molto precisa o appena sopra la soglia. Quella informazione cambia come studio la prossima volta.

**Marco:** Guarda, io la vedo diversamente — per Economia non me ne frega niente della percentuale quando ho risposto giusto. Ma capisco il punto di Giulia. Potresti mostrare la percentuale anche quando corretto, ma con stile diverso, meno prominente?

**Giulia:** Esatto. Verde, piccolo, discreto. Non devo essere lo stesso badge di quando sbaglio. Ma deve essere là.

**Ergis:** Cambiamento piccolo. Lo faccio.

**Luca:** Il feedback del quiz — le barre colorate con icona corretto/sbagliato — sono un miglioramento enorme rispetto a prima. Prima erano due parole in corsivo che quasi non si vedevano. Adesso c'è una barra verde con spunta o rossa con croce, animazione spring. È corretto visivamente, è accessibile, funziona in dark mode. Questo l'hai fatto bene.

**Ergis:** Grazie. Ci ho messo più tempo del previsto ma ne valeva la pena.

**Luca:** Però ho una riserva. Il distractor fallback — quando l'AI non riesce a generare i distrattori e usa opzioni generiche — mostra un badge "opzioni semplificate". Bene. Ma il badge è posizionato sopra le opzioni ed è molto piccolo. Sul mio laptop a 13 pollici è a malapena leggibile. Sul telefono sparisce.

**Ergis:** Il badge ha `text-xs` e `px-2 py-0.5`. Sul mobile dovrebbe scalare.

**Luca:** Non scala. `text-xs` è 12px fisso. Sull'iPhone 13 di Giulia è 3mm di altezza. Non è testo leggibile, è decorazione.

**Giulia:** Confermo. L'ho visto due volte e non capivo cosa dicesse.

**Ergis:** `text-xs` su mobile dovrebbe essere `text-sm` almeno. Sistemabile.

**Marco:** Il PDF. Finalmente — *finalmente* — l'ho trovato. Il banner "Apri PDF" nella sidebar del mazzo è esattamente dove mi aspettavo di trovarlo. È blu, è grande, è scritto chiaro. Prima non sapevo esistesse questa feature.

**Ergis:** Questo è uno dei fix di cui sono più soddisfatto.

**Marco:** Però. Quando clicco "Apri PDF" su iPhone — schermo piccolo, in piedi, una mano libera — apre la cinema view che è bella su desktop ma sul telefono è un disastro. Ho il PDF che occupa metà schermo e le card che occupano l'altra metà, ma le card sono larghe 4 centimetri. Non riesco a leggere niente.

**Ergis:** La cinema view non è progettata per mobile. È un layout split orizzontale che richiede uno schermo largo almeno—

**Marco:** Allora non aprirla su mobile. Se rilevi che lo schermo è sotto 640 pixel, apri il PDF in una visualizzazione diversa. Non fare finta che il problema non esista. Il fatto che l'hai scritto "non progettato per mobile" non cambia che io ci provo e ottengo una schermata inutilizzabile.

**Luca:** Ha ragione. Su viewport < `sm` (640px) la cinema view dovrebbe fare fallback a fullscreen PDF con un pulsante "Torna alle card" in overlay. Oppure un tab switch — PDF | Card — invece del split panel.

**Ergis:** Non ho pensato al mobile per la cinema view. Ho assunto che chi vuole leggere PDF lo fa da desktop.

**Giulia:** Ergis. Io leggo i PDF dal telefono in corridoio durante il tirocinio. Non ho un desktop. Ho solo il telefono.

**Ergis:** *silenzio*

**Marco:** Prendo quel silenzio come "ho capito e aggiungo al backlog".

**Ergis:** Aggiunto.

**Luca:** Le frecce di navigazione in cinema mode — hover sul pannello PDF, compaiono le frecce prev/next. L'ho scoperto per caso passando il mouse sopra. Non ci sarei mai arrivato senza un tooltip o senza che me lo dicessi tu. L'hover opacity-0 → opacity-100 è un pattern che esiste, ma per funzionare richiede che l'utente *scopra* di dover fare hover.

**Ergis:** È un pattern comune. Come i controlli video su YouTube.

**Luca:** Su YouTube i controlli sono in un'area dedicata — la barra inferiore del video — e l'utente sa già che i video hanno controlli. Un PDF non ha questo schema mentale. L'utente non si aspetta frecce di navigazione che appaiono dal nulla sopra le pagine.

**Giulia:** Io le frecce le ho viste subito perché sapevo che eri al lavoro su quel fix. Ma se non l'avessi saputo, avrei continuato a scrollare con la rotella come facevo prima.

**Luca:** Le frecce overlay vanno bene come shortcut visivo al hover. Ma devono esserci anche frecce *sempre visibili* — non necessariamente grandi — ai lati del pannello. Anche piccole, 24px, sempre presenti. Così l'utente capisce che può navigare.

**Ergis:** Opacity-0 al hover mi sembrava pulita esteticamente.

**Luca:** Pulita ≠ usabile. Questo è il classic over-engineering dell'UI: sacrifichi l'affordance per l'estetica.

**Marco:** Le keyboard shortcut invece le apprezzo. Freccia sinistra/destra per le pagine. Ci sono arrivato dopo due minuti di esplorazione e adesso le uso sempre. Su desktop è naturale.

**Ergis:** La rimozione delle impostazioni del mazzo — l'algoritmo SRS, le configurazioni avanzate — come l'avete percepita?

**Giulia:** Non ho capito che erano sparite finché non ho cercato di cambiarle per il mazzo di Anatomia. Poi ho cercato il menu Impostazioni, non l'ho trovato, ho pensato si fosse rotto qualcosa.

**Ergis:** Era una scelta deliberata di semplificazione. Quegli algoritmi erano fonte di confusion—

**Giulia:** Lo so che era deliberato. Il problema non è che li hai tolti. Il problema è che non c'è nessuna comunicazione che li hai tolti. Non c'è un release note in-app, non c'è un tooltip che dice "l'algoritmo viene gestito automaticamente", non c'è niente. Ho passato tre minuti a cercare una cosa che non esiste più.

**Luca:** Principio di minima sorpresa. Quando togli una feature, dovresti comunicarlo. Anche solo un message discreto al primo accesso al dettaglio mazzo: "Le impostazioni SRS sono ora gestite automaticamente. Nessuna azione richiesta." Toast, banner, tooltip. Qualcosa.

**Ergis:** Non ho messo nessuna comunicazione di migrazione perché pensavo che nessuno usasse davvero quelle impostazioni.

**Luca:** E se nessuno le usa, come lo sai? Hai analytics? Hai tracciamento dell'utilizzo delle feature?

**Ergis:** *pausa* No.

**Luca:** Allora non puoi assumerlo. La rimozione è la scelta giusta tecnicamente — meno complessità — ma l'esecuzione manca di comunicazione.

**Marco:** Sulla stessa linea: la barra in basso su mobile con il select modalità e il pulsante Studia. La adoro. Prima dovevo cliccare il pulsante nella toolbar in alto, allungare il pollice, rischiare di toccare lo schermo nella zona sbagliata. Adesso ho tutto in basso, raggiungibile con il pollice. Questo è un miglioramento reale.

**Giulia:** Secondata. L'unica cosa che noto è che il select in basso su iPhone SE — schermo piccolo, 375px — ha il testo dell'opzione "Flashcard" che viene tagliato. Legge "Flash..." con i puntini. Non è un errore bloccante ma fa strano.

**Ergis:** Il select ha `flex-none` e il button ha `flex-1`. Se lo schermo è molto stretto, il select potrebbe comprimere il testo.

**Giulia:** Sul SE succede esattamente questo.

**Ergis:** Serve un `min-w` sul select. Semplice.

**Luca:** Il contrasto. Ho fatto un audit rapido col plugin di Figma sul branch di staging. I token sono migliorati rispetto alla parte 2. `text-theme-muted` in dark mode è passato da 3.8:1 a qualcosa di meglio — sembrava intorno a 4.6:1 a occhio. E il focus visible finalmente esiste. Prima era completamente assente.

**Ergis:** Grazie. Ci ho dedicato un'ora intera solo ai token di colore.

**Luca:** L'outline focus però ha un problema. In dark mode, su bottoni con sfondo indigo, l'outline è indigo — stesso colore. Non si vede. Hai usato `--primary-400` per il focus ring ma se il bottone è già `bg-indigo-500`, il ring sparisce.

**Ergis:** Accidentalmente ho messo lo stesso colore per il ring e il background?

**Luca:** In effetti non sparisce completamente ma il contrasto ring/background è sotto 3:1, che è il minimo per gli elementi non testuali secondo WCAG AA. Serve un colore diverso. Su bottoni indigo, usa bianco o un neutro chiaro per il ring.

**Ergis:** `outline: 2px solid white` su button:focus-visible quando il button è colorato?

**Luca:** Sì, o più precisamente: quando il background di un bottone interattivo è scuro/colorato, il focus ring dovrebbe essere bianco o molto chiaro. Puoi gestirlo con una classe `focus-ring-inset` o con una `box-shadow` interna bianca oltre all'outline.

**Ergis:** Box shadow bianca interna, 0 0 0 2px white inside, poi outline indigo esterno. Doppio ring. Funziona su tutti i background.

**Luca:** Quello è il pattern standard. Apple lo usa ovunque. Funziona.

**Giulia:** Il visual viewport — la tastiera su mobile che fa saltare il layout. Ho testato ieri sera con iPhone 13, iOS 17. Quando apro la Typing mode e tocco l'input, la tastiera sale e il layout si adatta. Funziona. Ma ho un caso edge: se la tastiera è già aperta da prima — tipo venivo da una ricerca nella navbar — e apro la Typing mode, il layout non si ricalcola finché non ri-tocco l'input.

**Ergis:** Il `visualViewport` listener attacca solo al mount del componente. Se la tastiera era già aperta, non riceve l'evento resize.

**Giulia:** Esatto. E ho anche notato che su Android — ho testato con il Chrome mobile di una mia collega, Samsung Galaxy — il comportamento è leggermente diverso. Il layout saltella per un frame prima di stabilizzarsi. È un flash di layout.

**Ergis:** Su Android `visualViewport` funziona ma può essere sfasato di un frame rispetto al resize fisico della viewport. Bisogna leggere il valore nel `requestAnimationFrame` invece che direttamente nel listener.

**Luca:** O usare `window.innerHeight` come fallback con un debounce a 100ms. Meno preciso ma più stabile cross-platform.

**Marco:** Cambio tema per un secondo. Ho notato una cosa che non avevamo discusso nelle sessioni precedenti. Nella pagina della dashboard, il titolo di un mazzo lungo — tipo "Diritto Commerciale Internazionale e Comparato III" — viene troncato con i puntini dopo 3-4 parole. Ma se vado nel dettaglio del mazzo, il titolo completo non è mai visibile in modo prominente. Devo alzare gli occhi fino all'header del browser.

**Ergis:** Il titolo nel dettaglio mazzo è nel `h1` in cima alla page.

**Marco:** Che su mobile è nascosto dalla sidebar sinistra delle statistiche che occupa il primo 30% dello schermo verticale. Il `h1` è sotto. Non lo vedo finché non scorro.

**Luca:** È la gerarchia visiva che avevamo discusso nella parte 2. La sidebar con le statistiche precede il titolo nel DOM. Su mobile, l'utente vede prima le statistiche del mazzo poi il titolo. È invertito.

**Ergis:** Ho spostato il PDF banner prima delle statistiche. Ma il titolo è ancora in un `h1` separato sopra la griglia.

**Giulia:** Su iOS, quando apro il dettaglio mazzo, il titolo non è la prima cosa che vedo. Vedo la griglia delle card. È come se il titolo fosse collassato o nascosto.

**Marco:** Lo stesso su Android. Confermato.

**Ergis:** Non ho testato il dettaglio mazzo su dispositivi fisici per il titolo. Ho testato solo su DevTools.

**Luca:** DevTools mobile simulation è utile ma non sostituisce un device fisico, specialmente per il comportamento dello scroll above-the-fold. La viewport mobile in DevTools non ha il stesso comportamento del browser reale rispetto alla URL bar che sparisce e riappare durante lo scroll.

**Marco:** Ultima cosa. La griglia dei mazzi — tre colonne su xl, due su md, una su mobile. Meglio di prima. Però sul mio laptop a 1366px, che è la risoluzione più comune per laptop da 14 pollici, ci sono solo 2 colonne perché non raggiunge `xl` (1280px). Dovrebbe essere tre colonne già da `lg` (1024px).

**Ergis:** Ho usato `xl:grid-cols-3`. Se cambio in `lg:grid-cols-3`, su alcuni laptop potrebbe risultare troppo compresso.

**Marco:** 1024px con tre colonne è gestibile se le card hanno un min-width sensato. Il `minmax(320px, 1fr)` risolve entrambe le cose.

**Luca:** O più semplicemente: `grid-cols-2 lg:grid-cols-3`. Tre colonne da 1024px in poi. Le card non sono così larghe da avere bisogno di 640px ciascuna.

**Ergis:** Cambio piccolo. Aggiunto.

**Giulia:** Devo chiudere tra dieci minuti. Faccio il punto su quello che funziona davvero bene. Uno: il PDF banner. Due: la bottom bar su mobile per scegliere la modalità. Tre: il feedback quiz con le barre colorate. Sono miglioramenti tangibili che uso ogni giorno.

**Marco:** Concordo. Aggiungo: il titolo del mazzo nel footer della sessione di studio. Piccolo ma prezioso. Quando ho 40 sessioni attive di mazzi diversi, sapere su quale mazzo sono senza dover uscire mi salva tempo.

**Luca:** Il focus visible è la feature che più mi ha impressionato. Prima l'app era inutilizzabile da tastiera. Adesso posso navigare con Tab, Enter, Spazio, frecce — funziona. Non perfettamente, ma funziona. È una differenza di categoria, non di grado.

**Ergis:** Grazie. Volevo dirvi che questa sessione — le tre sessioni insieme — hanno cambiato il modo in cui guardo l'app. Prima la costruivo per me. Adesso la costruisco sapendo che Giulia la usa sul telefono in corridoio, che Marco ha uno schermo a 1366px, e che Luca naviga col keyboard. Sono utenti reali con vincoli reali.

**Luca:** Questo è esattamente il valore dei test con utenti. Puoi simulare personas in fase di design ma non sostituiscono il feedback di chi usa l'app con il cervello impegnato da altro.

**Giulia:** Farmacologia non si studia con il cervello libero.

**Marco:** Diritto commerciale nemmeno.

**Ergis:** Lo tengo a mente per ogni feature che costruirò da adesso.

**Luca:** Ultima nota tecnica. La `sessionStorage` per la persistenza della viewMode — ho guardato il codice, usi `localStorage`. Va bene. Ma considera che se l'utente cambia preferenza su mobile e poi apre su desktop, la preferenza rimane "lista" anche su desktop dove "griglia" sarebbe più naturale. Valuta un breakpoint: su mobile default lista, su desktop default griglia, e `localStorage` sovrascrive solo se l'utente ha cambiato esplicitamente.

**Ergis:** Senso. Il default dipende dal device, l'override è esplicito dell'utente.

**Luca:** Esatto. Implementazione da trenta righe, impatto positivo su tutti i nuovi utenti.

**Marco:** Ho finito. Devo preparare una presentazione per domani. Ergis, il lavoro fatto in questo sprint è solido. I bug esistono ma sono piccoli. La direzione è quella giusta.

**Giulia:** Concordo. Ora sistema la cinema view su mobile perché ho bisogno di leggerci i PDF anche in corridoio.

**Ergis:** Lo metto in cima al backlog.

**Luca:** Lo so che te lo abbiamo detto anche nella parte 2 ma: testa su device fisici. Non su DevTools. Su device fisici.

**Ergis:** Messaggio ricevuto.

---

## L'Accordo Finale

| # | Problema | Priorità | Soluzione Concordata | Stato Precedente |
|---|----------|----------|----------------------|-----------------|
| 1 | Mix mode opaca: l'utente non capisce quale modalità sta per arrivare | 🔴 Critico | Badge nell'header sessione che mostra la modalità della carta corrente ("Flashcard" / "Typing") | Nuovo — non era nei fix precedenti |
| 2 | Exit confirmation appare anche a `currentCardIndex === 0` (edge case Typing mode) | 🔴 Critico | Correggere la condizione nel `handleBack`: skip dialog se nessuna carta è stata completata | Bug introdotto nell'implementazione del fix #8 |
| 3 | Similarity badge assente quando la risposta è corretta (Typing mode) | 🔴 Critico | Mostrare percentuale di somiglianza anche in caso corretto, stile verde discreto sotto il feedback | Implementato parzialmente — solo su "sbagliato" |
| 4 | Cinema view su mobile: layout split inutilizzabile su viewport < 640px | 🔴 Critico | Su mobile: fallback a visualizzazione full-screen PDF con tab switch "PDF / Card" invece del split panel | Non coperto — design review scopre il caso d'uso mobile |
| 5 | Distractor fallback badge (`text-xs`) illeggibile su mobile (3mm altezza) | 🟡 Importante | Aumentare a `text-sm` su mobile. Aggiungere `min-h` e padding adeguati al badge | Implementato ma dimensione insufficiente |
| 6 | Focus ring indigo su bottone indigo: contrasto ring/background sotto 3:1 WCAG | 🟡 Importante | Doppio ring: `box-shadow` interna bianca + `outline` colorato esterno. Pattern Apple per bottoni colorati | Implementato ma colore ring non differenziato da background |
| 7 | Cinema mode frecce overlay: affordance zero senza hover (opacity-0) | 🟡 Importante | Frecce sempre visibili a bassa opacità (`opacity-40`), al hover `opacity-100`. Rimuovere opacity-0 di default | Implementato con opacity-0 — non trovabile senza hover |
| 8 | visualViewport: tastiera già aperta al mount non triggera resize. Flash layout su Android | 🟡 Importante | Leggere `visualViewport.height` nel `requestAnimationFrame`. Fallback: `window.innerHeight` con debounce 100ms | Implementato ma con edge case cross-platform |
| 9 | Select modalità tagliato a "Flash..." su iPhone SE (375px) | 🟡 Importante | Aggiungere `min-w-[96px]` al select nella bottom bar mobile | Bug su device fisico non rilevato in DevTools |
| 10 | DeckSettings rimosso senza comunicazione agli utenti esistenti | 🟡 Importante | Aggiungere toast/banner al primo accesso post-aggiornamento: "Impostazioni SRS ora automatiche" | Migrazione silenziosa — viola principio di minima sorpresa |
| 11 | Titolo mazzo non visibile above-the-fold su mobile nel dettaglio mazzo | 🟡 Importante | Garantire che il titolo `h1` sia il primo elemento visibile nella viewport mobile (prima delle statistiche) | Gerarchia DOM non testata su device fisico |
| 12 | Griglia mazzi: `xl:grid-cols-3` esclude i laptop a 1366px (risoluzione più comune) | 🟢 Nice-to-have | Cambiare in `lg:grid-cols-3` (da 1024px). Card con `minmax(280px, 1fr)` per evitare compressione | Fix #15 implementato con breakpoint troppo alto |
| 13 | localStorage viewMode: non tiene conto del contesto device (mobile vs desktop) | 🟢 Nice-to-have | Default list su mobile, grid su desktop. `localStorage` sovrascrive solo se l'utente ha cambiato esplicitamente | Implementato senza context-awareness del device |

---

> **Note di test:** I bug #2, #5, #7, #9 sono stati trovati su device fisici. Zero su DevTools. Testare sempre su hardware reale prima di considerare un fix chiuso.

> **Responsabile test parte 4:** Giulia valida Typing mode + cinema view su iOS. Marco valida griglia mazzi e navigazione mobile. Luca valida focus ring + distractor badge + accessibility audit completo. Ergis implementa e condivide link staging entro 7 giorni.
