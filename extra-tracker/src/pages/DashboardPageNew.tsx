import { motion } from 'framer-motion';
import { FiCalendar, FiPlus, FiLayout } from 'react-icons/fi';
import { ProjectSummary } from '../features/tracker/ProjectSummary';
import { WorkLogList } from '../features/tracker/WorkLogList';
import { WorkLogForm } from '../features/tracker/WorkLogFormSmart';
import { QuickStats } from '../features/dashboard/QuickStats';
import { QuickActions } from '../features/dashboard/QuickActions';
import { WeeklyMiniChart } from '../features/dashboard/WeeklyMiniChart';
import { GoalsWidgetPro } from '../features/dashboard/GoalsWidgetPro';
import { useFilterMonth } from '../hooks/useFilterMonth';
import { useProjects } from '../context/ProjectsContext';
import { useWorkLog } from '../context/WorkLogContenxt';
import { useState } from 'react';
import type { WorkLog, WorkLogFormMode } from '../features/tracker/type';
import DatePicker, { registerLocale } from "react-datepicker";
import { it } from "date-fns/locale/it";
import "react-datepicker/dist/react-datepicker.css";

// Registra la lingua italiana
registerLocale("it", it);

export const DashboardPage = () => {
    const { projects } = useProjects();
    const { logs, addWorkLog, deleteLog, updateLog } = useWorkLog();
    const { selectedMonth, setSelectedMonth, filteredLogs } = useFilterMonth(logs);

    const [formMode, setFormMode] = useState<WorkLogFormMode>("new");
    const [formData, setFormData] = useState<WorkLog | null>(null);
    const [showForm, setShowForm] = useState(false);

    const resetFormState = () => {
        setFormMode("new");
        setFormData(null);
        setShowForm(false);
    };

    const handleSave = (data: Omit<WorkLog, 'id' | 'description'>) => {
        if (formMode === "edit" && formData) {
            updateLog({ ...formData, ...data });
        } else {
            addWorkLog(data);
        }
        resetFormState();
    };

    const handleDuplicate = (log: WorkLog) => {
        const today = new Date().toISOString().split('T')[0];
        const smartLog = {
            ...log,
            id: "",
            date: today
        };
        setFormData(smartLog);
        setFormMode("smartCopy");
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEdit = (log: WorkLog) => {
        setFormData(log);
        setFormMode("edit");
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Quick Add handler - crea un log con orario automatico
    const handleQuickAdd = (projectId: string, hours: number) => {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const startHour = Math.max(9, now.getHours() - hours);
        const startTime = `${String(startHour).padStart(2, '0')}:00`;
        const endTime = `${String(startHour + hours).padStart(2, '0')}:00`;

        addWorkLog({
            projectId,
            date: today,
            startTime,
            endTime
        });
    };

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
                        Dashboard
                    </h1>
                    <p className="text-white/50">Monitora le tue ore e i guadagni</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Month Picker */}
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <FiCalendar className="text-white/50" size={18} />
                        <DatePicker
                            selected={selectedMonth ? new Date(selectedMonth + "-01") : new Date()}
                            onChange={(date: Date | null) => {
                                if (date) {
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    setSelectedMonth(`${year}-${month}`);
                                }
                            }}
                            dateFormat="MMMM yyyy"
                            showMonthYearPicker
                            locale="it"
                            className="w-32 bg-transparent text-white capitalize cursor-pointer focus:outline-none text-sm"
                            calendarClassName="dark-calendar"
                            showPopperArrow={false}
                            popperPlacement="bottom-end"
                            popperProps={{ strategy: "fixed" }}
                            portalId="datepicker-portal"
                        />
                    </div>

                    {/* New Entry Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setFormData(null);
                            setFormMode("new");
                            setShowForm(!showForm);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all text-white font-medium text-sm shadow-lg shadow-primary-500/20"
                    >
                        <FiPlus size={18} />
                        Nuovo Log
                    </motion.button>
                </div>
            </motion.div>

            {/* QUICK STATS */}
            <QuickStats logs={filteredLogs} projects={projects} allLogs={logs} />

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column - 2/3 */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Form (collapsible) */}
                    {showForm && (
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
                    <GoalsWidgetPro />
                </div>
            </div>
        </div>
    );
};
