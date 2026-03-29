# ExtraTracker — Design Review: La Chiamata (Parte 2)
> 3 studenti, 1 sviluppatore, 0 filtri

---

## Il Contesto

È mercoledì sera, le 21:30. Andrea ha mandato un messaggio nel gruppo WhatsApp: *"Ho rilasciato la nuova versione con il PDF reader riscritto e le animazioni su Framer Motion. Datemi feedback, ho bisogno di sapere cosa non va prima di pushare su prod."*

Venti minuti dopo sono tutti su Google Meet. Marco ha appena finito di studiare Diritto commerciale. Giulia era già in sessione di studio, ha aperto la call senza interrompere il ripasso. Luca ha l'app aperta su tre dispositivi: laptop, tablet e iPhone.

Andrea si aspettava feedback gentile. Si sbagliava.

---

## La Conversazione

**Andrea:** Ok, sono qui. Grazie per essere venuti. Allora, ho fatto un sacco di lavoro sul PDF reader, ho riscritto tutta la logica di sottolineatura, e le animazioni adesso sono molto più fluide con Framer Motion. Volevo—

**Giulia:** Aspetta. Prima di tutto: il layout a tre colonne sul tablet. L'ho aperto sull'iPad stamattina durante la pausa, e la sidebar sinistra delle statistiche occupa un terzo dello schermo. Ho la lista delle card che è larga quanto un pacchetto di sigarette. Non riesco a leggere le domande.

**Andrea:** Il layout è responsive, si adatta a—

**Giulia:** No. Non si adatta. Ho uno schermo da 10 pollici e la sidebar non collassa. Le statistiche del mazzo — numero di carte, percentuale di successo — le guardo una volta quando apro il mazzo. Non ho bisogno che occupino 280 pixel fissi per tutta la sessione di revisione.

**Marco:** Confermo. Anche su Chrome a finestra ridotta, quella sidebar non si muove. E guarda, io capisco che ci tieni alle statistiche, ma quando devo ripassare 30 carte di Diritto commerciale la mattina prima dell'esame, non voglio vedere un grafico circolare con la mia percentuale di successo. Voglio le carte.

**Andrea:** Il grafico serve a capire lo stato del mazzo. È una scelta deliberata di information architecture.

**Luca:** Information architecture di cosa? Sul tablet hai violato il principio di gerarchia visiva. L'utente arriva sul dettaglio mazzo con un intent preciso: vuole studiare. Il suo focus dovrebbe andare sulle card. Invece il layout forza un F-pattern che inizia dalla sidebar sinistra con statistiche secondarie. Hai invertito la priorità visiva.

**Andrea:** Le statistiche sono importanti per—

**Luca:** Per chi le guarda. Non per chi vuole premere "Studia". Sono due use case diversi. Un utente che apre il mazzo per studiare e uno che apre il mazzo per monitorare i progressi. Li stai servendo con lo stesso layout senza distinguerli.

**Giulia:** Esattamente. Io ho 500 flashcard di Anatomia. Quando apro il mazzo di Anatomia Topografica, ho già passato le statistiche in testa. So quante carte ho, so quanto ho studiato ieri. Non ho bisogno che me lo ripeta ogni volta.

**Andrea:** Ok, quindi cosa vorreste? Che nasconda la sidebar?

**Marco:** Che collassi su tablet. Un'icona, un toggle, qualcosa. Non deve scomparire, deve stare fuori dai piedi finché non la chiamo.

**Luca:** Collapsible sidebar con stato persistente in localStorage. Non rocket science.

**Andrea:** Okay. Posso farlo. Però — e qui vado io in attacco — Giulia, tu mi hai detto tre settimane fa che le statistiche erano troppo nascoste nella versione precedente. Che non le trovavi.

**Giulia:** Sì, perché erano in un tab sepolto sotto due click. Non vuol dire che le voglio appiccicate al muro tutto il tempo.

**Andrea:** Quindi prima troppo nascoste, ora troppo visibili. Capite che questo mi fa impazzire?

**Marco:** Andrea, c'è differenza tra "le trovo quando le cerco" e "le vedo sempre anche quando non mi servono". Non sono la stessa cosa.

