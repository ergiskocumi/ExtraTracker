import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { WorkLog } from "../features/tracker/type";
import { MOCK_WORKLOGS } from "../data";

interface WorkLogContextType {
    logs: WorkLog[];
    addWorkLog: (data: Omit<WorkLog, 'id'>) => void;
    deleteLog: (id: string) => void;
    updateLog: (updatedLog: WorkLog) => void;
}

const WorkLogContext = createContext<WorkLogContextType | undefined>(undefined);

export const WorkLogProvider = ({ children }: { children: ReactNode }) => {
   const [logs, setLogs] = useState<WorkLog[]>(() => {
    const savedData = localStorage.getItem('work-tracker-data');
    return savedData ? JSON.parse(savedData) : MOCK_WORKLOGS;
  });

  useEffect(() => {
    localStorage.setItem('work-tracker-data', JSON.stringify(logs));
  }, [logs]);

  const addWorkLog = (data: Omit<WorkLog, 'id'>) => {
    const newLog: WorkLog = {
      id: Date.now().toString(),
      ...data
    };
    setLogs((prev) => [...prev, newLog]);
  };

   const deleteLog = (id: string) => {
    const updatedLogs = logs.filter( log => log.id !== id);
      setLogs(updatedLogs);
  };

  //4. aggiunta della funzione per Update dei log
  const updateLog = (updatedLog: WorkLog) => {
    setLogs((prevLogs) =>
      prevLogs.map((log) =>
      (log.id === updatedLog.id ? updatedLog : log)
      ));
  };

  return (
    <WorkLogContext.Provider value={{ logs, addWorkLog, deleteLog, updateLog }}>
      {children}
    </WorkLogContext.Provider>
  );
};

// 4. L'Hook per usare il context
export const useWorkLog = () => {
  const context = useContext(WorkLogContext);
  if (!context) {
    throw new Error("useWorkLog deve essere usato dentro un WorkLogProvider");
  }
  return context;
};