/**
 * 🎯 GoalsPage - Pagina principale degli obiettivi
 * 
 * Questo componente è SOLO presentazione UI.
 * - Logica di business → useGoalsManager hook
 * - Componenti UI → GoalsUIComponents
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTarget, FiPlus } from 'react-icons/fi';

// Hook con tutta la logica
import { useGoalsManager } from '../features/goals/hooks/useGoalsManager';

// Componenti UI
import { GoalWizard } from '../features/goals/GoalWizard';
import {
    SmartHeroSection,
    StatsCards,
    FiltersSection,
    GoalsList,
} from '../features/goals/components/GoalsUIComponents';

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
    } = useGoalsManager();

    // ========== UI STATE: Solo modale wizard ==========
    const [showWizard, setShowWizard] = useState(false);

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
            />

            {/* WIZARD MODAL */}
            <AnimatePresence>
                {showWizard && <GoalWizard onClose={() => setShowWizard(false)} />}
            </AnimatePresence>
        </div>
    );
};
