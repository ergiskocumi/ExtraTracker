import { useMemo, useState } from 'react';
import { useGoals } from '../../goals/context/GoalsContext';
import { useProjects } from '../../projects/context/ProjectsContext';
import { useWorkLog } from '../../tracker/context/WorkLogContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useFilterMonth } from '../../../shared/hooks/useFilterMonth';
import { calculateDurationInHours } from '../../../shared/utils/dateUtils';
import type { WorkLog, WorkLogFormMode } from '../../tracker/type';
import type { GoalWithProgress } from '../../goals/types';

interface DashboardStats {
    totalHours: number;
    totalEarnings: number;
    completedGoals: number;
    activeGoals: number;
    totalProjects: number;
    totalLogs: number;
}

interface UpcomingGoal {
    id: string;
    title: string;
    deadline: string;
    status: GoalWithProgress['status'];
}

interface RecentActivityItem {
    id: string;
    projectName: string;
    date: string;
    durationHours: number;
}

export const useDashboard = () => {
    const { user } = useAuth();
    const { goals, stats: goalStats } = useGoals();
    const { projects } = useProjects();
    const { logs, addWorkLog, deleteLog, updateLog } = useWorkLog();
    const { selectedMonth, setSelectedMonth, filteredLogs } = useFilterMonth(logs);

    const [formMode, setFormMode] = useState<WorkLogFormMode>('new');
    const [formData, setFormData] = useState<WorkLog | null>(null);
    const [showForm, setShowForm] = useState(false);

    const resetFormState = () => {
        setFormMode('new');
        setFormData(null);
        setShowForm(false);
    };

    const handleSave = (data: Omit<WorkLog, 'id' | 'description'>) => {
        if (formMode === 'edit' && formData) {
            updateLog({ ...formData, ...data });
        } else {
            addWorkLog(data);
        }
        resetFormState();
    };

    const handleDuplicate = (log: WorkLog) => {
        const today = new Date().toISOString().split('T')[0];
        const smartLog = { ...log, id: '', date: today };
        setFormData(smartLog);
        setFormMode('smartCopy');
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEdit = (log: WorkLog) => {
        setFormData(log);
        setFormMode('edit');
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleQuickAdd = (projectId: string, hours: number) => {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const startHour = Math.max(9, now.getHours() - hours);
        const startTime = `${String(startHour).padStart(2, '0')}:00`;
        const endTime = `${String(startHour + hours).padStart(2, '0')}:00`;
        const timestamp = now.toISOString();

        addWorkLog({
            projectId,
            date: today,
            title: 'Quick log',
            startTime,
            endTime,
            createdAt: timestamp,
            updatedAt: timestamp,
        });
    };

    const totalHours = useMemo(
        () => filteredLogs.reduce((acc, log) => acc + calculateDurationInHours(log.startTime, log.endTime), 0),
        [filteredLogs]
    );

    const totalEarnings = useMemo(() => {
        const rateMap = projects.reduce<Record<string, number>>((map, project) => {
            map[project.id] = project.rate ?? 0;
            return map;
        }, {});
        return filteredLogs.reduce((acc, log) => acc + calculateDurationInHours(log.startTime, log.endTime) * (rateMap[log.projectId] ?? 0), 0);
    }, [filteredLogs, projects]);

    const upcomingGoals = useMemo<UpcomingGoal[]>(() => {
        const today = new Date().toISOString().split('T')[0];
        return goals
            .filter(goal => goal.deadline && goal.deadline >= today && goal.status !== 'completed')
            .map(goal => ({ id: goal.id, title: goal.title, deadline: goal.deadline, status: goal.status }))
            .sort((a, b) => a.deadline.localeCompare(b.deadline))
            .slice(0, 3);
    }, [goals]);

    const recentActivity = useMemo<RecentActivityItem[]>(() => {
        const projectNameMap = projects.reduce<Record<string, string>>((map, project) => {
            map[project.id] = project.name;
            return map;
        }, {});

        return filteredLogs
            .slice()
            .sort((a, b) => `${b.date} ${b.endTime}`.localeCompare(`${a.date} ${a.endTime}`))
            .slice(0, 5)
            .map(log => ({
                id: log.id,
                projectName: projectNameMap[log.projectId] ?? 'Progetto',
                date: log.date,
                durationHours: calculateDurationInHours(log.startTime, log.endTime),
            }));
    }, [filteredLogs, projects]);

    const stats: DashboardStats = useMemo(
        () => ({
            totalHours,
            totalEarnings,
            completedGoals: goalStats.completedGoals,
            activeGoals: goalStats.activeGoals,
            totalProjects: projects.length,
            totalLogs: filteredLogs.length,
        }),
        [totalHours, totalEarnings, goalStats.completedGoals, goalStats.activeGoals, projects.length, filteredLogs.length]
    );

    const greeting = useMemo(() => {
        const name = user?.displayName || user?.firstName || 'Benvenuto';
        return {
            title: `Ciao ${name}!`,
            subtitle: 'Ecco un riepilogo rapido della tua settimana',
        };
    }, [user]);

    return {
        // data
        logs,
        filteredLogs,
        projects,
        goals,
        goalStats,
        selectedMonth,
        stats,
        upcomingGoals,
        recentActivity,
        greeting,

        // form state
        formMode,
        formData,
        showForm,

        // actions
        setSelectedMonth,
        setShowForm,
        setFormMode,
        setFormData,
        handleSave,
        handleDuplicate,
        handleEdit,
        handleQuickAdd,
        deleteLog,
        resetFormState,
    };
};
