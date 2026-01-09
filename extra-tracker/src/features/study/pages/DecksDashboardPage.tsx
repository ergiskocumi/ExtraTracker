/**
 * DECKS DASHBOARD PAGE - User-Friendly Redesign
 * 
 * Redesign completo con focus su UX:
 * - Card grandi e leggibili
 * - Azioni SEMPRE visibili (no hover-only)
 * - Pulsanti touch-friendly (min 44px)
 * - Mobile-first responsive design
 * - Visual hierarchy chiara
 */

import { useState } from 'react';
import { useDashboardCalculations, type FilterType } from '../hooks/useDashboardCalculations';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDeckHandlers } from '../hooks/useDeckHandlers';
import { DashboardLayout } from '../components/DashboardLayout';
import { DashboardHero } from '../components/DashboardHero';
import { TodayPlan } from '../components/TodayPlan';
import { FilterBar } from '../components/FilterBar';
import { DashboardContent } from '../components/DashboardContent';
import { DashboardModals } from '../components/DashboardModals';

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export const DecksDashboardPage: React.FC = () => {
    // Organization state
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Data loading
    const {
        decks,
        setDecks,
        dueCardCount,
        isLoading,
        error,
        folders,
        tags,
        loadDecks,
        loadFolders,
        refreshAll,
    } = useDashboardData();

    // Calculations
    const {
        folderStats,
        todayPriorityDecks,
        calculateMentalState,
        filteredDecks,
        totalCards,
        masteredDecks,
    } = useDashboardCalculations({
        decks,
        folders,
        filter,
        searchQuery,
        selectedFolderId,
        selectedTags,
    });

    // Handlers
    const handlers = useDeckHandlers({
        decks,
        setDecks,
        loadDecks,
        loadFolders,
    });

    // Organization handlers
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
        await refreshAll();
    };

    // ========== RENDER ==========

    return (
        <DashboardLayout
            isSidebarOpen={isSidebarOpen}
            onSidebarClose={() => setIsSidebarOpen(false)}
            onSidebarToggle={() => setIsSidebarOpen(prev => !prev)} 
            folders={folders}
            tags={tags}
            selectedFolderId={selectedFolderId}
            selectedTags={selectedTags}
            folderStats={folderStats}
            onFolderSelect={handleFolderSelect}
            onTagToggle={handleTagToggle}
            onDeckDrop={handlers.handleDeckDrop}
            onRefresh={handleRefreshOrganization}
            onCreateDeck={() => handlers.setIsCreateModalOpen(true)}
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
                    onStudy={handlers.handleStudy}
                    onViewDetail={handlers.handleViewDetail}
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
            <DashboardContent
                isLoading={isLoading}
                error={error}
                decks={decks}
                filteredDecks={filteredDecks}
                tags={tags}
                filter={filter}
                searchQuery={searchQuery}
                onRetry={loadDecks}
                onCreateDeck={() => handlers.setIsCreateModalOpen(true)}
                onFilterReset={() => {
                    setFilter('all');
                    setSearchQuery('');
                }}
                onStudy={handlers.handleStudy}
                onMagicGenerate={handlers.handleMagicGenerate}
                onAddCard={handlers.handleAddCard}
                onViewDetail={handlers.handleViewDetail}
                onSplitStudy={handlers.handleSplitStudy}
                onDelete={handlers.setDeletingDeck}
                onUpdate={(updated) => {
                    setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
                }}
            />

            {/* ═══ MODALS ═══ */}
            <DashboardModals
                isCreateModalOpen={handlers.isCreateModalOpen}
                onCreateModalClose={() => handlers.setIsCreateModalOpen(false)}
                onCreateDeck={handlers.handleCreateDeck}
                isAddCardModalOpen={handlers.isAddCardModalOpen}
                selectedDeck={handlers.selectedDeck}
                onAddCardModalClose={() => {
                    handlers.setIsAddCardModalOpen(false);
                    handlers.setSelectedDeck(null);
                }}
                onSubmitCard={handlers.handleSubmitCard}
                isMagicGenerateOpen={handlers.isMagicGenerateOpen}
                onMagicGenerateClose={() => {
                    handlers.setIsMagicGenerateOpen(false);
                    handlers.setSelectedDeck(null);
                }}
                onMagicGenerateSuccess={handlers.handleMagicGenerateSuccess}
                isStudyModeOpen={handlers.isStudyModeOpen}
                studyDeck={handlers.studyDeck}
                onStudyModeClose={() => {
                    handlers.setIsStudyModeOpen(false);
                    handlers.setStudyDeck(null);
                }}
                onStartSession={handlers.handleStartSession}
                deletingDeck={handlers.deletingDeck}
                onDeleteConfirm={handlers.handleDeleteDeck}
                onDeleteCancel={() => handlers.setDeletingDeck(null)}
            />
        </DashboardLayout>
    );
};

export default DecksDashboardPage;
