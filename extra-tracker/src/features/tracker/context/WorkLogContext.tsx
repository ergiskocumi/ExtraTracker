import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { MOCK_WORKLOGS } from '../../../data';
import type { WorkLog, WorkLogInput } from '../type';

interface WorkLogContextValue {
    logs: WorkLog[];
    addWorkLog: (data: WorkLogInput) => void;
    updateLog: (log: WorkLog) => void;
    deleteLog: (id: string) => void;
}

const noop = () => {};

const fallbackContext: WorkLogContextValue = {
    logs: MOCK_WORKLOGS,
    addWorkLog: noop,
    updateLog: noop,
    deleteLog: noop,
};

const WorkLogContext = createContext<WorkLogContextValue | undefined>(undefined);

interface WorkLogProviderProps {
    children: ReactNode;
}

export const WorkLogProvider: React.FC<WorkLogProviderProps> = ({ children }) => {
    const [logs, setLogs] = useState<WorkLog[]>(MOCK_WORKLOGS);

    const addWorkLog = useCallback((data: WorkLogInput) => {
        const now = new Date().toISOString();
        const newLog: WorkLog = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        setLogs((prev) => [...prev, newLog]);
    }, []);

    const updateLog = useCallback((updatedLog: WorkLog) => {
        setLogs((prev) =>
            prev.map((log) =>
                log.id === updatedLog.id
                    ? {
                          ...log,
                          ...updatedLog,
                          updatedAt: new Date().toISOString(),
                      }
                    : log
            )
        );
    }, []);

    const deleteLog = useCallback((id: string) => {
        setLogs((prev) => prev.filter((log) => log.id !== id));
    }, []);

    const value = useMemo<WorkLogContextValue>(
        () => ({
            logs,
            addWorkLog,
            updateLog,
            deleteLog,
        }),
        [logs, addWorkLog, updateLog, deleteLog]
    );

    return <WorkLogContext.Provider value={value}>{children}</WorkLogContext.Provider>;
};

export const useWorkLog = (): WorkLogContextValue => {
    return useContext(WorkLogContext) ?? fallbackContext;
};