**Andrea:** Sì, lo so. Va bene. Punto preso. Sidebar collassabile. Prossimo punto.

**Luca:** Le animazioni.

**Andrea:** Cosa hanno le animazioni?

**Luca:** Sono ovunque. Ogni interazione ha una transizione. Il flip della flashcard, il passaggio tra card, l'apertura del modale, il dropdown della modalità di studio, la sidebar dell'AI assistant. È un sistema a cascata di animazioni che rallenta la percezione dell'interfaccia.

**Andrea:** Le animazioni sono a 60fps, ho profilato—

**Luca:** Non è un problema di performance tecnica, è un problema di UX cognitiva. Ogni animazione che non porta informazione è rumore. Il flip 3D della flashcard — okay, ha senso, simula l'oggetto fisico, crea affordance. Ma la transizione di 400ms quando premi "Avanti" tra una carta e l'altra? Quello rallenta il ritmo di studio.

**Giulia:** Esatto. Io faccio sessioni di 10 ore. Se ogni carta ha 400 millisecondi di transizione e ne devo fare 200 in una sessione, sto spendendo 80 secondi solo ad aspettare animazioni. Ottanta secondi. Ogni giorno.

**Andrea:** 80 secondi in 10 ore è—

**Giulia:** È tempo che potrei usare per fare un'altra carta. Non è il numero, è il ritmo. Quella pausa tra una carta e l'altra rompe la concentrazione. Stavo entrando in uno stato di flusso e ogni transizione mi tira fuori.

**Marco:** Secondato. Quando studio Statistica e sono nel ritmo — risposta, flip, avanti, risposta, flip, avanti — quella animazione sull'avanzamento è fastidiosa. Non voglio vedere la carta volare fuori schermo come su Tinder.

**Andrea:** Non vola fuori schermo come su Tinder, è uno slide con easing—

**Luca:** Andrea, il problema non è la metafora, è la durata. 200ms è il limite percettivo dell'immediato. Sopra 200ms l'utente inizia a "aspettare". Alcune delle tue transizioni sono a 350-400ms. Abbassale a 150ms con un ease-out aggressivo e sembrerà istantaneo mantenendo la fluidità visiva.

**Andrea:** Okay ma se le abbasso troppo sembrano brutte, choppy—

**Luca:** Non se usi l'easing giusto. `cubic-bezier(0.25, 0.46, 0.45, 0.94)` a 150ms è identico visivamente a `ease-out` a 300ms ma il cervello lo percepisce come più reattivo.

**Andrea:** ..Okay. Ammetto che non ho fatto test di percezione sulle durate. Le ho scelte a occhio.

**Giulia:** Si vede.

**Andrea:** Grazie Giulia, come sempre molto costruttivo.

**Giulia:** Sono costruttiva quando c'è tempo per esserlo. Adesso fammi parlare del pulsante Studia.

**Marco:** Oh no, anche io ce l'ho con quello.

**Andrea:** Cosa c'è che non va nel pulsante Studia?

**Luca:** Allora, il pattern nella toolbar è: [Select dropdown modalità] + [Pulsante Studia]. L'utente deve prima scegliere la modalità dal dropdown e poi premere il pulsante. Il problema è che il dropdown è piccolo, il tap target è insufficiente su mobile, e la modalità selezionata non è visivamente prominente. Se ci passo sopra distrattamente cambio modalità senza accorgermene.

**Marco:** Esattamente. Ieri ho avviato una sessione in modalità Typing pensando di essere in Flashcard. Quando devi scrivere a mano la definizione di "obbligazione solidale" alle 11 di sera non è divertente.

**Andrea:** C'è la label che mostra la modalità selezionata—

**Marco:** La label è in `text-theme-muted` con un font da 13px. Non è leggibile.

**Luca:** Ecco, e qui si collegano due problemi: il contrasto del dark theme e l'ergonomia della toolbar. Il testo `text-theme-muted` in dark mode — ho misurato con il color picker — è circa `#6b7280` su sfondo `#1e1e2e`. Ratio di contrasto: 3.8:1. Il requisito WCAG AA è 4.5:1 per testo normale. Sei sotto standard.

