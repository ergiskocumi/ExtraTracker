import { useMemo } from 'react';
import { AlertCircle, Sparkles, Play, Plus, BookOpen } from 'lucide-react';
import type { Deck } from '../services/studyService';
import type { Folder } from '../services/foldersService';

export type FilterType = 'all' | 'due' | 'mastered' | 'recent';

interface UseDashboardCalculationsProps {
    decks: Deck[];
    folders: Folder[];
    filter: FilterType;
    searchQuery: string;
    selectedFolderId: string | null;
    selectedTags: string[];
    completedExamIds?: string[]; // IDs degli esami completati (passed/failed/archived)
}

export const useDashboardCalculations = ({
    decks,
    folders,
    filter,
    searchQuery,
    selectedFolderId,
    selectedTags,
    completedExamIds = [],
}: UseDashboardCalculationsProps) => {
    // Filtra i deck escludendo quelli degli esami completati
    const activeDecks = useMemo(() => {
        if (completedExamIds.length === 0) return decks;
        return decks.filter(deck => !deck.examId || !completedExamIds.includes(deck.examId));
    }, [decks, completedExamIds]);
    // Calcola statistiche per cartella
    const folderStats = useMemo(() => {
        const statsMap = new Map<string, {
            totalCards: number;
            dueCards: number;
            masteryPercent: number;
            totalDecks: number;
        }>();

        // Inizializza tutte le cartelle
        const allFolderIds = new Set<string>();
        folders.forEach(f => {
            allFolderIds.add(f.id);
            if (f.children) {
                f.children.forEach(c => allFolderIds.add(c.id));
            }
        });

        allFolderIds.forEach(folderId => {
            statsMap.set(folderId, {
                totalCards: 0,
                dueCards: 0,
                masteryPercent: 0,
                totalDecks: 0,
            });
        });

        // Calcola statistiche dai deck (solo quelli attivi, escludendo esami completati)
        activeDecks.forEach(deck => {
            if (!deck.folderId) return;
            
            const stats = statsMap.get(deck.folderId);
            if (!stats) return;

            const total = deck.totalCards ?? deck.cards?.length ?? 0;
            const due = deck.dueCount ?? 0;
            const mastered = deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
            const mastery = total > 0 ? Math.round((mastered / total) * 100) : 0;

            stats.totalCards += total;
            stats.dueCards += due;
            stats.totalDecks += 1;
            
            // Mastery percent è la media ponderata
            const oldMastery = stats.masteryPercent;
            const oldTotal = stats.totalCards - total;
            if (oldTotal + total > 0) {
                stats.masteryPercent = Math.round(
                    ((oldMastery * oldTotal) + (mastery * total)) / (oldTotal + total)
                );
            }
        });

        return statsMap;
    }, [activeDecks, folders]);

    // Calcola mazzi prioritari per oggi (solo quelli attivi)
    const todayPriorityDecks = useMemo(() => {
        return activeDecks
            .filter(deck => (deck.dueCount ?? 0) > 0)
            .map(deck => {
                const total = deck.totalCards ?? deck.cards?.length ?? 0;
                const due = deck.dueCount ?? 0;
                const ratio = total > 0 ? due / total : 0;
                return {
                    deck,
                    priority: ratio > 0.5 ? 'high' as const : ratio > 0.2 ? 'medium' as const : 'low' as const,
                    dueCount: due,
                    totalCards: total,
                };
            })
            .sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                }
                return b.dueCount - a.dueCount;
            })
            .slice(0, 3);
    }, [activeDecks]);

    // Calcola statistiche per ogni giorno della settimana (Lunedi-Domenica)
    const weeklyStudyPlan = useMemo(() => {
        const today = new Date();
        const todayDay = today.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
        // Calcola offset per portare Lunedi come giorno 0
        const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() + mondayOffset);
        startOfWeek.setHours(0, 0, 0, 0);

        const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
        const weekData = weekDays.map((dayName, index) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);
            const dayStart = new Date(dayDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(23, 59, 59, 999);

            let dueCards = 0;
            let newCards = 0;
            let completedCards = 0;

            activeDecks.forEach(deck => {
                if (!deck.cards || deck.cards.length === 0) return;

                deck.cards.forEach(card => {
                    const reviewDate = card.nextReviewDate ? new Date(card.nextReviewDate) : null;

                    if (reviewDate && reviewDate >= dayStart && reviewDate <= dayEnd && card.status !== 'mastered') {
                        dueCards++;
                    }

                    if (card.status === 'new' && reviewDate && reviewDate >= dayStart && reviewDate <= dayEnd) {
                        newCards++;
                    }

                    if (card.status === 'mastered' && reviewDate && reviewDate >= dayStart && reviewDate <= dayEnd) {
                        completedCards++;
                    }
                });
            });

            // isToday: confronta la data del giorno con oggi
            const isSameDay =
                dayDate.getFullYear() === today.getFullYear() &&
                dayDate.getMonth() === today.getMonth() &&
                dayDate.getDate() === today.getDate();

            return {
                dayName,
                date: dayDate,
                dueCards,
                newCards,
                completedCards,
                isToday: isSameDay,
            };
        });

        return weekData;
    }, [activeDecks]);

    // Calcola i prossimi passi guidati
    const nextSteps = useMemo(() => {
        const steps: Array<{
            id: string;
            title: string;
            description: string;
            action: () => void;
            estimatedTime: string;
            priority: 'high' | 'medium' | 'low';
            icon: React.ElementType;
            color: string;
            deckId?: string;
            actionType: 'study' | 'magic-generate' | 'create-deck' | 'enrich-deck';
        }> = [];

        const urgentDecks = activeDecks.filter(deck => {
            const total = deck.totalCards ?? deck.cards?.length ?? 0;
            const due = deck.dueCount ?? 0;
            return total > 0 && due > 0 && (due / total) > 0.5;
        });

        if (urgentDecks.length > 0) {
            const totalUrgentCards = urgentDecks.reduce((sum, d) => sum + (d.dueCount ?? 0), 0);
            const estimatedMinutes = Math.round((totalUrgentCards * 30) / 60);
            steps.push({
                id: 'review-urgent',
                title: `Ripassa ${totalUrgentCards} carte urgenti`,
                description: `${urgentDecks.length} ${urgentDecks.length === 1 ? 'mazzo ha' : 'mazzi hanno'} più del 50% di carte da ripassare`,
                action: () => {},
                deckId: urgentDecks[0].id,
                actionType: 'study' as const,
                estimatedTime: estimatedMinutes > 60 ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m` : `${estimatedMinutes}m`,
                priority: 'high',
                icon: AlertCircle,
                color: 'amber',
            });
        }

        const emptyDecks = activeDecks.filter(deck => (deck.totalCards ?? deck.cards?.length ?? 0) === 0);
        if (emptyDecks.length > 0) {
            steps.push({
                id: 'start-empty',
                title: `Genera carte per ${emptyDecks.length} ${emptyDecks.length === 1 ? 'mazzo vuoto' : 'mazzi vuoti'}`,
                description: emptyDecks.length === 1 
                    ? `"${emptyDecks[0].title}" è pronto per essere popolato`
                    : `${emptyDecks.length} mazzi sono pronti per essere popolati`,
                action: () => {},
                deckId: emptyDecks[0].id,
                actionType: 'magic-generate' as const,
                estimatedTime: '5-10m',
                priority: emptyDecks.length > 2 ? 'high' : 'medium',
                icon: Sparkles,
                color: 'violet',
            });
        }

        const inProgressDecks = activeDecks.filter(deck => {
            const total = deck.totalCards ?? deck.cards?.length ?? 0;
            const due = deck.dueCount ?? 0;
            return total > 0 && due > 0 && due < total * 0.5;
        });

        if (inProgressDecks.length > 0 && urgentDecks.length === 0) {
            const totalCards = inProgressDecks.reduce((sum, d) => sum + (d.dueCount ?? 0), 0);
            const estimatedMinutes = Math.round((totalCards * 30) / 60);
            steps.push({
                id: 'continue-progress',
                title: `Continua ${inProgressDecks.length} ${inProgressDecks.length === 1 ? 'mazzo' : 'mazzi'} in corso`,
                description: `${totalCards} carte da ripassare`,
                action: () => {},
                deckId: inProgressDecks[0].id,
                actionType: 'study' as const,
                estimatedTime: estimatedMinutes > 60 ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m` : `${estimatedMinutes}m`,
                priority: 'medium',
                icon: Play,
                color: 'blue',
            });
        }

        if (activeDecks.length === 0 || (activeDecks.length < 5 && emptyDecks.length === 0)) {
            steps.push({
                id: 'create-deck',
                title: 'Crea il tuo primo mazzo',
                description: activeDecks.length === 0 
                    ? 'Inizia organizzando il tuo materiale di studio'
                    : 'Aggiungi un nuovo argomento da studiare',
                action: () => {},
                actionType: 'create-deck' as const,
                estimatedTime: '2m',
                priority: activeDecks.length === 0 ? 'high' : 'low',
                icon: Plus,
                color: 'violet',
            });
        }

        const decksWithCards = activeDecks.filter(deck => (deck.totalCards ?? deck.cards?.length ?? 0) > 0);
        if (decksWithCards.length > 0 && decksWithCards.length < 10) {
            const deckToEnrich = decksWithCards.find(d => (d.totalCards ?? 0) < 20) || decksWithCards[0];
            if (deckToEnrich) {
                steps.push({
                    id: 'enrich-deck',
                    title: `Aggiungi carte a "${deckToEnrich.title}"`,
                    description: `Espandi il mazzo con nuovo materiale`,
                    action: () => {},
                    deckId: deckToEnrich.id,
                    actionType: 'enrich-deck' as const,
                    estimatedTime: '5-10m',
                    priority: 'low',
                    icon: BookOpen,
                    color: 'blue',
                });
            }
        }

        return steps.slice(0, 4);
    }, [activeDecks]);

    // Filtered decks (solo quelli attivi)
    const filteredDecks = useMemo(() => {
        let result = [...activeDecks];

        if (selectedFolderId !== null) {
            result = result.filter(d => d.folderId === selectedFolderId);
        }

        if (selectedTags.length > 0) {
            result = result.filter(d => {
                const deckTags = d.tags || [];
                return selectedTags.every(selectedTag => 
                    deckTags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
                );
            });
        }

        switch (filter) {
            case 'due':
                result = result
                    .filter(d => (d.dueCount ?? 0) > 0)
                    .sort((a, b) => {
                        // Ordina per numero di carte da ripassare (decrescente), poi per data creazione (più recente prima)
                        const dueDiff = (b.dueCount ?? 0) - (a.dueCount ?? 0);
                        if (dueDiff !== 0) return dueDiff;
                        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return bTime - aTime;
                    });
                break;
            case 'mastered':
                result = result
                    .filter(d => {
                        const total = d.totalCards ?? d.cards?.length ?? 0;
                        const mastered = d.cards?.filter(c => c.status === 'mastered').length ?? 0;
                        return total > 0 && mastered === total;
                    })
                    .sort((a, b) => {
                        // Ordina per data creazione (più recente prima)
                        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return bTime - aTime;
                    });
                break;
            case 'recent':
                result = result
                    .filter(d => d.createdAt && new Date(d.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
                    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
                break;
            case 'all':
            default:
                // Ordina per data creazione (più recente prima) - DEFAULT
                result.sort((a, b) => {
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime;
                });
                break;
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(d => 
                d.title.toLowerCase().includes(query) ||
                d.description?.toLowerCase().includes(query) ||
                d.tags?.some(tag => tag.toLowerCase().includes(query))
            );
            // Mantieni l'ordinamento anche dopo la ricerca
            result.sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            });
        }

        return result;
    }, [activeDecks, filter, searchQuery, selectedFolderId, selectedTags]);

    // Computed stats (solo per deck attivi)
    const totalCards = activeDecks.reduce((sum, d) => sum + (d.totalCards ?? d.cards?.length ?? 0), 0);
    const masteredDecks = activeDecks.filter(d => {
        const total = d.totalCards ?? d.cards?.length ?? 0;
        const mastered = d.cards?.filter(c => c.status === 'mastered').length ?? 0;
        return total > 0 && mastered === total;
    }).length;

    return {
        folderStats,
        todayPriorityDecks,
        weeklyStudyPlan,
        nextSteps,
        filteredDecks,
        totalCards,
        masteredDecks,
    };
};
