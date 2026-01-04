import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useGoalDetail, getDaysRemaining, getProgressColor } from '../hooks/useGoalDetail';
import {
    LoadingSpinner,
    ErrorState,
    JournalSection,
    OverviewTab,
    HistoryTab,
    InsightsTab,
} from '../components/GoalDetailComponents';
import { getCategoryIcon } from '../components/goalDetailIcons';
import { SmartMilestoneCard } from '../components/SmartMilestoneCard';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import { GOAL_CATEGORIES } from '../types';
import {
    FiArrowLeft,
    FiBarChart2,
    FiTarget,
    FiClock,
    FiTrendingUp,
    FiCheckCircle,
    FiAlertTriangle,
    FiZap,
    FiBook,
    FiMap,
    FiAward,
    FiEdit,
    FiActivity,
} from 'react-icons/fi';

/**
 * 🎮 GoalDetailPage - Mission Control Center
 * 
 * Dashboard premium per monitorare e completare i tuoi obiettivi.
 * Design ispirato a app di produttività come Linear, Notion, e gaming UI.
 * 
 * Features:
 * - Hero Section con stats grid (Progress, Countdown, Next Step)
 * - Tabs: Roadmap (default) | Journal | Stats
 * - SmartMilestoneCard con AI data (reasoning, action steps, resources)
 * - Gamification: Status badges, progress visualization
 */

// =========================================
// TAB TYPES
// =========================================

type MissionTab = 'roadmap' | 'journal' | 'stats';

// =========================================
// HERO SECTION COMPONENTS
// =========================================

interface HeroStatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    gradient: string;
    highlight?: boolean;
    status?: 'success' | 'warning' | 'danger' | 'info';
}

const HeroStatCard: React.FC<HeroStatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    gradient,
    highlight = false,
    status,
}) => {
    const statusColors = {
        success: 'text-green-400',
        warning: 'text-yellow-400',
        danger: 'text-red-400',
        info: 'text-blue-400',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative p-5 rounded-2xl border backdrop-blur-xl overflow-hidden
                ${highlight 
                    ? 'border-primary-500/30 bg-gradient-to-br from-primary-500/10 to-primary-600/5' 
                    : 'border-white/10 bg-white/[0.03]'
                }
            `}
        >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
            
            {/* Content */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white/60">{title}</span>
                    <div className={`p-2 rounded-lg bg-white/10 ${status ? statusColors[status] : 'text-white/60'}`}>
                        {icon}
                    </div>
                </div>
                <p className={`text-3xl font-bold ${status ? statusColors[status] : 'text-white'}`}>
                    {value}
                </p>
                {subtitle && (
                    <p className="mt-1 text-sm text-white/50">{subtitle}</p>
                )}
            </div>
        </motion.div>
    );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: 'on-track' | 'behind' | 'ahead' | 'completed' }> = ({ status }) => {
    const configs = {
        'on-track': { label: 'On Track', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <FiCheckCircle /> },
        'behind': { label: 'Behind', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <FiAlertTriangle /> },
        'ahead': { label: 'Ahead', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <FiTrendingUp /> },
        'completed': { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <FiAward /> },
    };

    const config = configs[status];

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.color}`}
        >
            {config.icon}
            <span className="text-xs font-semibold">{config.label}</span>
        </motion.div>
    );
};

// =========================================
// MAIN COMPONENT
// =========================================