**Andrea:** Quel testo è secondario, non è informazione critica—

**Luca:** La modalità di studio selezionata è informazione critica! Non è una nota a piè di pagina!

**Giulia:** Sono d'accordo. E non è solo il colore. La posizione del dropdown nella toolbar è in alto a destra. Su mobile, con una mano sola, devo fare un'acrobazia per arrivarci.

**Andrea:** I miei utenti usano l'app su desktop per lo più—

**Giulia:** Io la uso sul telefono quando sono in biblioteca. Quando sono sul bus. Quando sono in pausa tra un blocco di studio e l'altro. Non sono sempre al desktop.

**Luca:** È il classico problema della thumb zone. La zona raggiungibile comodamente con il pollice destro su un 6.1 pollici copre la metà inferiore dello schermo. La tua toolbar è in alto. Il pulsante Studia è in alto a destra — l'angolo meno accessibile dell'intero schermo.

**Andrea:** Non posso mettere il pulsante Studia in basso, rompe il layout—

**Luca:** Su mobile sì che puoi. Bottom navigation bar, o bottom action bar fissa. Non su desktop, su mobile. Responsive layout. Due contesti diversi, due soluzioni diverse.

**Marco:** Oppure semplicemente ingrandisci il touch target. Adesso quel pulsante su mobile è alto 36px. Apple HIG e Material Design dicono minimo 44px.

**Andrea:** Okay, 44px lo metto. Sulla bottom bar ci devo pensare, è una riscrittura importante.

**Giulia:** Mentra ci sei, parliamo della navigazione. Come si torna indietro?

**Andrea:** C'è il breadcrumb in alto e il pulsante back—

**Giulia:** Il breadcrumb. In alto. Che come abbiamo già detto è irraggiungibile su mobile con una mano.

**Marco:** E non è intuitivo. Io ho passato i primi tre giorni ad usare il back button del browser perché non capivo che c'era un modo per tornare indietro dentro l'app.

**Andrea:** Il breadcrumb è uno standard di navigazione—

**Luca:** Su desktop. Il pattern mobile per la navigazione è il back button nella top app bar a sinistra, oppure swipe gesture. Non il breadcrumb testuale. Il breadcrumb è un pattern desktop-first che su mobile ha un affordance scarsissimo.

**Andrea:** La maggior parte delle app che conosco usa il breadcrumb anche su mobile—

**Luca:** No. Le app *web* usano il breadcrumb anche su mobile perché i developer non si sono mai fermati a ripensare il pattern. Le app native no. Guarda Anki, guarda Duolingo, guarda qualsiasi app di flashcard seria: hanno un back button esplicito e prominente.

**Giulia:** E c'è un altro problema: quando sono in sessione di studio e voglio uscire, non è chiaro come tornare al mazzo. L'icona X è piccola e si confonde con altri elementi.

**Andrea:** L'icona X era richiesta da voi nella sessione precedente—

**Marco:** Sì ma è piccola. E quando studio Macroeconomia e sono nel mezzo di una sessione e voglio interrompere e segnare dove sono arrivato, ci metto troppo a trovare come uscire.

**Andrea:** C'è il pulsante di pausa—

**Giulia:** Dove?

**Andrea:** In alto a—

**Giulia:** In alto. Ancora. Tutto è in alto. Capisce il pattern?

**Andrea:** [pausa] Va bene. Lo so. Ho costruito l'app pensando a come la uso io, che sono sempre al laptop con due mani. Non ho abbastanza testato su mobile.

**Luca:** Almeno lo ammetti.

**Andrea:** Ma adesso parliamo del PDF reader perché ci ho messo due settimane a riscriverlo e voglio sapere cosa ne pensate.

**Marco:** Non lo trovo.

**Andrea:** Cosa vuoi dire "non lo trovo"?

**Marco:** Voglio dire che non so come arrivarci. So che esiste perché me l'hai detto tu. Ma non c'è un posto nella navigazione dove dice "PDF reader" o "carica PDF". Dove è?

