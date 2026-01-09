import React from 'react';
import { HeroStats } from './HeroStats';
import { MentalStateIndicator, type MentalState } from './MentalState';

interface DashboardHeroProps {
    totalDecks: number;
    totalCards: number;
    dueCards: number;
    masteredDecks: number;
    mentalState: MentalState;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
    totalDecks,
    totalCards,
    dueCards,
    masteredDecks,
    mentalState,
}) => {
    return (
        <>
            <HeroStats
                totalDecks={totalDecks}
                totalCards={totalCards}
                dueCards={dueCards}
                masteredDecks={masteredDecks}
            />
            <MentalStateIndicator mentalState={mentalState} />
        </>
    );
};

export type { MentalState } from './MentalState';
