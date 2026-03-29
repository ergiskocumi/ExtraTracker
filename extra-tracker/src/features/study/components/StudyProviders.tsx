/**
 * 📚 STUDY PROVIDERS - Wrapper per le pagine di studio
 * 
 * Ottimizzazione performance:
 * - FlashcardGenerationProvider è disponibile solo dove serve (/study/*)
 * - Evita il re-mounting ad ogni cambio di rotta protetta
 */

import type { ReactNode } from 'react';
import { FlashcardGenerationProvider } from '../context/FlashcardGenerationContext';
import { FloatingGenerationIndicator } from './Generation';

interface StudyProvidersProps {
    children: ReactNode;
}

/**
 * Wrapper che fornisce i provider specifici per le feature di studio.
 * Da usare nelle pagine: DecksDashboardPage, DeckDetailPage, StudySessionPage, CinemaPage
 */
export const StudyProviders: React.FC<StudyProvidersProps> = ({ children }) => {
    return (
        <FlashcardGenerationProvider>
            {children}
            <FloatingGenerationIndicator />
        </FlashcardGenerationProvider>
    );
};

export default StudyProviders;
