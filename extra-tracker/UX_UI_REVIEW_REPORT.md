# 📊 REPORT UX/UI - ExtraTracker
## Revisione Esperienza Utente e Design

**Data revisione:** 11 Febbraio 2026  
**Progetto:** ExtraTracker / Silvi AI  
**Percorso:** `/Users/ergis.kocumi/ExtraTracker/extra-tracker/`

---

## 🎯 SOMMARIO ESECUTIVO

L'applicazione ExtraTracker presenta un **design visivamente moderno e accattivante** con un tema Aurora che utilizza gradienti viola e glassmorphism. Tuttavia, emergono **problemi di usabilità critici** nell'esperienza quiz/studio che compromettono l'efficacia dell'apprendimento, molti dei quali già documentati nel `toDo.txt`.

**Valutazione Complessiva:**
- 🎨 Design Visivo: 8/10
- ⚙️ Usabilità: 5/10
- 🎯 Task Completion: 6/10
- ♿ Accessibilità: 4/10
- 📱 Responsiveness: 7/10

---

## 🚨 PROBLEMI DI ESPERIENZA QUIZ/STUDIO (CRITICI)

### 1. Modalità Quiz: Navigazione Domande Unidirezionale
| | |
|---|---|
| **Area** | QuizView.tsx, StudySession |
| **Problema** | Una volta risposta una domanda, l'utente non può tornare indietro per rivederla o correggerla. Il flusso è forzatamente sequenziale senza possibilità di navigazione libera. |
| **Criticità** | 🔴 **ALTA** |
| **Evidenzia toDo.txt** | ✅ Sì - "pensare se aggiungere una modalità di scorrimento delle domanda in modo da non perdere tempo e fare le altre, in modo che però permetta di andare a ritornare indietro" |
| **Suggerimento** | Aggiungere una barra di navigazione con indicatori cliccabili per ogni domanda (es: pallini numerati o thumbnail) che permetta di: saltare avanti, tornare indietro, vedere lo stato (risposto/non risposto). |
| **Best Practice** | Nielsen's "User Control and Freedom" - Permettere undo e navigazione libera nelle interfacce di apprendimento. |

### 2. Feedback Risposte Troppo Rapido/Effimero
| | |
|---|---|
| **Area** | QuizView.tsx - transizioni post-risposta |
| **Problema** | Dopo aver selezionato una risposta, l'animazione è troppo veloce (150ms di delay prima di onNext). L'utente non ha tempo di: vedere quale era la risposta corretta, leggere la spiegazione, comprendere l'errore. |
| **Criticità** | 🔴 **CRITICA** |
| **Evidenzia toDo.txt** | ✅ Sì - "quando si risponde al quiz con una domanda, non si capisce qual'è quella giusta e quella sbagliata perchè c'è l'animazione troppo veloce" |
| **Suggerimento** | Implementare uno stato "Review" fisso che richieda azione esplicita dell'utente per continuare. Mostrare: ✓ risposta selezionata (se giusta), ✓ risposta corretta evidenziata, ✗ risposta sbagliata selezionata con indicazione visiva chiara. Tempo minimo di permanenza: 2-3 secondi o fino a click. |
| **Best Practice** | "Recognition over recall" - L'utente deve poter confrontare la sua risposta con quella corretta senza sforzo cognitivo. |

### 3. Timer che Continua Dopo il Completamento
| | |
|---|---|
| **Area** | StudyProgress.tsx, SessionComplete.tsx |
| **Problema** | Il timer di sessione continua a tracciare il tempo anche dopo che l'ultima domanda è stata completata e prima che l'utente chiuda la schermata risultati. |
| **Criticità** | 🟡 **MEDIA** |
| **Evidenzia toDo.txt** | ✅ Sì - "quando si finisce il quiz, non deve poter andare a registrare ancora in tempo impiegato una volta che si arriva al ultima domanda basta non deve più tracciare il tempo" |
| **Suggerimento** | Congelare il timer quando `currentIndex >= totalCards` (sessione completata). Memorizzare `finalElapsedTime` nel momento del completamento. |
| **Codice rilevante** | `StudyProgress.tsx:46-50` - la funzione `formatTime` riceve `elapsedSeconds` continuo |