**Andrea:** Dal dettaglio del mazzo c'è il pulsante "Aggiungi risorsa" e poi scegli PDF—

**Marco:** "Aggiungi risorsa". Io non voglio aggiungere una risorsa. Voglio leggere un PDF. È un verbo completamente diverso.

**Giulia:** Concordo. La discoverbility è zero. Io ho trovato il PDF reader per caso dopo una settimana di uso. Ho caricato il PDF di Farmacologia perché avevo visto la feature in un screenshot. Ma se non l'avessi visto nel gruppo non lo avrei mai trovato.

**Andrea:** Ho messo il tooltip sul pulsante—

**Luca:** I tooltip non sono discoverability. I tooltip sono documentazione inline per chi sa già cosa sta cercando. Un utente che non sa che esiste il PDF reader non ci passerà sopra col mouse cercando "PDF reader". Non funziona così la scoperta di feature.

**Andrea:** Come avrei dovuto presentarla?

**Luca:** Voce dedicata in navigazione. "Risorse" o "Documenti" nel menu laterale. Non sepolto in un menu contestuale del mazzo.

**Giulia:** E poi quando ci sono dentro — il reader — la sottolineatura non è trovabile. Devo selezionare il testo e aspettare che appaia il popover. Ma quel popover compare in basso al testo selezionato e spesso è fuori schermo perché ho selezionato testo in fondo alla pagina.

**Andrea:** Il popover ha un posizionamento intelligente che—

**Giulia:** Non funziona. L'ho perso almeno tre volte. Selezionavo, aspettavo, il popover era nascosto fuori viewport, deselezionavo per sbaglio, ricominciavo. È frustrante.

**Luca:** Flip the popover. Se il testo selezionato è nell'altra metà dello schermo, il popover appare sopra invece che sotto. È una logica di collision detection a 5 righe di codice.

**Andrea:** L'ho implementato, ma evidentemente non funziona bene—

**Luca:** Allora debuggalo. E aggiungi una toolbar fissa in alto al reader con le azioni principali — evidenzia, sottolinea, nota — sempre visibili, non solo al selection. Il selection popover può restare come shortcut, ma le azioni principali devono essere sempre accessibili.

**Marco:** E il cinema mode? Ottima idea in principio, ma quando sono in cinema mode non riesco a passare alla pagina successiva senza uscire dalla modalità. Devo uscire, andare alla pagina, rientrare.

**Andrea:** C'è lo swipe—

**Marco:** Non funziona sul laptop. E non l'avevo capito che c'era. Zero affordance.

**Giulia:** Okay, adesso voglio parlare della sessione di studio perché è la parte che uso di più e ho feedback specifici.

**Andrea:** Dai.

**Giulia:** La carta occupa circa il 60% dell'altezza dello schermo su desktop. Il resto è toolbar sopra e pulsanti di risposta sotto. Ma quando la carta ha molto testo — le mie carte di Farmacologia hanno definizioni lunghe — il testo viene compresso con font-size ridotto e diventa illeggibile.

**Andrea:** C'è lo scroll sulla carta—

**Giulia:** Non lo sapevo. Non c'è nessun indicatore che la carta sia scrollabile. Nessuna scroll shadow, nessun indicatore visivo. Ho pensato che il testo venisse troncato per design.

**Luca:** Affordance zero. Se il contenuto è scrollabile devi segnalarlo. Scroll shadow in bottom, oppure indicatore "continua ▼". È un pattern base.

**Marco:** E i pulsanti di risposta nel quiz — "A, B, C, D" — sono troppo simili tra loro. Quando sbaglio, il feedback visivo è un bordo rosso sottile. Non abbastanza prominente.

**Andrea:** Ho messo il colore di background che cambia—

**Marco:** Il background cambia di una tonalità. In dark mode la differenza tra lo stato normale e lo stato "sbagliato" è difficile da distinguere. Ho risposto "sbagliato" e per un secondo non ho capito se avevo sbagliato o no.

**Luca:** È un problema di contrast ratio degli stati. In dark mode i colori semantici — rosso, verde — hanno saturazione ridotta per non essere aggressivi, ma questo li rende meno distinguibili. Devi usare icone + colore, non solo colore. Un'icona ✓ grande verde per corretto, ✗ rosso per sbagliato. L'accessibilità non è solo per chi ha problemi di vista, è per tutti in condizioni di luce variabile.

