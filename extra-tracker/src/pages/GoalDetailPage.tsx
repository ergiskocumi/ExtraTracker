import { AnimatePresence } from 'framer-motion';
import { useGoalDetail } from '../features/goals/hooks/useGoalDetail';
import {
    LoadingSpinner,
    ErrorState,
    BackButton,
    GreetingSection,
    GoalHeaderCard,
    MilestonesSection,
    JournalSection,
    TabsNavigation,
    OverviewTab,
    HistoryTab,
    InsightsTab,
} from '../features/goals/components/GoalDetailComponents';

/**
 * GoalDetailPage - Pagina dettaglio singolo obiettivo
 * 
 * Architettura:
 * - useGoalDetail: Hook che gestisce tutta la logica (fetch, state, handlers)
 * - GoalDetailComponents: Componenti presentazionali "stupidi"
 * - Questa pagina: Solo orchestrazione e composizione
 */
export const GoalDetailPage = () => {
    const {
        // Core state
        data,
        loading,
        error,
        goal,
        checkIns,

        // Computed values
        encouragement,
        whereYouLeftOff,
        dailyTip,
        todayCheckIn,
        showMotivationalMessages,

        // Time info
        timeOfDay,
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
        toggleMilestoneExpanded,
        updateMilestoneNotesDraft,
        saveMilestoneNotes,

        // Tabs
        activeTab,
        setActiveTab,
    } = useGoalDetail();

    // Loading state
    if (loading) {
        return <LoadingSpinner />;
    }

    // Error state o goal non trovato
    if (error || !data || !goal) {
        return <ErrorState error={error} />;
    }

    return (
        <div className="min-h-screen pb-12">
            {/* Back Button */}
            <BackButton />

            {/* Greeting & Encouragement */}
            <GreetingSection
                timeOfDay={timeOfDay}
                todayFormatted={todayFormatted}
                encouragement={encouragement}
                whereYouLeftOff={whereYouLeftOff}
                todayCheckIn={todayCheckIn}
                showMotivationalMessages={showMotivationalMessages}
            />

            {/* Goal Header Card */}
            <GoalHeaderCard
                goal={goal}
                checkInsCount={checkIns.length}
            />

            {/* Milestones Section */}
            <MilestonesSection
                goal={goal}
                milestoneUI={milestoneUI}
                onToggleMilestone={toggleMilestone}
                onToggleExpanded={toggleMilestoneExpanded}
                onNotesChange={updateMilestoneNotesDraft}
                onNotesSave={saveMilestoneNotes}
            />

            {/* Today's Journal */}
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

            {/* Tabs Navigation */}
            <TabsNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <OverviewTab goal={goal} checkIns={checkIns} />
                )}
                {activeTab === 'history' && (
                    <HistoryTab goal={goal} checkIns={checkIns} />
                )}
                {activeTab === 'insights' && (
                    <InsightsTab goal={goal} checkIns={checkIns} />
                )}
            </AnimatePresence>
        </div>
    );
};
