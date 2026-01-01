import { motion } from 'framer-motion';
import { useState } from 'react';
import { FiCalendar, FiPlus, FiLayout, FiFlag, FiClock, FiTarget } from 'react-icons/fi';
import DatePicker, { registerLocale } from 'react-datepicker';
import { it } from 'date-fns/locale/it';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { de } from 'date-fns/locale/de';
import { fr } from 'date-fns/locale/fr';
import 'react-datepicker/dist/react-datepicker.css';

import { ProjectSummary } from '../../tracker/ProjectSummary';
import { WorkLogList } from '../../tracker/WorkLogList';
import { WorkLogForm } from '../../tracker/WorkLogFormSmart';
import { QuickStats } from '../QuickStats';
import { QuickActions } from '../QuickActions';
import { WeeklyMiniChart } from '../WeeklyMiniChart';
import { GoalsWidget } from '../GoalsWidget';
import { useFormat } from '../../../shared/hooks/useFormat';
import { useDashboard } from '../hooks/useDashboard';

// Registra le lingue supportate (date-fns)
registerLocale('it', it);
registerLocale('en', enUS);
registerLocale('es', es);
registerLocale('de', de);
registerLocale('fr', fr);

export const DashboardPage = () => {
  const { language, formatMoney, formatHours } = useFormat();
  const {
    logs,
    filteredLogs,
    projects,
    selectedMonth,
    stats,
    upcomingGoals,
    recentActivity,
    greeting,
    formMode,
    formData,
    showForm,
    setSelectedMonth,
    setShowForm,
    handleSave,
    handleDuplicate,
    handleEdit,
    handleQuickAdd,
    deleteLog,
    resetFormState,
  } = useDashboard();

  // Mostra la form di default se non ci sono log
  const autoShowForm = useState(() => logs.length === 0)[0];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <FiLayout className="text-primary-400" />
            {greeting.title}
          </h1>
          <p className="text-white/50">{greeting.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Picker */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <FiCalendar className="text-white/50" size={18} />
            <DatePicker
              selected={selectedMonth ? new Date(`${selectedMonth}-01`) : new Date()}
              onChange={(date: Date | null) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  setSelectedMonth(`${year}-${month}`);
                }
              }}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              locale={language}
              className="w-32 bg-transparent text-white capitalize cursor-pointer focus:outline-none text-sm"
              calendarClassName="dark-calendar"
              showPopperArrow={false}
              popperPlacement="bottom-end"
              popperProps={{ strategy: 'fixed' }}
              portalId="datepicker-portal"
            />
          </div>

          {/* New Entry Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm) {
                resetFormState();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all text-white font-medium text-sm shadow-lg shadow-primary-500/20"
          >
            <FiPlus size={18} />
            Nuovo Log
          </motion.button>
        </div>
      </motion.div>

      {/* SUMMARY STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/15 flex items-center justify-center">
            <FiClock className="text-primary-300" />
          </div>
          <div>
            <p className="text-xs text-white/50">Ore nel periodo</p>
            <p className="text-white font-semibold">{formatHours(stats.totalHours)}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <FiTarget className="text-emerald-300" />
          </div>
          <div>
            <p className="text-xs text-white/50">Goal completati</p>
            <p className="text-white font-semibold">{stats.completedGoals}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <FiPlus className="text-amber-300" />
          </div>
          <div>
            <p className="text-xs text-white/50">Progetti attivi</p>
            <p className="text-white font-semibold">{stats.totalProjects}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center">
            <FiLayout className="text-sky-300" />
          </div>
          <div>
            <p className="text-xs text-white/50">Ricavi stimati</p>
            <p className="text-white font-semibold">{formatMoney(stats.totalEarnings)}</p>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <QuickStats logs={filteredLogs} projects={projects} allLogs={logs} />

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          {/* Form (collapsible) */}
          {(showForm || autoShowForm) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <WorkLogForm
                key={`${formMode}-${formData?.id ?? 'new'}`}
                projects={projects}
                onSave={handleSave}
                initialData={formData}
                mode={formMode}
                onCancel={resetFormState}
              />
            </motion.div>
          )}

          {/* Project Summary */}
          <ProjectSummary logs={filteredLogs} projects={projects} />

          {/* Work Log List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <WorkLogList
              logs={filteredLogs}
              projects={projects}
              onDelete={deleteLog}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
            />
          </motion.div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          {/* Weekly Mini Chart */}
          <WeeklyMiniChart logs={logs} projects={projects} />

          {/* Quick Actions */}
          <QuickActions
            logs={logs}
            projects={projects}
            onQuickAdd={handleQuickAdd}
            onDuplicate={handleDuplicate}
          />

          {/* Goals Widget */}
                    <GoalsWidget />

          {/* Upcoming Goals */}
          {upcomingGoals.length > 0 && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <FiFlag className="text-indigo-400" size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Prossime scadenze</h3>
                  <p className="text-xs text-white/50">I tuoi goal in arrivo</p>
                </div>
              </div>
              <div className="space-y-3">
                {upcomingGoals.map(goal => (
                  <div key={goal.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div>
                      <p className="text-white font-medium text-sm">{goal.title}</p>
                      <p className="text-xs text-white/50">Scadenza: {goal.deadline}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-500/25">
                      {goal.status === 'active' ? 'Attivo' : 'In corso'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5">
          <h3 className="text-white font-semibold mb-4">Attività recente</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentActivity.map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-white font-medium text-sm">{item.projectName}</p>
                <p className="text-xs text-white/50">{item.date}</p>
                <p className="text-primary-300 font-semibold mt-2">{item.durationHours.toFixed(1)}h</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
