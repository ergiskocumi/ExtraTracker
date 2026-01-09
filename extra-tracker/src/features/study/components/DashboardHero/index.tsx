import React from 'react';
import { HeroStats } from './HeroStats';
import { MentalStateIndicator, type MentalStateData } from './MentalState';

interface DashboardHeroProps {
    totalDecks: number;
    totalCards: number;
    dueCards: number;
    masteredDecks: number;
    mentalState: MentalStateData;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
    totalDecks,
    totalCards,
    dueCards,
    masteredDecks,
    mentalState,
}) => {
    return (
        <div className="w-full max-w-6xl px-2 mx-auto sm:px-4 space-y-4">
            <HeroStats
                totalDecks={totalDecks}
                totalCards={totalCards}
                dueCards={dueCards}
                masteredDecks={masteredDecks}
            />
            {/* Mental State Card - Compact with proper spacing */}
            <div className="mb-6 sm:mb-8">
                <MentalStateIndicator mentalState={mentalState} />
            </div>
        </div>
    );
};

export type { MentalState } from './MentalState';