**Andrea:** Stai dicendo che devo ridisegnare tutto il feedback visivo del quiz?

**Luca:** Stai dicendo che quello attuale funziona?

**Andrea:** [silenzio]

**Giulia:** No. Non funziona. E aggiungo: la modalità Typing. Quando digito una risposta e premo Invio, se ho fatto un errore di battitura banale — una lettera in più, un accento sbagliato — il sistema la conta come sbagliata. Non c'è tolleranza alla punteggiatura.

**Andrea:** Ho implementato la fuzzy matching—

**Giulia:** Su cosa è calibrata? Perché "acetilcolina" scritto "acetilcollina" (doppia L) viene marcato sbagliato. È un refuso di battitura, non un errore concettuale.

**Andrea:** La threshold è al 85% di similarità Levenshtein—

**Giulia:** 85% non è abbastanza per parole lunghe. "Acetilcolina" ha 12 caratteri. Un errore su 12 è 91.7% di similarità. Con threshold 85% dovresti accettarla. Quindi o la tua implementazione ha un bug o la percentuale è sbagliata.

**Andrea:** [pausa lunga] Hai appena fatto un calcolo di Levenshtein a memoria?

**Giulia:** Studio Farmacologia. So contare i caratteri.

**Luca:** C'è anche un altro problema nella modalità Typing: il campo di input è in basso e quando si apre la tastiera su mobile, il layout fa un salto. La carta sparisce sopra la tastiera e devo scrollare per vederla mentre digito.

**Andrea:** Quello è un problema di viewport su iOS—

**Luca:** Sì, e si risolve con `visualViewport` API e un `resize` listener che aggiusta il layout. Non è banale ma è risolvibile. Se non vuoi farlo adesso metti almeno una nota prominente che dice che la modalità Typing è ottimizzata per desktop.

**Andrea:** Okay. Lo riconosco come un bug attivo.

**Marco:** Parliamo della dashboard?

**Andrea:** Cosa c'è che non va nella dashboard?

**Marco:** È troppo vuota o troppo piena, dipende dall'utente. Io ho 8 mazzi. La dashboard mi mostra tutti e 8 in una griglia con le statistiche per ognuno. È un sacco di informazioni. Ma mia sorella che usa l'app ha 2 mazzi e la dashboard sembra spoglia, tipo un appartamento non arredato.

**Andrea:** È empty state design, per chi ha pochi mazzi—

**Marco:** No, non è un empty state. Ha due mazzi ed è una utente attiva. Ma la griglia a 3 colonne con 2 elementi sembra rotta.

**Luca:** Il layout della griglia dovrebbe adattarsi al numero di elementi. 1-2 elementi: centered cards, layout più ampio e prominente. 3-4 elementi: griglia 2 colonne. 5+: griglia 3 colonne. Auto-layout CSS Grid con `auto-fill` e `minmax` lo fa da solo.

**Giulia:** Io ho l'altra metà del problema: ho 12 mazzi e la dashboard è un muro di informazioni. Non c'è gerarchia. Non so subito quali mazzi devo ripassare oggi secondo l'algoritmo SRS.

**Andrea:** C'è la sezione "Da ripassare oggi"—

**Giulia:** Sì ma è in fondo alla pagina. Scorro oltre tutta la griglia dei mazzi per trovare cosa devo fare oggi. L'informazione più urgente — "oggi hai 47 carte da ripassare in questi 3 mazzi" — deve essere in cima, non in fondo.

**Marco:** Concordo. La dashboard dovrebbe rispondere alla domanda: "cosa faccio adesso?". Non "ecco tutto quello che esiste nell'app".

**Luca:** È un problema di progressive disclosure al contrario. Stai mostrando tutto subito invece di guidare l'utente verso l'azione prioritaria. La gerarchia dovrebbe essere: 1) Sessione di studio suggerita per oggi, 2) Mazzi attivi con stato SRS, 3) Statistiche globali. Non il contrario.

