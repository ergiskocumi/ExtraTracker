import { useMemo } from 'react';
import type { Deck } from '../services/studyService';
import type { Folder } from '../services/foldersService';

// ============================================
// TYPES
// ============================================

export interface FolderSection {
    folder: Folder;
    decks: Deck[];
    stats: {
        totalCards: number;
        dueCards: number;
        masteryPercent: number;
        totalDecks: number;
    };
}

export interface OrganizedDecks {
    priorityDecks: Deck[];       // Con dueCount > 0
    pinnedDecks: Deck[];         // Da implementare (campo `pinned: boolean`)
    folders: FolderSection[];    // Organizzati per cartella
    uncategorized: Deck[];        // Senza folderId
}

// ============================================
// HELPERS
// ============================================

const calculateFolderStats = (decks: Deck[]) => {
    let totalCards = 0;
    let dueCards = 0;
    let totalMastered = 0;
    let totalCardsForMastery = 0;

    decks.forEach(deck => {
        const total = deck.totalCards ?? deck.cards?.length ?? 0;
        const due = deck.dueCount ?? 0;
        const mastered = deck.cards?.filter(c => c.status === 'mastered').length ?? 0;

        totalCards += total;
        dueCards += due;
        totalMastered += mastered;
        totalCardsForMastery += total;
    });

    const masteryPercent = totalCardsForMastery > 0
        ? Math.round((totalMastered / totalCardsForMastery) * 100)
        : 0;

    return {
        totalCards,
        dueCards,
        masteryPercent,
        totalDecks: decks.length,
    };
};

// ============================================
// HOOK
// ============================================

export const useOrganizedDecks = (
    decks: Deck[],
    folders: Folder[]
): OrganizedDecks => {
    return useMemo(() => {
        // 1. Priority Decks (con carte da ripassare)
        const priorityDecks = decks
            .filter(d => (d.dueCount ?? 0) > 0)
            .sort((a, b) => (b.dueCount || 0) - (a.dueCount || 0));

        // 2. Pinned Decks (preferiti)
        const pinnedDecks = decks
            .filter(d => d.pinned === true)
            .sort((a, b) => {
                // Ordina per updatedAt o createdAt
                const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 
                            a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 
                            b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            });

        // 3. Organizzati per Cartella
        const foldersMap = new Map<string, Deck[]>();
        const uncategorized: Deck[] = [];

        decks.forEach(deck => {
            // Escludi i deck già nelle sezioni speciali
            const isInPriority = priorityDecks.some(d => d.id === deck.id);
            const isPinned = pinnedDecks.some(d => d.id === deck.id);

            if (isInPriority || isPinned) {
                return; // Skip, già in una sezione speciale
            }

            if (deck.folderId) {
                if (!foldersMap.has(deck.folderId)) {
                    foldersMap.set(deck.folderId, []);
                }
                foldersMap.get(deck.folderId)!.push(deck);
            } else {
                uncategorized.push(deck);
            }
        });

        // Crea le sezioni per cartella
        const folderSections: FolderSection[] = folders
            .filter(f => foldersMap.has(f.id))
            .map(folder => ({
                folder,
                decks: foldersMap.get(folder.id)!.sort((a, b) => {
                    // Ordina i deck nella cartella dal più recente al più vecchio
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime;
                }),
                stats: calculateFolderStats(foldersMap.get(folder.id)!),
            }))
            .sort((a, b) => {
                // Ordina per nome cartella
                return a.folder.name.localeCompare(b.folder.name);
            });

        // Ordina anche i deck non categorizzati dal più recente al più vecchio
        const sortedUncategorized = uncategorized.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        });

        return {
            priorityDecks,
            pinnedDecks,
            folders: folderSections,
            uncategorized: sortedUncategorized,
        };
    }, [decks, folders]);
};