### 4. Scroll Insufficiente per Domande Lunghe
| | |
|---|---|
| **Area** | QuizView.tsx, TypingView.tsx |
| **Problema** | Sebbene sia stato implementato scroll interno (`overflow-y-auto`), domande molto lunghe possono ancora creare problemi di layout specialmente su schermi piccoli. La gerarchia visiva tra header, contenuto scrollabile e footer fixed può creare confusione. |
| **Criticità** | 🟡 **MEDIA** |
| **Evidenzia toDo.txt** | ✅ Sì - "se si entra nella modalità quiz succede che se c'è una domanda molto grande e lunga, non si può e non si riesce a leggere tutto nello schermo" |
| **Suggerimento** | Implementare una "modalità lettura" per domande lunghe: espandere a schermo intero, ridurre font-size dinamicamente se il testo supera X caratteri, assicurare che l'area scrollabile abbia altezza minima sufficiente (min-h-[300px]). |
| **Implementazione attuale** | QuizView.tsx:329-374 ha già scroll interno, ma va verificato su mobile |

### 5. Pulsante "Non Lo So" - Inconsistenza Modalità
| | |
|---|---|
| **Area** | QuizView.tsx |
| **Problema** | Il pulsante "Non lo so" (tasto 0) è presente e ben implementato nella modalità quiz a scelta multipla, ma manca completamente nella modalità Vero/Falso (`isTrueFalse=true`) e nella modalità Typing. |
| **Criticità** | 🟡 **MEDIA** |
| **Evidenzia toDo.txt** | ✅ Sì - "aggiungere il pulsante NON LO SO anche nella modalità di quiz perchè si può non sapere" (PARZIALMENTE RISOLTO) |
| **Suggerimento** | Aggiungere il pulsante "Non lo so" anche in: 1) Modalità Vero/Falso, 2) Modalità Typing (come opzione alternativa all'input). Uniformare il comportamento: sempre visibile, stesso stile (amber), stessa shortcut (0). |
| **Codice attuale** | QuizView.tsx:471-486 - condizionato a `!isTrueFalse` |

---

## 🔧 PROBLEMI DI USABILITÀ CRITICI

### 6. Mancanza di Conferma Azioni Distruttive
| | |
|---|---|
| **Area** | FlashcardList, Impostazioni Account |
| **Problema** | L'eliminazione di una flashcard o del account avviene senza conferma intermedia o con modal troppo facile da confermare accidentalmente. |
| **Criticità** | 🔴 **ALTA** |
| **Suggerimento** | Implementare pattern "Hold to Delete" su mobile o richiesta di digitare il nome dell'elemento da eliminare per azioni distruttive irreversibili. |
| **Best Practice** | "Prevent errors" - Proteggere le azioni irreversibili con frizioni appropriate. |

### 7. Focus Management Inconsistente
| | |
|---|---|
| **Area** | QuizView.tsx, FlashcardCarousel.tsx |
| **Problema** | Sebbene ci sia un tentativo di focus management (`optionsRef.current[0]?.focus()`), la navigazione da tastiera non è sempre coerente. Su FlashcardCarousel, non c'è gestione del focus durante l'editing inline. |
| **Criticità** | 🟡 **MEDIA** |
| **Suggerimento** | Implementare focus trap nei modali, focus restoration dopo operazioni asincrone, e visibilità chiara del focus indicator (outline) su tutti gli elementi interattivi. |
| **Best Practice** | WCAG 2.1 - Focus Visible, Focus Order |

### 8. Feedback di Caricamento Ambiguo
| | |
|---|---|
| **Area** | QuizView.tsx, TypingView.tsx |
| **Problema** | Gli stati `isSubmitting` e `isChecking` mostrano spinner ma non bloccano adeguatamente le interazioni. La label del pulsante cambia ma potrebbe essere più esplicita. |
| **Criticità** | 🟡 **MEDIA** |
| **Suggerimento** | Usare skeleton screens invece di semplici spinner, disabilitare completamente l'interfaccia durante submission, fornire feedback progressivo. |

---

## 🧭 PROBLEMI DI NAVIGAZIONE

### 9. URL non Riflette lo Stato della Sessione
| | |
|---|---|
| **Area** | App.tsx, StudySessionPage |
| **Problema** | La navigazione tra le domande di un quiz non aggiorna l'URL. Non è possibile: tornare a una domanda specifica con back button, condividere un link a una specifica domanda, ricaricare e mantenere la posizione. |
| **Criticità** | 🟡 **MEDIA** |
| **Suggerimento** | Aggiungere query parameter `?question=3` o usare state router. Implementare gestione back button che chieda conferma prima di uscire da una sessione in corso. |

### 10. Mancanza di Breadcrumb in Sessioni Annidate
| | |
|---|---|
| **Area** | StudySessionPage, DeckDetailPage |
| **Problema** | Quando si è in una sessione di studio, non c'è indicazione chiara del percorso: Dashboard > Esami > [Nome Esame] > [Nome Mazzo] > Sessione. |
| **Criticità** | 🟢 **BASSA** |
| **Suggerimento** | Aggiungere header contestuale con: nome mazzo cliccabile (torna al mazzo), tipo sessione (badge), progresso. |

---

## 📱 PROBLEMI DI RESPONSIVENESS

### 11. Touch Target Troppo Piccoli su Mobile
| | |
|---|---|
| **Area** | FlashcardControls.tsx, StudyControls.tsx |
| **Problema** | Alcuni pulsanti, specialmente quelli delle valutazioni 1-5, potrebbero avere touch target al limite delle linee guida WCAG 2.1 (min 44x44px). Su schermi molto piccoli, i 5 pulsanti in fila sono stretti. |
| **Criticità** | 🟡 **MEDIA** |
| **Suggerimento** | Verificare che tutti i touch target siano min 44x44px (preferibilmente 48x48px). Considerare layout alternativo su mobile (es: 2 righe per le valutazioni). |
| **Codice** | StudyControls.tsx:133 - grid-cols-5 con gap-1.5 |

### 12. Font Size Adattivo Potenzialmente Troppo Piccolo
| | |
|---|---|
| **Area** | Flashcard.tsx |
| **Problema** | Il font size adattivo su mobile scende fino a 11px per testi lunghi (`text-[11px]`), che è al di sotto del minimo raccomandato per leggibilità (14px). |
| **Criticità** | 🟡 **MEDIA** |
| **Suggerimento** | Aumentare il minimo a 14px su mobile, implementare scroll prima di ridurre troppo il font. Considerare espansione a schermo intero per contenuti lunghi. |
| **Codice** | Flashcard.tsx:111-118 |

---

## 🎨 PROBLEMI DI CONSISTENZA VISIVA

### 13. Inconsistenza Nomenclatura Modalità Studio
| | |
|---|---|
| **Area** | Interfaccia generale |
| **Problema** | Mescolanza di termini: "Quiz Mode" vs "Vero/Falso" vs "Typing Mode". Header mostrano emoji diverse senza pattern coerente (📝, ✓✗, ⌨️). |
| **Criticità** | 🟢 **BASSA** |
| **Suggerimento** | Standardizzare: usare sempre italiano ("Modalità Quiz", "Vero o Falso", "Scrittura") o sempre inglese. Creare sistema iconografico coerente. |

### 14. Varianti di Card non Coerenti
| | |
|---|---|
| **Area** | Flashcard.tsx, StudyCard.tsx |
| **Problema** | Esistono due componenti card simili ma con stili diversi: Flashcard (usata in sessione) e StudyCard (sembra legacy). Questo crea inconsistenze visive potenziali. |
| **Criticità** | 🟢 **BASSA** |
| **Suggerimento** | Consolidare in un unico componente con varianti, o documentare chiaramente quando usare ciascuno. |

---

## ♿ PROBLEMI DI ACCESSIBILITÀ UX

### 15. Colori di Feedback Non Distinguibili per Daltonici
| | |
|---|---|
| **Area** | QuizView.tsx (risposte corrette/sbagliate) |
| **Problema** | Le risposte corrette usano verde (emerald), sbagliate rosso (rose), ma la distinzione si basa solo sul colore senza pattern o icone sufficientemente distintive per utenti con protanopia/deuteranopia. |
| **Criticità** | 🔴 **ALTA** |
| **Suggerimento** | Aggiungere sempre icone distintive: ✓ per corretto, ✗ per sbagliato, ? per non lo so. Non affidarsi solo al colore. Usare pattern/texture o bordi diversi. |
| **Best Practice** | WCAG 1.4.1 - Use of Color |

### 16. Shortcut da Tastiera Non Scopribili
| | |
|---|---|
| **Area** | QuizView.tsx, StudyControls.tsx |
| **Problema** | Gli shortcut (1-4, 0, Spazio, Enter) sono mostrati in piccoli kbd elements che scompaiono dopo la risposta. Gli utenti non possono scoprirli progressivamente. |
| **Criticità** | 🟢 **BASSA** |
| **Suggerimento** | Aggiungere un tooltip o help overlay accessibile con "?" che mostri tutti gli shortcut. Mantenere hint visibili più a lungo o permanenti. |

### 17. Mancanza di ARIA Labels su Elementi Interattivi
| | |
|---|---|
| **Area** | QuizView.tsx (opzioni risposta) |
| **Problema** | I bottoni delle opzioni quiz non hanno `aria-pressed` o `aria-selected` per indicare lo stato. Il cambio di domanda non annuncia niente a screen reader. |
| **Criticità** | 🟡 **MEDIA** |
| **Suggerimento** | Aggiungere `aria-pressed={selectedOption === option}`, `aria-live="polite"` region per annunci cambio domanda, e `role="radiogroup"` per le opzioni. |

---

## ⚡ PROBLEMI DI PERFORMANCE PERCEPITA

### 18. Animazioni Troppo Lente in Alcuni Casi
| | |
|---|---|
| **Area** | Flashcard.tsx |
| **Problema** | L'animazione di flip della flashcard dura 1.2s con spring physics. Questo può sentirsi lento durante sessioni di studio intensive. |
| **Criticità** | 🟢 **BASSA** |
| **Suggerimento** | Ridurre a 600-800ms o aggiungere impostazione utente per velocità animazioni. Il commento nel codice dice "Più lento come richiesto" - verificare se è un requisito validato con utenti. |
| **Codice** | Flashcard.tsx:160 - `duration: 1.2` |

### 19. Loading State Troppo Generico
| | |
|---|---|
| **Area** | App.tsx - PageLoader |
| **Problema** | Il fallback di Suspense mostra solo uno spinner generico. Non c'è indicazione di cosa si sta caricando o progresso. |
| **Criticità** | 🟢 **BASSA** |
| **Suggerimento** | Usare skeleton screens specifiche per pagina (es: impostazioni hanno già skeletons). Mostrare nome della sezione che si sta caricando. |

---

## ✅ PUNTI DI FORZA (da Mantenere)

1. **Design System Coerente**: Ottimo uso di CSS custom properties per temi, palette colori ben definita, glassmorphism ben implementato
2. **Supporto Tastiera**: Buona attenzione agli shortcut (anche se migliorabili nella scoperta)
3. **Feedback Haptico**: Uso di `navigator.vibrate()` per feedback tattile su mobile
4. **Session Complete**: Eccellente schermata di riepilogo con statistiche dettagliate e wrong answers expandable
5. **Responsive Design**: Layout che si adatta bene a diversi breakpoint
6. **Transizioni Fluidi**: Animazioni con Framer Motion ben calibrate (tranne casi specifici)

---

## 📋 RACCOMANDAZIONI PRIORITARIE

### 🔴 Priorità Alta (Risolvere Subito)
1. **Implementare stato review fisso** in QuizView con richiesta esplicita per continuare
2. **Aggiungere navigazione domande** con indicatori cliccabili
3. **Bloccare timer** al completamento sessione
4. **Migliorare distinzione risposte** con icone per accessibilità

### 🟡 Priorità Media (Prossimo Sprint)
5. Aggiungere "Non lo so" a tutte le modalità
6. Implementare focus management completo
7. Aggiornare URL con stato domanda corrente
8. Verificare e fixare touch target mobile

### 🟢 Priorità Bassa (Backlog)
9. Consolidare componenti card duplicati
10. Aggiungere help shortcut scopribile
11. Ottimizzare velocità animazioni
12. Migliorare skeleton loading

---

## 📚 RIFERIMENTI

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Nielsen's 10 Usability Heuristics**: https://www.nngroup.com/articles/ten-usability-heuristics/
- **Material Design**: https://m3.material.io/
- **Apple HIG**: https://developer.apple.com/design/human-interface-guidelines/

---

**Report preparato da:** UX/UI Design Review  
**Prossima revisione consigliata:** Dopo implementazione punti critici
