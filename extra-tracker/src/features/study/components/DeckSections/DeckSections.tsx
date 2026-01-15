import React from 'react';
import { motion } from 'framer-motion';
import type { Deck, Tag } from '../../services/studyService';
import type { OrganizedDecks } from '../../hooks/useOrganizedDecks';
import type { DeckSectionLayout } from './DeckSection';
import { DeckSection } from './DeckSection';

// ============================================
// TYPES
// ============================================

interface DeckSectionsProps {
    organizedDecks: OrganizedDecks;
    tags: Tag[];
    viewMode?: DeckSectionLayout;
    forceGridLayout?: boolean; // Forza sempre il layout 'grid' per card grandi
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    onViewFolder?: (folderId: string) => void;
    onTogglePin?: (deck: Deck) => void;
}

// ============================================
// COMPONENT
// ============================================

export const DeckSections: React.FC<DeckSectionsProps> = ({
    organizedDecks,
    tags,
    viewMode = 'grid',
    forceGridLayout = false,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
    onDelete,
    onUpdate,
    onViewFolder,
    onTogglePin,
}) => {
    const handlers = {
        onStudy,
        onRead,
        onMagicGenerate,
        onAddCard,
        onViewDetail,
        onDelete,
        onUpdate,
        onTogglePin,
    };

    // Determina il layout in base al viewMode
    const getLayout = (defaultLayout: DeckSectionLayout): DeckSectionLayout => {
        // Se forceGridLayout è true, forza sempre 'grid' per card grandi
        if (forceGridLayout) return 'grid';
        // Se viewMode è 'grid', usa sempre il layout di default (che è 'grid' per le card grandi)
        if (viewMode === 'grid') return defaultLayout;
        if (viewMode === 'compact') return 'compact';
        if (viewMode === 'list') return 'list';
        return defaultLayout;
    };

    return (
        <div className="space-y-8">
            {/* Sezione 1: Continua a Studiare (Recenti) */}
            {organizedDecks.recentSessions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <DeckSection
                        title="Continua a Studiare"
                        subtitle="I tuoi mazzi recenti"
                        decks={organizedDecks.recentSessions}
                        layout={getLayout('horizontal')}
                        maxVisible={4}
                        tags={tags}
                        {...handlers}
                    />
                </motion.div>
            )}

            {/* Sezione 2: Da Ripassare (Priority) */}
            {organizedDecks.priorityDecks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <DeckSection
                        title="Da Ripassare"
                        subtitle={`${organizedDecks.priorityDecks.reduce((sum, d) => sum + (d.dueCount || 0), 0)} carte in attesa`}
                        decks={organizedDecks.priorityDecks}
                        layout={getLayout('horizontal')}
                        highlight="orange"
                        maxVisible={4}
                        tags={tags}
                        {...handlers}
                    />
                </motion.div>
            )}

            {/* Sezione 3: Preferiti (Pinned) - Opzionale */}
            {organizedDecks.pinnedDecks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <DeckSection
                        title="I tuoi Preferiti"
                        decks={organizedDecks.pinnedDecks}
                        layout="grid"
                        tags={tags}
                        {...handlers}
                    />
                </motion.div>
            )}

            {/* Sezione 4: Per Cartella */}
            {organizedDecks.folders.map((folderSection, index) => (
                <motion.div
                    key={folderSection.folder.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                >
                    <DeckSection
                        title={folderSection.folder.name}
                        subtitle={`${folderSection.stats.totalCards} carte • ${folderSection.stats.masteryPercent}% padronanza • ${folderSection.stats.dueCards} da ripassare`}
                        decks={folderSection.decks}
                        layout={getLayout('grid')}
                        collapsible
                        defaultCollapsed={false}
                        folderSection={folderSection}
                        tags={tags}
                        onViewFolder={onViewFolder}
                        {...handlers}
                    />
                </motion.div>
            ))}

            {/* Sezione 5: Non Categorizzati */}
            {organizedDecks.uncategorized.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * (organizedDecks.folders.length + 1) }}
                >
                    <DeckSection
                        title="Altri Mazzi"
                        subtitle={`${organizedDecks.uncategorized.length} mazzi non organizzati`}
                        decks={organizedDecks.uncategorized}
                        layout={getLayout('grid')}
                        collapsible
                        defaultCollapsed={organizedDecks.uncategorized.length > 6}
                        tags={tags}
                        {...handlers}
                    />
                </motion.div>
            )}

            {/* Empty State - Se non ci sono deck in nessuna sezione */}
            {organizedDecks.recentSessions.length === 0 &&
                organizedDecks.priorityDecks.length === 0 &&
                organizedDecks.pinnedDecks.length === 0 &&
                organizedDecks.folders.length === 0 &&
                organizedDecks.uncategorized.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-white/50 text-lg">
                            Nessun mazzo disponibile
                        </p>
                    </div>
                )}
        </div>
    );
};
