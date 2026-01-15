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
    recentSessions: Deck[];      // Ultimi 3-4 mazzi aperti
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
        const now = Date.now();
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

        // 1. Recent Sessions (ultimi 3-4 aperti, ordinati per updatedAt)
        const recentSessions = decks
            .filter(d => {
                if (!d.updatedAt) return false;
                const updatedTime = new Date(d.updatedAt).getTime();
                return updatedTime > oneWeekAgo;
            })
            .sort((a, b) => {
                const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, 4);

        // 2. Priority Decks (con carte da ripassare)
        const priorityDecks = decks
            .filter(d => (d.dueCount ?? 0) > 0)
            .sort((a, b) => (b.dueCount || 0) - (a.dueCount || 0));

        // 3. Pinned Decks (preferiti)
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

        // 4. Organizzati per Cartella
        const foldersMap = new Map<string, Deck[]>();
        const uncategorized: Deck[] = [];

        decks.forEach(deck => {
            // Escludi i deck già nelle sezioni speciali
            const isInRecent = recentSessions.some(d => d.id === deck.id);
            const isInPriority = priorityDecks.some(d => d.id === deck.id);
            const isPinned = pinnedDecks.some(d => d.id === deck.id);

            if (isInRecent || isInPriority || isPinned) {
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
            recentSessions,
            priorityDecks,
            pinnedDecks,
            folders: folderSections,
            uncategorized: sortedUncategorized,
        };
    }, [decks, folders]);
};
