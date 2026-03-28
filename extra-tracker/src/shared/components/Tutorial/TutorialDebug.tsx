/**
 * 🎓 TUTORIAL DEBUG - Componente per debug e reset tutorial
 * 
 * Solo per sviluppo - mostra lo stato del tutorial e permette di resettarlo
 */

import React from 'react';
import { useTutorial } from '../../context/TutorialContext';
import { Trash2, Play } from 'lucide-react';

export const TutorialDebug: React.FC = () => {
    const { state, currentConfig, startTutorial, isTutorialCompleted: _isTutorialCompleted } = useTutorial();

    const handleReset = (tutorialId: string) => {
        try {
            const saved = localStorage.getItem('tutorial-completed');
            if (saved) {
                const completed = JSON.parse(saved) as string[];
                const filtered = completed.filter(id => id !== tutorialId);
                localStorage.setItem('tutorial-completed', JSON.stringify(filtered));
                console.log(`🔄 Tutorial ${tutorialId} resettato`);
                window.location.reload(); // Ricarica per applicare il reset
            }
        } catch (err) {
            console.error('Errore reset tutorial:', err);
        }
    };

    if (!import.meta.env.DEV) {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 z-50 p-4 bg-black/90 border border-white/20 rounded-xl text-xs text-white max-w-xs">
            <div className="font-bold mb-2">🎓 Tutorial Debug</div>
            <div className="space-y-1 mb-3">
                <div>Active: {state.isActive ? '✅' : '❌'}</div>
                <div>Tutorial: {state.currentTutorial || 'Nessuno'}</div>
                <div>Step: {state.currentStep + 1}</div>
                <div>Config: {currentConfig?.name || 'Nessuno'}</div>
            </div>
            <div className="space-y-2">
                <button
                    onClick={() => handleReset('dashboard-tutorial')}
                    className="w-full flex items-center gap-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300"
                >
                    <Trash2 className="w-3 h-3" />
                    Reset Dashboard Tutorial
                </button>
                <button
                    onClick={() => startTutorial('dashboard-tutorial')}
                    className="w-full flex items-center gap-2 px-2 py-1 bg-primary-500/20 hover:bg-primary-500/30 rounded text-primary-300"
                >
                    <Play className="w-3 h-3" />
                    Avvia Dashboard Tutorial
                </button>
            </div>
        </div>
    );
};