**Andrea:** Ma alcuni utenti vogliono vedere le statistiche subito—

**Marco:** Allora metti le statistiche in una tab. O in una sezione collassabile. Non come primo contenuto visivo.

**Andrea:** Ogni volta che faccio una scelta, c'è qualcuno che vuole il contrario. Giulia voleva più statistiche visibili, tu vuoi meno.

**Giulia:** Io volevo le statistiche *della sessione* visibili durante la sessione. Non le statistiche globali nella dashboard.

**Marco:** Sono cose diverse.

**Andrea:** Okay, lo capisco. Contesti diversi, informazioni diverse. Va bene.

**Luca:** Posso fare una sintesi del tema dark mode? Perché ci sono più problemi sparsi.

**Andrea:** Sì, dai.

**Luca:** Primo: il testo `text-theme-muted` come abbiamo detto è sotto WCAG AA in molti punti. Secondo: i bordi delle card in dark mode sono quasi invisibili — il contrasto tra `theme-surface` e `theme-elevated` è troppo basso, le card sembrano galleggiare senza struttura. Terzo: gli stati hover sui pulsanti usano un cambio di opacity invece che un cambio di colore, e in dark mode l'opacity shift è molto meno percettibile. Quarto: il focus state su elementi interattivi è quasi invisibile — quando navigo col tastiera non so dove sono.

**Andrea:** Il focus state lo avevo rimosso perché visivamente era brutto—

**Luca:** Hai rimosso il focus state.

**Andrea:** Era un outline blu storto che—

**Luca:** Andrea. Hai rimosso il focus state. Sai cosa significa? L'app è inaccessibile per navigazione da tastiera. Per utenti con disabilità motorie. Per utenti che usano keyboard shortcuts per velocizzare il workflow. Io navigo col tab quando ho le mani sulla tastiera mentre studio.

**Andrea:** Posso mettere un focus state personalizzato che sia—

**Luca:** Sì, puoi usare `:focus-visible` con un outline colorato e `border-radius` per renderlo carino. Ma deve esserci. Sempre. Non è negoziabile.

**Giulia:** Okay, voglio fare un ultimo punto prima che finiamo. Il font size.

**Andrea:** Il font size va bene—

**Giulia:** 14px sul body delle card. Ho 24 anni e mi devo avvicinare allo schermo per leggere le definizioni lunghe di Biochimica. Chi ha qualche anno in più di me deve usare il browser zoom e rompe tutto il layout.

**Andrea:** Il font size è calibrato per la densità informativa—

**Marco:** La densità informativa non vale niente se non leggi il testo.

**Luca:** 16px è il minimum su mobile. Su desktop 15-16px per body text di contenuto. Non 14px. E le card in particolare — che sono il contenuto principale dell'app — dovrebbero avere 17-18px con line-height 1.6 per leggibilità ottimale. Stai trattando le tue card come testo UI secondario invece che come contenuto primario.

**Andrea:** Se alzo il font rompono le card con testo lungo—

**Giulia:** Allora rendi le card scrollabili con un indicatore visivo, come hai detto che hai già fatto ma che non funziona. Solvi due problemi insieme.

**Marco:** E su mobile, il font delle opzioni nel quiz multiplo è ancora più piccolo. A, B, C, D con 13px è una sofferenza.

**Andrea:** Okay. Sento tutti i feedback. Voglio dire una cosa però: alcuni di questi problemi sono conseguenze di compromessi che ho fatto deliberatamente — la densità della dashboard, la struttura a tre colonne — perché pensavo fossero le scelte giuste. Alcuni altri — il focus state, il contrasto del testo, il Levenshtein della Typing mode — sono bug. Veri bug. Li riconosco come tali.

**Giulia:** Bene. Almeno su quelli sei d'accordo.

**Andrea:** Sul resto: mettetevi d'accordo tra di voi su cosa volete. Perché ho ricevuto richieste contraddittorie e non posso implementare tutto.

**Luca:** Non sono contraddittorie. Sono contesti diversi. Giulia vuole le statistiche della sessione durante la sessione — questo è feedback in-context, sensato. Marco vuole le statistiche globali meno prominenti nella dashboard — questo è prioritizzazione dell'azione primaria. Non si escludono.