export const GoalDetailPage = () => {
    const {
        // Core state
        data,
        loading,
        error,
        goal,
        checkIns,

        // Computed values
        dailyTip,
        todayCheckIn,
        showMotivationalMessages,

        // Time info
        todayFormatted,

        // Journal
        journalForm,
        openJournalForm,
        closeJournalForm,
        updateJournalForm,
        submitJournal,

        // Milestones
        milestoneUI,
        toggleMilestone,
        toggleMilestoneStep,
        cancelDeleteMilestone,
        confirmDeleteMilestone,
        pendingDeleteMilestoneId,
        isDeletingMilestone,
    } = useGoalDetail();

    // Local tab state for Mission Control
    const [activeTab, setActiveTab] = useState<MissionTab>('roadmap');

    // Loading state
    if (loading) {
        return <LoadingSpinner />;
    }

    // Error state o goal non trovato
    if (error || !data || !goal) {
        return <ErrorState error={error} />;
    }

    // Computed values
    const daysRemaining = getDaysRemaining(goal.deadline);
    const isExpired = daysRemaining < 0;
    const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;
    const category = GOAL_CATEGORIES[goal.category];
    const completedMilestones = goal.completedMilestones ?? goal.milestones.filter(m => m.isCompleted).length;
    const totalMilestones = goal.milestones?.length || 0;
    
    // Find current milestone (first incomplete one)
    const currentMilestoneIndex = goal.milestones?.findIndex(m => !m.isCompleted) ?? -1;
    const currentMilestone = currentMilestoneIndex >= 0 ? goal.milestones?.[currentMilestoneIndex] : null;
    
    // Calculate status
    const getGoalStatus = (): 'on-track' | 'behind' | 'ahead' | 'completed' => {
        if (goal.status === 'completed') return 'completed';
        if (isExpired) return 'behind';
        
        // Expected progress based on time elapsed
        const totalDays = Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - new Date(goal.createdAt!).getTime()) / (1000 * 60 * 60 * 24)));
        const daysElapsed = totalDays - daysRemaining;
        const expectedProgress = (daysElapsed / totalDays) * 100;
        const actualProgress = goal.percentage || 0;
        
        if (actualProgress >= expectedProgress + 10) return 'ahead';
        if (actualProgress < expectedProgress - 10) return 'behind';
        return 'on-track';
    };

    const goalStatus = getGoalStatus();
    const pendingMilestoneTitle = goal.milestones?.find(m => m.id === pendingDeleteMilestoneId)?.title || 'questa milestone';

    // Tab configuration
    const tabs: { id: MissionTab; label: string; icon: React.ReactNode }[] = [
        { id: 'roadmap', label: 'Roadmap', icon: <FiMap className="w-4 h-4" /> },
        { id: 'journal', label: 'Journal', icon: <FiBook className="w-4 h-4" /> },
        { id: 'stats', label: 'Stats', icon: <FiActivity className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen pb-12">
            {/* Back Button & Status */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between mb-6"
            >
                <Link
                    to="/goals"
                    className="inline-flex items-center gap-2 transition-colors text-white/60 hover:text-white group"
                >
                    <FiArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    <span>Back to Goals</span>
                </Link>
                <StatusBadge status={goalStatus} />
            </motion.div>

            {/* ========================================= */}
            {/* HERO SECTION - Mission Header */}
            {/* ========================================= */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                {/* Goal Title & Category */}
                <div className="flex items-start gap-4 mb-6">
                    <div className={`p-4 rounded-2xl ${category.color} bg-white/5 border border-white/10`}>
                        {getCategoryIcon(goal.category)}
                    </div>
                    <div className="flex-1">
                        <h1 className="mb-2 text-3xl font-bold text-white">{goal.title}</h1>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${category.color} bg-white/5`}>
                                {category.label}
                            </span>
                            <span className="text-white/40">•</span>
                            <span className="text-sm capitalize text-white/60">{goal.type} goal</span>
                            {goal.description && (
                                <>
                                    <span className="text-white/40">•</span>
                                    <span className="max-w-md text-sm truncate text-white/50">{goal.description}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <Link
                        to={`/goals/${goal.id}/edit`}
                        className="p-2 transition-all border rounded-lg bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"
                    >
                        <FiEdit className="w-5 h-5" />
                    </Link>
                </div>

                {/* Overall Progress Bar */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white/80">Overall Progress</span>
                        <span className="text-sm font-bold text-white">{(goal.percentage || 0).toFixed(1)}%</span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.percentage || 0}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={`h-full bg-gradient-to-r ${getProgressColor(goal.percentage || 0)} rounded-full`}
                        />
                    </div>
                </div>

                {/* Stats Grid - Hero Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Progress Card */}
                    <HeroStatCard
                        title="Progress"
                        value={`${completedMilestones}/${totalMilestones}`}
                        subtitle="milestones completed"
                        icon={<FiBarChart2 className="w-5 h-5" />}
                        gradient="from-primary-500/10 to-purple-500/5"
                        status="info"
                    />

                    {/* Countdown Card */}
                    <HeroStatCard
                        title={isExpired ? "Overdue" : "Time Left"}
                        value={`${Math.abs(daysRemaining)}`}
                        subtitle={isExpired ? "days overdue" : "days remaining"}
                        icon={<FiClock className="w-5 h-5" />}
                        gradient={isExpired ? "from-red-500/10 to-orange-500/5" : isUrgent ? "from-yellow-500/10 to-orange-500/5" : "from-blue-500/10 to-cyan-500/5"}
                        status={isExpired ? 'danger' : isUrgent ? 'warning' : 'info'}
                    />

                    {/* Next Step Card */}
                    <HeroStatCard
                        title="Next Step"
                        value={currentMilestone?.title || "All done! 🎉"}
                        subtitle={currentMilestone ? `Step ${currentMilestoneIndex + 1} of ${totalMilestones}` : "Goal completed"}
                        icon={<FiZap className="w-5 h-5" />}
                        gradient="from-emerald-500/10 to-green-500/5"
                        highlight={!!currentMilestone}
                        status={currentMilestone ? 'success' : 'success'}
                    />
                </div>
            </motion.div>

            {/* ========================================= */}
            {/* TABS NAVIGATION */}
            {/* ========================================= */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
            >
                <div className="flex gap-2 p-1.5 bg-white/5 rounded-xl w-fit border border-white/10">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* ========================================= */}
            {/* TAB CONTENT */}
            {/* ========================================= */}
            <AnimatePresence mode="wait">
                {/* ROADMAP TAB - SmartMilestoneCards */}
                {activeTab === 'roadmap' && (
                    <motion.div
                        key="roadmap"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {/* Roadmap Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400">
                                    <FiMap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Your Roadmap</h3>
                                    <p className="text-sm text-white/60">
                                        {completedMilestones} of {totalMilestones} milestones completed
                                    </p>
                                </div>
                            </div>
                            
                            {/* Milestone Progress Badge */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${goal.milestoneProgress || 0}%` }}
                                        transition={{ duration: 0.5 }}
                                        className="h-full rounded-full bg-primary-500"
                                    />
                                </div>
                                <span className="text-xs font-medium text-white/80">
                                    {goal.milestoneProgress || 0}%
                                </span>
                            </div>
                        </div>

                        {/* SmartMilestoneCards List */}
                        {goal.milestones && goal.milestones.length > 0 ? (
                            <div className="space-y-4">
                                {goal.milestones.map((milestone, index) => (
                                    <SmartMilestoneCard
                                        key={milestone.id}
                                        milestone={milestone}
                                        index={index}
                                        isCurrentMilestone={index === currentMilestoneIndex}
                                        isDisabled={goal.status !== 'active' || isExpired}
                                        onToggleComplete={toggleMilestone}
                                        onActionStepToggle={(milestoneId, stepIndex, completed) =>
                                            toggleMilestoneStep(milestoneId, stepIndex, completed)
                                        }
                                        isToggling={milestoneUI.togglingId === milestone.id}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 rounded-2xl bg-white/[0.03] border border-white/10">
                                <FiTarget className="w-12 h-12 mx-auto mb-4 text-white/20" />
                                <p className="text-white/60">No milestones yet</p>
                                <p className="mt-1 text-sm text-white/40">Add milestones to track your progress</p>
                            </div>
                        )}

                        {/* Info text for disabled state */}
                        {(goal.status !== 'active' || isExpired) && goal.milestones && goal.milestones.length > 0 && (
                            <p className="mt-4 text-sm text-center text-white/40">
                                {goal.status === 'completed'
                                    ? 'Goal completed - milestones are locked'
                                    : isExpired
                                        ? 'Goal expired - milestones are locked'
                                        : 'Milestones are locked'}
                            </p>
                        )}
                    </motion.div>
                )}

                {/* JOURNAL TAB */}
                {activeTab === 'journal' && (
                    <motion.div
                        key="journal"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <JournalSection
                            goal={goal}
                            todayCheckIn={todayCheckIn}
                            todayFormatted={todayFormatted}
                            journalForm={journalForm}
                            dailyTip={dailyTip}
                            showMotivationalMessages={showMotivationalMessages}
                            onOpenForm={openJournalForm}
                            onCloseForm={closeJournalForm}
                            onUpdateForm={updateJournalForm}
                            onSubmit={submitJournal}
                        />
                        
                        {/* History in Journal Tab */}
                        <HistoryTab goal={goal} checkIns={checkIns} />
                    </motion.div>
                )}

                {/* STATS TAB */}
                {activeTab === 'stats' && (
                    <motion.div
                        key="stats"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <OverviewTab goal={goal} checkIns={checkIns} />
                        <InsightsTab goal={goal} checkIns={checkIns} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ========================================= */}
            {/* MODALS */}
            {/* ========================================= */}
            <ConfirmationModal
                isOpen={Boolean(pendingDeleteMilestoneId)}
                title="Delete this milestone?"
                description={`"${pendingMilestoneTitle}" will be permanently deleted.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={confirmDeleteMilestone}
                onCancel={cancelDeleteMilestone}
                isLoading={isDeletingMilestone}
                destructive
            />
        </div>
    );
};
