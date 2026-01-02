/**
 * 🎯 GoalsPage - Pagina principale degli obiettivi
 * 
 * Questo componente è SOLO presentazione UI.
 * - Logica di business → useGoalsManager hook
 * - Componenti UI → GoalsUIComponents
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTarget, FiPlus, FiCheckSquare, FiTrash2, FiX } from 'react-icons/fi';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import { useSelection } from '../../../shared/hooks/useSelection';

// Hook con tutta la logica
import { useGoalsManager } from '../hooks/useGoalsManager';

// Componenti UI
import { GoalWizard } from '../GoalWizard';
import {
    SmartHeroSection,
    StatsCards,
    FiltersSection,
    GoalsList,
} from '../components/GoalsUIComponents';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const GoalsPage = () => {
    // ========== HOOK: Tutta la logica di business ==========
    const {
        goals,
        filteredGoals,
        stats,
        loading,
        error,
        filters,
        setSearchQuery,
        setFilterCategory,
        setFilterStatus,
        setSortBy,
        clearFilters,
        hasActiveFilters,
        quickCheckInState,
        handleQuickCheckIn,
        smartLogic,
        helpers,
        bulkDeleteGoals,
    } = useGoalsManager();

    // ========== UI STATE: Solo modale wizard ==========
    const [showWizard, setShowWizard] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    const selection = useSelection();
    const selectedCount = selection.selectedCount;
    const { selectedLabel, selectedGoalsLabel } = useMemo(() => {
        if (selectedCount === 1) {
            return { selectedLabel: '1 selezionato', selectedGoalsLabel: '1 obiettivo' };
        }
        return {
            selectedLabel: `${selectedCount} selezionati`,
            selectedGoalsLabel: `${selectedCount} obiettivi`,
        };
    }, [selectedCount]);

    const handleExitSelection = () => {
        selection.clearSelection();
        selection.setSelectionMode(false);
        setShowBulkDeleteConfirm(false);
    };

    const handleToggleSelectionMode = () => {
        if (selection.isSelectionMode) {
            handleExitSelection();
        } else {
            selection.setSelectionMode(true);
        }
    };

    const handleConfirmBulkDelete = async () => {
        if (selection.selectedIds.size === 0) return;

        setIsBulkDeleting(true);
        try {
            await bulkDeleteGoals(Array.from(selection.selectedIds));
            handleExitSelection();
        } catch (err) {
            console.error('Bulk delete failed:', err);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // ========== LOADING ==========
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 rounded-full border-primary-500 border-t-transparent"
                />
            </div>
        );
    }

    // ========== ERROR ==========
    if (error) {
        return (
            <div className="max-w-md p-6 mx-auto mt-8 text-center border bg-red-500/10 border-red-500/20 rounded-xl">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    // ========== RENDER ==========
    return (
        <div className="min-h-screen pb-12">
            {/* SMART HERO SECTION */}
            <SmartHeroSection
                dailyScore={smartLogic.dailyScore}
                suggestedGoal={smartLogic.suggestedGoal}
                motivationalMessage={smartLogic.motivationalMessage}
                habitsDoneToday={smartLogic.habitsDoneToday}
                habitsTotal={smartLogic.habitsTotal}
                checkingInGoals={quickCheckInState.checkingInGoals}
                checkedInGoals={quickCheckInState.checkedInGoals}
                onQuickCheckIn={handleQuickCheckIn}
                onCreateGoal={() => setShowWizard(true)}
            />

            {/* HEADER */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="mb-2 text-4xl font-bold text-white">Goals Dashboard</h1>
                        <p className="text-white/60">Track your objectives and measure progress</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleToggleSelectionMode}
                            disabled={goals.length === 0}
                            className={`flex items-center gap-2 px-4 py-3 font-medium rounded-xl transition-all border ${
                                selection.isSelectionMode
                                    ? 'bg-white/10 border-white/20 text-white'
                                    : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:border-white/20'
                            } ${goals.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {selection.isSelectionMode ? <FiX className="w-4 h-4" /> : <FiCheckSquare className="w-4 h-4" />}
                            {selection.isSelectionMode ? 'Fine' : 'Gestisci'}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowWizard(true)}
                            className="flex items-center gap-2 px-6 py-3 font-medium text-white transition-all shadow-lg bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-primary-500/25 hover:shadow-primary-500/40"
                        >
                            <FiPlus className="w-5 h-5" />
                            New Goal
                        </motion.button>
                    </div>
                </div>

                {/* STATS */}
                <StatsCards stats={stats} />

                {/* FILTERS */}
                <FiltersSection
                    filters={filters}
                    setSearchQuery={setSearchQuery}
                    setFilterCategory={setFilterCategory}
                    setFilterStatus={setFilterStatus}
                    setSortBy={setSortBy}
                    clearFilters={clearFilters}
                    hasActiveFilters={hasActiveFilters}
                    filteredCount={filteredGoals.length}
                    totalCount={goals.length}
                />
            </motion.div>

            {/* SECTION HEADER */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 mb-6"
            >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5">
                    <FiTarget className="w-4 h-4 text-white/60" />
                </div>
                <h2 className="text-xl font-semibold text-white">Tutti gli Obiettivi</h2>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10 text-white/60">
                    {filteredGoals.length}
                </span>
            </motion.div>

            {/* GOALS LIST */}
            <GoalsList
                goals={filteredGoals}
                allGoalsEmpty={goals.length === 0}
                checkingInGoals={quickCheckInState.checkingInGoals}
                checkedInGoals={quickCheckInState.checkedInGoals}
                pulsingGoals={quickCheckInState.pulsingGoals}
                onQuickCheckIn={handleQuickCheckIn}
                onCreateGoal={() => setShowWizard(true)}
                getDaysRemaining={helpers.getDaysRemaining}
                getProgressColor={helpers.getProgressColor}
                canQuickCheckIn={helpers.canQuickCheckIn}
                isSelectionMode={selection.isSelectionMode}
                isSelected={selection.isSelected}
                onToggleSelect={selection.toggleSelection}
            />

            {/* FLOATING ACTION BAR */}
            <AnimatePresence>
                {selection.isSelectionMode && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-1/2 z-50 w-[min(680px,92vw)] -translate-x-1/2"
                    >
                        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-dark-500/90 px-5 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300">
                                    <FiCheckSquare className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{selectedLabel}</p>
                                    <p className="text-xs text-white/50">Seleziona gli obiettivi da eliminare</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExitSelection}
                                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowBulkDeleteConfirm(true)}
                                    disabled={selectedCount === 0}
                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all ${
                                        selectedCount === 0
                                            ? 'bg-white/10 cursor-not-allowed'
                                            : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                                    }`}
                                >
                                    <FiTrash2 className="h-4 w-4" />
                                    Elimina
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CONFIRMATION MODAL */}
            <ConfirmationModal
                isOpen={showBulkDeleteConfirm}
                title="Eliminare gli obiettivi selezionati?"
                description={`Stai per eliminare ${selectedGoalsLabel}. Questa azione e' irreversibile.`}
                confirmLabel="Elimina"
                cancelLabel="Annulla"
                onConfirm={handleConfirmBulkDelete}
                onCancel={() => setShowBulkDeleteConfirm(false)}
                isLoading={isBulkDeleting}
                destructive
            />

            {/* WIZARD MODAL */}
            <AnimatePresence>
                {showWizard && <GoalWizard onClose={() => setShowWizard(false)} />}
            </AnimatePresence>
        </div>
    );
};
