/**
 * 📚 DECKS DASHBOARD PAGE - User-Friendly Redesign
 * 
 * Redesign completo con focus su UX:
 * - Card grandi e leggibili
 * - Azioni SEMPRE visibili (no hover-only)
 * - Pulsanti touch-friendly (min 44px)
 * - Mobile-first responsive design
 * - Visual hierarchy chiara
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Sparkles, Play, Plus, BookOpen } from 'lucide-react';
import { studyService, type Deck, type CreateDeckPayload, type AddCardPayload } from '../services/studyService';
import { foldersService, type Folder } from '../services/foldersService';
import { tagsService, type Tag } from '../services/tagsService';
import { emitToast } from '../../../shared/components/toast';
import { CreateDeckModal } from '../components/CreateDeckModal';
import { MagicGenerateModal } from '../components/MagicGenerateModal';
import { StudyModeSelector, type StudyMode } from '../components/StudyModeSelector';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
// FolderTree e TagCloud sono usati in DashboardSidebar
import { DashboardHero } from '../components/DashboardHero';
import { TodayPlan } from '../components/TodayPlan';
import { StudyTimeline } from '../components/StudyTimeline';
import { NextSteps } from '../components/NextSteps';
import { DeckGrid } from '../components/DeckGrid';
import { DashboardEmptyState } from '../components/DashboardEmptyState';
import { FilterBar } from '../components/FilterBar';
import { AddCardModal } from '../components/AddCardModal';
import { DeckSkeleton } from '../components/DeckSkeleton';
import { DeckCard } from '../components/DeckCard';
import { DashboardLayout } from '../components/DashboardLayout';

// ============================================
// TYPES
// ============================================

type FilterType = 'all' | 'due' | 'mastered' | 'recent';

// DeckTheme e DeckCard sono stati estratti in componenti separati

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export const DecksDashboardPage: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [decks, setDecks] = useState<Deck[]>([]);
    const [dueCardCount, setDueCardCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Organization state
    const [folders, setFolders] = useState<Folder[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
    const [isMagicGenerateOpen, setIsMagicGenerateOpen] = useState(false);
    const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
    const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
    const [isStudyModeOpen, setIsStudyModeOpen] = useState(false);
    const [studyDeck, setStudyDeck] = useState<Deck | null>(null);

    // Computed stats
    const totalCards = decks.reduce((sum, d) => sum + (d.totalCards ?? d.cards?.length ?? 0), 0);
    const masteredDecks = decks.filter(d => {
        const total = d.totalCards ?? d.cards?.length ?? 0;
        const mastered = d.cards?.filter(c => c.status === 'mastered').length ?? 0;
        return total > 0 && mastered === total;
    }).length;

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

        // Calcola statistiche dai deck
        decks.forEach(deck => {
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
    }, [decks, folders]);

    // Calcola mazzi prioritari per oggi (con carte da ripassare, ordinati per priorità)
    const todayPriorityDecks = useMemo(() => {
        return decks
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
                // Ordina per priorità (high > medium > low) e poi per numero di carte da ripassare
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                }
                return b.dueCount - a.dueCount;
            })
            .slice(0, 3); // Mostra solo i top 3
    }, [decks]);

    // Calcola statistiche per ogni giorno della settimana
    const weeklyStudyPlan = useMemo(() => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Domenica
        startOfWeek.setHours(0, 0, 0, 0);

        const weekDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
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

            decks.forEach(deck => {
                if (!deck.cards || deck.cards.length === 0) return;

                deck.cards.forEach(card => {
                    const reviewDate = card.nextReviewDate ? new Date(card.nextReviewDate) : null;

                    // Carte da ripassare (con scadenza in questo giorno o prima)
                    if (reviewDate && reviewDate >= dayStart && reviewDate <= dayEnd && card.status !== 'mastered') {
                        dueCards++;
                    }

                    // Nuove carte (status 'new')
                    if (card.status === 'new' && reviewDate && reviewDate >= dayStart && reviewDate <= dayEnd) {
                        newCards++;
                    }

                    // Carte completate (mastered) con review date in questo giorno
                    if (card.status === 'mastered' && reviewDate && reviewDate >= dayStart && reviewDate <= dayEnd) {
                        completedCards++;
                    }
                });
            });

            return {
                dayName,
                date: dayDate,
                dueCards,
                newCards,
                completedCards,
                isToday: index === today.getDay(),
            };
        });

        return weekData;
    }, [decks]);

    // Calcola lo stato mentale basato su vari fattori
    const calculateMentalState = useMemo(() => {
        // Fattori che influenzano lo stato mentale:
        // 1. Numero di carte da ripassare (più carte = più stress)
        // 2. Tempo trascorso dall'ultima sessione (più tempo = più recupero)
        // 3. Percentuale di padronanza complessiva (più padronanza = meno stress)
        // 4. Numero di mazzi attivi (più mazzi = più carico cognitivo)
        
        const totalCards = decks.reduce((sum, deck) => sum + (deck.totalCards ?? deck.cards?.length ?? 0), 0);
        const dueCards = decks.reduce((sum, deck) => sum + (deck.dueCount ?? 0), 0);
        const masteredCards = decks.reduce((sum, deck) => {
            const mastered = deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
            return sum + mastered;
        }, 0);
        
        if (totalCards === 0) {
            return {
                percentage: 100,
                state: 'fresco' as const,
                message: 'Pronto per iniziare!',
                color: 'emerald' as const,
                suggestion: 'Crea il tuo primo mazzo e inizia a studiare',
            };
        }
        
        // Calcola stress basato su carte da ripassare
        const dueRatio = totalCards > 0 ? dueCards / totalCards : 0;
        const stressFromDue = Math.min(100, dueRatio * 100);
        
        // Calcola recupero basato su padronanza
        const masteryRatio = totalCards > 0 ? masteredCards / totalCards : 0;
        const recoveryFromMastery = masteryRatio * 30; // Max 30% di recupero
        
        // Calcola carico cognitivo basato su numero di mazzi
        const activeDecks = decks.filter(d => (d.totalCards ?? 0) > 0).length;
        const cognitiveLoad = Math.min(20, activeDecks * 2); // Max 20% di carico
        
        // Calcola stato mentale finale (100% = fresco, 0% = esaurito)
        let mentalState = 100;
        mentalState -= stressFromDue * 0.5; // Le carte da ripassare riducono lo stato mentale
        mentalState += recoveryFromMastery; // La padronanza aumenta lo stato mentale
        mentalState -= cognitiveLoad; // Più mazzi = più carico
        
        // Normalizza tra 0 e 100
        mentalState = Math.max(0, Math.min(100, mentalState));
        
        // Determina stato e suggerimenti
        let state: 'fresco' | 'attivo' | 'stanco' | 'esaurito';
        let message: string;
        let color: 'emerald' | 'blue' | 'amber' | 'rose';
        let suggestion: string;
        
        if (mentalState >= 75) {
            state = 'fresco';
            message = 'Pronto e concentrato';
            color = 'emerald';
            suggestion = 'Ottimo momento per studiare!';
        } else if (mentalState >= 50) {
            state = 'attivo';
            message = 'Buona forma mentale';
            color = 'blue';
            suggestion = 'Continua così, ma fai attenzione ai segnali di stanchezza';
        } else if (mentalState >= 25) {
            state = 'stanco';
            message = 'Inizia a sentire la fatica';
            color = 'amber';
            suggestion = 'Considera una pausa breve (10-15 minuti)';
        } else {
            state = 'esaurito';
            message = 'Hai bisogno di riposo';
            color = 'rose';
            suggestion = 'Fai una pausa lunga (30+ minuti) o riposa per oggi';
        }
        
        return {
            percentage: Math.round(mentalState),
            state,
            message,
            color,
            suggestion,
        };
    }, [decks]);

    // Calcola i prossimi passi guidati basati sullo stato attuale
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

        // Passo 1: Ripassa carte urgenti
        const urgentDecks = decks.filter(deck => {
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
                action: () => {
                    // Sarà gestito nel componente UI
                },
                deckId: urgentDecks[0].id,
                actionType: 'study' as const,
                estimatedTime: estimatedMinutes > 60 ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m` : `${estimatedMinutes}m`,
                priority: 'high',
                icon: AlertCircle,
                color: 'amber',
            });
        }

        // Passo 2: Inizia nuovi mazzi vuoti
        const emptyDecks = decks.filter(deck => (deck.totalCards ?? deck.cards?.length ?? 0) === 0);
        if (emptyDecks.length > 0) {
            steps.push({
                id: 'start-empty',
                title: `Genera carte per ${emptyDecks.length} ${emptyDecks.length === 1 ? 'mazzo vuoto' : 'mazzi vuoti'}`,
                description: emptyDecks.length === 1 
                    ? `"${emptyDecks[0].title}" è pronto per essere popolato`
                    : `${emptyDecks.length} mazzi sono pronti per essere popolati`,
                action: () => {
                    // Sarà gestito nel componente UI
                },
                deckId: emptyDecks[0].id,
                actionType: 'magic-generate' as const,
                estimatedTime: '5-10m',
                priority: emptyDecks.length > 2 ? 'high' : 'medium',
                icon: Sparkles,
                color: 'violet',
            });
        }

        // Passo 3: Continua mazzi in corso
        const inProgressDecks = decks.filter(deck => {
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
                action: () => {
                    // Sarà gestito nel componente UI
                },
                deckId: inProgressDecks[0].id,
                actionType: 'study' as const,
                estimatedTime: estimatedMinutes > 60 ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m` : `${estimatedMinutes}m`,
                priority: 'medium',
                icon: Play,
                color: 'blue',
            });
        }

        // Passo 4: Crea nuovo mazzo
        if (decks.length === 0 || (decks.length < 5 && emptyDecks.length === 0)) {
            steps.push({
                id: 'create-deck',
                title: 'Crea il tuo primo mazzo',
                description: decks.length === 0 
                    ? 'Inizia organizzando il tuo materiale di studio'
                    : 'Aggiungi un nuovo argomento da studiare',
                action: () => {
                    // Sarà gestito nel componente UI
                },
                actionType: 'create-deck' as const,
                estimatedTime: '2m',
                priority: decks.length === 0 ? 'high' : 'low',
                icon: Plus,
                color: 'violet',
            });
        }

        // Passo 5: Aggiungi carte a mazzi esistenti
        const decksWithCards = decks.filter(deck => (deck.totalCards ?? deck.cards?.length ?? 0) > 0);
        if (decksWithCards.length > 0 && decksWithCards.length < 10) {
            const deckToEnrich = decksWithCards.find(d => (d.totalCards ?? 0) < 20) || decksWithCards[0];
            if (deckToEnrich) {
                steps.push({
                    id: 'enrich-deck',
                    title: `Aggiungi carte a "${deckToEnrich.title}"`,
                    description: `Espandi il mazzo con nuovo materiale`,
                action: () => {
                    // Sarà gestito nel componente UI
                },
                deckId: deckToEnrich.id,
                actionType: 'enrich-deck' as const,
                    estimatedTime: '5-10m',
                    priority: 'low',
                    icon: BookOpen,
                    color: 'blue',
                });
            }
        }

        return steps.slice(0, 4); // Mostra massimo 4 passi
    }, [decks]);

    // Filtered decks
    const filteredDecks = useMemo(() => {
        let result = [...decks];

        // Filtro per cartella
        if (selectedFolderId !== null) {
            result = result.filter(d => d.folderId === selectedFolderId);
        } else {
            // Se nessuna cartella selezionata, mostra tutti (anche quelli senza cartella)
            // Per mostrare solo quelli senza cartella, usa: result = result.filter(d => !d.folderId);
        }

        // Filtro per tag (AND: tutti i tag selezionati devono essere presenti)
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
                result = result.filter(d => (d.dueCount ?? 0) > 0);
                break;
            case 'mastered':
                result = result.filter(d => {
                    const total = d.totalCards ?? d.cards?.length ?? 0;
                    const mastered = d.cards?.filter(c => c.status === 'mastered').length ?? 0;
                    return total > 0 && mastered === total;
                });
                break;
            case 'recent':
                result = result
                    .filter(d => d.createdAt && new Date(d.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
                    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
                break;
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(d => 
                d.title.toLowerCase().includes(query) ||
                d.description?.toLowerCase().includes(query) ||
                d.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }

        return result;
    }, [decks, filter, searchQuery, selectedFolderId, selectedTags]);

    // Load decks
    const loadDecks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const dashboardData = await studyService.getDashboard();
            setDecks(dashboardData.decks);
            setDueCardCount(dashboardData.dueCardCount);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento');
            emitToast.error('Impossibile caricare i mazzi');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load folders
    const loadFolders = useCallback(async () => {
        try {
            const folderTree = await foldersService.getFolderTree();
            setFolders(folderTree);
        } catch (err: any) {
            console.error('[DecksDashboardPage] loadFolders: Error:', err);
            emitToast.error('Errore nel caricamento delle cartelle');
        }
    }, []);

    // Load tags
    const loadTags = useCallback(async () => {
        try {
            const allTags = await tagsService.getAllTags();
            setTags(allTags);
        } catch (err: any) {
            console.error('[DecksDashboardPage] loadTags: Error:', err);
            emitToast.error('Errore nel caricamento dei tag');
        }
    }, []);

    useEffect(() => {
        const loadAll = async () => {
            try {
                await Promise.all([
                    loadDecks(),
                    loadFolders(),
                    loadTags(),
                ]);
            } catch (err) {
                console.error('[DecksDashboardPage] useEffect: Error loading data:', err);
            }
        };
        loadAll();
    }, [loadDecks, loadFolders, loadTags]);

    // Handlers
    const handleStudy = (deckId: string) => {
        const deck = decks.find(d => d.id === deckId);
        if (!deck) return;
        setStudyDeck(deck);
        setIsStudyModeOpen(true);
    };

    const handleViewDetail = (deckId: string) => {
        navigate(`/study/deck/${deckId}`);
    };

    const handleSplitStudy = (deckId: string) => {
        navigate(`/study/${deckId}/split`);
    };

    const handleAddCard = (deckId: string) => {
        const deck = decks.find(d => d.id === deckId);
        if (deck) {
            setSelectedDeck(deck);
            setIsAddCardModalOpen(true);
        }
    };

    const handleMagicGenerate = (deck: Deck) => {
        setSelectedDeck(deck);
        setIsMagicGenerateOpen(true);
    };

    const handleMagicGenerateSuccess = async (generatedCount: number) => {
        await loadDecks();
        if (generatedCount > 0) {
            emitToast.success(`✅ ${generatedCount} ${generatedCount === 1 ? 'nuova carta aggiunta' : 'nuove carte aggiunte'} al mazzo!`);
        }
    };

    const handleStartSession = (config: { mode: StudyMode; shuffle: boolean; reverse: boolean }) => {
        if (!studyDeck) return;
        const params = new URLSearchParams();
        params.set('mode', config.mode);
        params.set('shuffle', config.shuffle ? 'true' : 'false');
        params.set('reverse', config.reverse ? 'true' : 'false');
        navigate(`/study/${studyDeck.id}/session?${params.toString()}`);
        setIsStudyModeOpen(false);
        setStudyDeck(null);
    };

    const handleDeleteDeck = async () => {
        if (!deletingDeck) return;
        try {
            await studyService.deleteDeck(deletingDeck.id);
            const deckTitle = deletingDeck.title;
            setDeletingDeck(null);
            await loadDecks();
            emitToast.success(`Mazzo "${deckTitle}" eliminato`);
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'eliminazione');
        }
    };

    const handleCreateDeck = async (data: CreateDeckPayload) => {
        const newDeck = await studyService.createDeck(data);
        setDecks(prev => [...prev, newDeck]);
        emitToast.success('Mazzo creato!');
    };

    const handleSubmitCard = async (deckId: string, data: AddCardPayload) => {
        try {
            const updatedDeck = await studyService.addCard(deckId, data);
            setDecks(prev => prev.map(d => d.id === deckId ? updatedDeck : d));
            emitToast.success('Carta aggiunta!');
        } catch (err: any) {
            emitToast.error(err.message);
            throw err;
        }
    };

    // Handlers per organizzazione
    const handleFolderSelect = (folderId: string | null) => {
        setSelectedFolderId(folderId);
    };

    const handleTagToggle = (tagName: string) => {
        setSelectedTags((prev: string[]) => {
            if (prev.includes(tagName)) {
                return prev.filter((t: string) => t !== tagName);
            } else {
                return [...prev, tagName];
            }
        });
    };

    const handleRefreshOrganization = async () => {
        try {
            await Promise.all([
                loadFolders(),
                loadTags(),
                loadDecks(),
            ]);
        } catch (err) {
            console.error('[DecksDashboardPage] handleRefreshOrganization: Error:', err);
        }
    };

    const handleDeckDrop = async (deckId: string, folderId: string | null) => {
        console.log('[DecksDashboardPage] handleDeckDrop: Starting', { deckId, folderId });
        try {
            // Trova il deck corrente per verificare lo stato
            const currentDeck = decks.find(d => d.id === deckId);
            if (!currentDeck) {
                throw new Error('Mazzo non trovato');
            }
            
            console.log('[DecksDashboardPage] handleDeckDrop: Current deck', {
                id: currentDeck.id,
                title: currentDeck.title,
                folderId: currentDeck.folderId,
            });
            
            // Aggiorna il deck
            console.log('[DecksDashboardPage] handleDeckDrop: Calling updateDeckOrganization...');
            const updatedDeck = await studyService.updateDeckOrganization(deckId, { folderId });
            console.log('[DecksDashboardPage] handleDeckDrop: Received updated deck', {
                id: updatedDeck.id,
                title: updatedDeck.title,
                folderId: updatedDeck.folderId,
                hasFolderId: 'folderId' in updatedDeck,
            });
            
            // Aggiorna lo stato locale immediatamente
            setDecks(prev => {
                const updated = prev.map(d => d.id === deckId ? updatedDeck : d);
                console.log('[DecksDashboardPage] handleDeckDrop: Updated local state', {
                    deckCount: updated.length,
                    updatedDeckFolderId: updated.find(d => d.id === deckId)?.folderId,
                });
                return updated;
            });
            
            // Ricarica per sincronizzare
            await Promise.all([
                loadDecks(),
                loadFolders(), // Aggiorna contatori
            ]);
            
            console.log('[DecksDashboardPage] handleDeckDrop: Success');
            emitToast.success(folderId ? 'Mazzo spostato nella cartella' : 'Mazzo spostato nella cartella radice');
        } catch (err: any) {
            console.error('[DecksDashboardPage] handleDeckDrop: Error:', err);
            console.error('[DecksDashboardPage] handleDeckDrop: Error details:', {
                message: err.message,
                stack: err.stack,
                response: err.response?.data,
            });
            emitToast.error(err.message || 'Errore nello spostamento');
        }
    };

    // ========== RENDER ==========

    return (
        <DashboardLayout
            isSidebarOpen={isSidebarOpen}
            onSidebarClose={() => setIsSidebarOpen(false)}
            folders={folders}
            tags={tags}
            selectedFolderId={selectedFolderId}
            selectedTags={selectedTags}
            folderStats={folderStats}
            onFolderSelect={handleFolderSelect}
            onTagToggle={handleTagToggle}
            onDeckDrop={handleDeckDrop}
            onRefresh={handleRefreshOrganization}
            onCreateDeck={() => setIsCreateModalOpen(true)}
        >
            {/* Hero Stats + Stato Mentale */}
            {!isLoading && decks.length > 0 && (
                <DashboardHero
                    totalDecks={decks.length}
                    totalCards={totalCards}
                    dueCards={dueCardCount}
                    masteredDecks={masteredDecks}
                    mentalState={calculateMentalState}
                />
            )}

            {/* Oggi: Cosa Devo Studiare */}
            {!isLoading && todayPriorityDecks.length > 0 && (
                <TodayPlan
                    priorityDecks={todayPriorityDecks}
                    dueCardCount={dueCardCount}
                    onFilterChange={setFilter}
                    onStudy={handleStudy}
                    onViewDetail={handleViewDetail}
                />
            )}

            {/* Timeline di Studio Visiva */}
            {!isLoading && decks.length > 0 && (
                <StudyTimeline
                    weeklyPlan={weeklyStudyPlan}
                    onFilterChange={setFilter}
                />
            )}

            {/* Prossimi Passi Guidati */}
            {!isLoading && nextSteps.length > 0 && (
                <NextSteps
                    steps={nextSteps}
                    decks={decks}
                    onStudy={handleStudy}
                    onFilterChange={setFilter}
                    onMagicGenerate={(deck) => {
                        setSelectedDeck(deck);
                        setIsMagicGenerateOpen(true);
                    }}
                    onCreateDeck={() => setIsCreateModalOpen(true)}
                />
            )}

            {/* Filter & Search */}
            {!isLoading && decks.length > 0 && (
                <FilterBar
                    activeFilter={filter}
                    onFilterChange={setFilter}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    dueCount={decks.filter(d => (d.dueCount ?? 0) > 0).length}
                />
            )}

            {/* ═══ CONTENT ═══ */}
            {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {[...Array(4)].map((_, i) => (
                        <DeckSkeleton key={i} />
                    ))}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <p className="text-white/60 mb-6 text-lg">{error}</p>
                    <button
                        onClick={loadDecks}
                        className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all"
                    >
                        Riprova
                    </button>
                </div>
            ) : decks.length === 0 ? (
                <DashboardEmptyState onCreateDeck={() => setIsCreateModalOpen(true)} />
            ) : filteredDecks.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-white/50 text-lg">
                        Nessun mazzo corrisponde ai filtri
                    </p>
                    <button
                        onClick={() => {
                            setFilter('all');
                            setSearchQuery('');
                        }}
                        className="mt-4 px-4 py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10"
                    >
                        Mostra tutti
                    </button>
                </div>
            ) : (
                <DeckGrid
                    decks={filteredDecks}
                    tags={tags}
                    DeckCardComponent={DeckCard}
                    onStudy={handleStudy}
                    onMagicGenerate={handleMagicGenerate}
                    onAddCard={handleAddCard}
                    onViewDetail={handleViewDetail}
                    onSplitStudy={handleSplitStudy}
                    onDelete={setDeletingDeck}
                    onUpdate={(updated) => {
                        setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
                    }}
                />
            )}

            {/* ═══ MODALS ═══ */}
            <CreateDeckModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateDeck}
            />

            <AddCardModal
                isOpen={isAddCardModalOpen}
                deckId={selectedDeck?.id ?? null}
                deckTitle={selectedDeck?.title ?? ''}
                onClose={() => {
                    setIsAddCardModalOpen(false);
                    setSelectedDeck(null);
                }}
                onSubmit={handleSubmitCard}
            />

            <MagicGenerateModal
                isOpen={isMagicGenerateOpen}
                deckId={selectedDeck?.id ?? ''}
                deckTitle={selectedDeck?.title ?? ''}
                onClose={() => {
                    setIsMagicGenerateOpen(false);
                    setSelectedDeck(null);
                }}
                onSuccess={(count) => handleMagicGenerateSuccess(count)}
            />

            <StudyModeSelector
                isOpen={isStudyModeOpen}
                deckTitle={studyDeck?.title}
                onClose={() => {
                    setIsStudyModeOpen(false);
                    setStudyDeck(null);
                }}
                onStart={handleStartSession}
            />

            <ConfirmationModal
                isOpen={!!deletingDeck}
                title="Elimina Mazzo"
                description={`Sei sicuro di voler eliminare "${deletingDeck?.title}"? Tutte le carte verranno eliminate.`}
                confirmLabel="Elimina"
                destructive
                onConfirm={handleDeleteDeck}
                onCancel={() => setDeletingDeck(null)}
            />
        </DashboardLayout>
    );
};

export default DecksDashboardPage;
