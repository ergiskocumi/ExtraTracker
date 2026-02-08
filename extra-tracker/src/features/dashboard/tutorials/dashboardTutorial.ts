/**
 * 🎓 DASHBOARD TUTORIAL - Definizione tutorial per la Dashboard
 * 
 * Guida l'utente attraverso le funzionalità principali della dashboard:
 * - Saluto personalizzato
 * - Mazzi recenti
 * - Prossimi esami
 * - Menu utente
 */

import type { TutorialConfig } from '../../../shared/context/TutorialContext';

export const dashboardTutorial: TutorialConfig = {
    id: 'dashboard-tutorial',
    name: 'Tour Dashboard',
    autoStart: true,
    skipable: true,
    steps: [
        {
            id: 'welcome',
            target: 'body',
            title: '👋 Benvenuto in Silvi!',
            description: 'Ti guideremo attraverso le funzionalità principali della dashboard. Clicca "Avanti" per iniziare il tour.',
            position: 'center',
            highlightPadding: 0,
        },
        {
            id: 'greeting',
            target: '[data-tutorial="greeting"]',
            title: 'Saluto Personalizzato',
            description: 'Il saluto cambia in base all\'ora del giorno. Qui trovi un riepilogo rapido della tua giornata.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'recent-decks',
            target: '[data-tutorial="recent-decks"]',
            title: 'Mazzi recenti',
            description: 'Qui trovi gli ultimi mazzi aggiornati con azione rapida per ripassare.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'upcoming-exams',
            target: '[data-tutorial="upcoming-exams"]',
            title: 'Prossimi esami',
            description: 'Questa sezione mostra gli esami in arrivo con i giorni rimanenti.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'exams-cta',
            target: '[data-tutorial="exams-cta"]',
            title: 'Vai agli esami',
            description: 'Accedi rapidamente alla sezione esami per gestire e studiare.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'user-menu',
            target: '[data-tutorial="user-menu"]',
            title: 'Menu Utente',
            description: 'Clicca qui per accedere al tuo profilo, alle impostazioni e per disconnetterti.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'complete',
            target: 'body',
            title: '🎉 Tour Completato!',
            description: 'Ora conosci le basi della dashboard. Esplora Flashcards ed esami per scoprire tutte le funzionalità di Silvi!',
            position: 'center',
            highlightPadding: 0,
        },
    ],
};