**Marco:** Esatto. Il fatto che tu li abbia trattati come un'unica "richiesta di statistiche" è il tuo problema di design, non il nostro.

**Andrea:** [pausa] Sì. Hai ragione. Ho generalizzato. Va bene. Fammi prendere nota di tutto e domani faccio un piano di sprint.

**Giulia:** Un'ultima cosa. Il titolo del mazzo nella sessione di studio. Quando sono in sessione non so in che mazzo sono. Se apro tre sessioni di fila — Anatomia, Farmacologia, Biochimica — e poi esco e rientro, non ricordo quale avevo lasciato aperta.

**Andrea:** Il titolo è nel header della sessione—

**Giulia:** Il header della sessione non è visibile quando la carta è fullscreen su mobile.

**Luca:** Il titolo del mazzo dovrebbe essere sempre visibile, piccolo ma presente, anche in fullscreen. Non è un'informazione secondaria durante una sessione attiva.

**Marco:** Sì, è come se stessi leggendo un libro senza copertina. Non sai cosa stai studiando.

**Andrea:** Okay. Lo aggiungo come elemento persistente nel footer della sessione, così non compete con il contenuto della carta.

**Luca:** Footer è meglio di header per le ragioni di thumb zone che abbiamo già discusso.

**Andrea:** Concordo. Okay, mi fermo qui. Ho abbastanza materiale per stare sveglio tutta la notte.

**Giulia:** Se vuoi ti mando lo screenshot della sottolineatura che scompare.

**Andrea:** Mandamelo. Mandami tutti gli screenshot.

**Marco:** Io faccio un video breve della navigazione su mobile che non funziona. Lo metto nel gruppo.

**Andrea:** Perfetto. Grazie. E scusate se ho difeso alcune cose troppo a lungo — alcune erano difese legittimate, altre era solo ego. Distinguo.

**Luca:** Lo sviluppatore che distingue ego da ragione tecnica è già a metà del lavoro.

**Giulia:** Mezzanotte. Devo tornare a Farmacologia. Andrea, fix urgente: il Levenshtein nella Typing mode. Ho un esame venerdì.

**Andrea:** Guardo stanotte.

---

## L'Accordo Finale

