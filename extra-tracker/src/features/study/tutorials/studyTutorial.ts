/**
 * 🎓 STUDY TUTORIAL - Definizione tutorial per la pagina Study/Flashcards
 * 
 * Guida l'utente attraverso:
 * - Creazione di un nuovo mazzo
 * - Visualizzazione dei mazzi esistenti
 * - Modalità di studio
 */

import type { TutorialConfig } from '../../../../shared/context/TutorialContext';

export const studyTutorial: TutorialConfig = {
    id: 'study-tutorial',
    name: 'Tour Flashcards',
    autoStart: false,
    skipable: true,
    steps: [
        {
            id: 'welcome',
            target: 'body',
            title: '📚 Benvenuto nella sezione Flashcards!',
            description: 'Qui puoi creare e gestire i tuoi mazzi di flashcard per studiare in modo efficace. Iniziamo il tour!',
            position: 'center',
            highlightPadding: 0,
        },
        {
            id: 'create-deck',
            target: '[data-tutorial="create-deck"]',
            title: 'Crea un Nuovo Mazzo',
            description: 'Clicca qui per creare un nuovo mazzo di flashcard. Puoi aggiungere carte manualmente o usare l\'AI per generarle automaticamente da un PDF.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'deck-list',
            target: '[data-tutorial="deck-list"]',
            title: 'I Tuoi Mazzi',
            description: 'Qui vedi tutti i tuoi mazzi. Puoi cliccare su un mazzo per iniziare a studiare o vedere i dettagli.',
            position: 'top',
            waitForElement: true,
        },
        {
            id: 'complete',
            target: 'body',
            title: '🎉 Tour Completato!',
            description: 'Ora sai come usare i mazzi di flashcard. Crea il tuo primo mazzo e inizia a studiare!',
            position: 'center',
            highlightPadding: 0,
        },
    ],
};
