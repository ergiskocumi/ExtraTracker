/**
 * 🎓 DASHBOARD TUTORIAL - Definizione tutorial per la Dashboard
 * 
 * Guida l'utente attraverso le funzionalità principali della dashboard:
 * - Saluto personalizzato
 * - Statistiche
 * - Quick actions
 * - Menu utente
 */

import type { TutorialConfig } from '../../../../shared/context/TutorialContext';

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
            description: 'Il saluto cambia in base all\'ora del giorno. Qui puoi vedere le tue statistiche principali e il tuo livello.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'stats',
            target: '[data-tutorial="stats"]',
            title: 'Statistiche Rapide',
            description: 'Queste card mostrano le tue statistiche giornaliere e settimanali: tempo studiato, obiettivi completati e progressi.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'quick-actions',
            target: '[data-tutorial="quick-actions"]',
            title: 'Azioni Rapide',
            description: 'Accedi velocemente alle funzionalità principali: crea un obiettivo, inizia a studiare o visualizza i tuoi progressi.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'user-menu',
            target: '[data-tutorial="user-menu"]',
            title: 'Menu Utente',
            description: 'Clicca qui per accedere al tuo profilo, alle impostazioni, ai tuoi progressi e per disconnetterti. Puoi anche vedere il tuo livello e XP!',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'complete',
            target: 'body',
            title: '🎉 Tour Completato!',
            description: 'Ora conosci le basi della dashboard. Esplora le altre sezioni come Flashcards e Obiettivi per scoprire tutte le funzionalità di Silvi!',
            position: 'center',
            highlightPadding: 0,
        },
    ],
};