| # | Problema | Priorità | Soluzione Concordata | Note |
|---|----------|----------|----------------------|------|
| 1 | Sidebar statistiche non collassa su tablet/mobile | 🔴 Critico | Sidebar collassabile con toggle, stato persistente in `localStorage` | Desktop: sempre aperta di default. Tablet/mobile: chiusa di default |
| 2 | Animazioni troppo lente, rompono il ritmo di studio | 🔴 Critico | Ridurre durate a 150ms max con `cubic-bezier(0.25, 0.46, 0.45, 0.94)`. Mantenere il flip 3D della card, ridurre transizioni di avanzamento | Il flip ha senso semantico, le transizioni di avanzamento no |
| 3 | Focus state rimosso — app inaccessibile da tastiera | 🔴 Critico | Reimplementare con `:focus-visible`, outline colorato con `border-radius` matching dei componenti | Non negoziabile. WCAG AA minimo |
| 4 | Contrasto `text-theme-muted` sotto WCAG AA (3.8:1 vs 4.5:1 richiesto) | 🔴 Critico | Aggiornare il token colore a valore con ratio ≥ 4.5:1. Audit completo di tutti gli usi di `text-theme-muted` su elementi informativi | Non solo estetica, è accessibilità |
| 5 | Fuzzy matching Typing mode: bug nel calcolo Levenshtein | 🔴 Critico | Debug threshold. Target: accettare ±1 errore su parole ≤ 8 char, ±2 su parole > 8 char. Ignorare punteggiatura e case | Giulia ha esame venerdì — fix priorità massima |
| 6 | Pulsante Studia + Select modalità: touch target insufficiente (36px), posizione irraggiungibile su mobile | 🔴 Critico | Touch target minimo 44px per tutti gli elementi interattivi. Su mobile: bottom action bar con modalità selezionata prominente | Testare su device fisico, non solo DevTools |
| 7 | Feedback visivo quiz (corretto/sbagliato) insufficiente in dark mode | 🔴 Critico | Aggiungere icone ✓ / ✗ grandi in overlay + colore. Non solo colore. Animazione di feedback più prominente (shake per sbagliato, bounce per corretto) | Principio: icona + colore, mai solo colore |
| 8 | Navigazione: breadcrumb non intuitivo su mobile, back button poco chiaro in sessione di studio | 🟡 Importante | Back button esplicito in top-left per tutte le pagine. In sessione: pulsante "Esci dalla sessione" con conferma. Breadcrumb rimane per desktop | Pattern Anki/Duolingo come riferimento |
| 9 | PDF reader non trovabile (sepolto in "Aggiungi risorsa") | 🟡 Importante | Voce "Documenti" o "Risorse" nel menu di navigazione principale. PDF reader accessibile direttamente, non come sotto-azione del mazzo | Discoverability: deve essere trovabile senza documentazione |
| 10 | Scroll delle card non segnalato visivamente | 🟡 Importante | Aggiungere scroll shadow gradient in fondo alla card quando il contenuto eccede. Indicatore "▼ continua" opzionale | Già implementato parzialmente ma non funziona |
| 11 | Popover sottolineatura PDF esce fuori viewport | 🟡 Importante | Collision detection: se selezione è nella metà inferiore dello schermo, popover appare sopra. Aggiungere toolbar fissa in cima al reader per le azioni principali | 5 righe di logica, impatto alto |
| 12 | Font size 14px body card: troppo piccolo | 🟡 Importante | Aumentare a 16px su mobile, 15-16px su desktop. Card content: 17px con `line-height: 1.6`. Testo opzioni quiz: minimo 15px | Contenuto primario ≠ testo UI secondario |
| 13 | Dashboard: "Da ripassare oggi" è in fondo invece che in cima | 🟡 Importante | Riordinare gerarchia: 1) Sessione suggerita per oggi, 2) Mazzi con stato SRS, 3) Statistiche globali | L'utente deve sapere "cosa faccio adesso" al primo sguardo |
| 14 | Titolo mazzo non visibile in sessione di studio fullscreen | 🟡 Importante | Aggiungere titolo mazzo come elemento persistente nel footer della sessione di studio. Piccolo ma sempre presente | Footer preferito a header per thumb zone |
| 15 | Layout griglia mazzi non adattivo al numero di elementi | 🟢 Nice-to-have | CSS Grid con `auto-fill` e `minmax`. 1-2 mazzi: card centrate e prominenti. 3-4: 2 colonne. 5+: 3 colonne | 3 righe di CSS, impatto visivo alto |
| 16 | Tastiera su mobile nella modalità Typing fa saltare il layout | 🟢 Nice-to-have | Implementare `visualViewport` API con listener `resize` per gestire il layout quando la tastiera è aperta. Fallback: nota "ottimizzato per desktop" | Non banale, schedulare per sprint futuro |
| 17 | Cinema mode PDF: nessun modo di cambiare pagina senza uscire dalla modalità | 🟢 Nice-to-have | Aggiungere controlli pagina (frecce) sempre visibili anche in cinema mode, con stile minimal/overlay | Affordance zero sull'esistenza dello swipe su desktop |
| 18 | Bordi card in dark mode quasi invisibili (contrasto `theme-surface`/`theme-elevated` troppo basso) | 🟢 Nice-to-have | Aumentare il contrasto dei bordi in dark mode. Oppure usare `box-shadow` sottile invece di `border` per più definizione | Audit completo dei token del dark theme |

---

> **Sprint suggerito:** I punti 🔴 Critico (1-7) entro 5 giorni lavorativi. I punti 🟡 Importante (8-14) nel sprint successivo. I punti 🟢 Nice-to-have (15-18) nel backlog.

> **Responsabile test:** Giulia testa Typing mode e sessione di studio. Marco testa navigazione mobile e dashboard. Luca testa accessibilità, dark theme e PDF reader. Andrea implementa e condivide branch per test.
