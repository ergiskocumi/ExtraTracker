import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { WorkLog } from "../features/tracker/type";
import { useAuth } from "./AuthContext";

const API_BASE = 'http://localhost:3001/api';

interface WorkLogContextType {
  logs: WorkLog[];
  addWorkLog: (data: Omit<WorkLog, 'id'>) => void;
  deleteLog: (id: string) => void;
  updateLog: (updatedLog: WorkLog) => void;
  refreshLogs: () => void;
}

const WorkLogContext = createContext<WorkLogContextType | undefined>(undefined);

export const WorkLogProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const { isAuthenticated } = useAuth();

  // Funzione per caricare i logs
  const refreshLogs = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`${API_BASE}/worklogs`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Errore fetch logs:", err);
    }
  }, [isAuthenticated]);

  // Carica i log quando autenticato
  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  // 2. POST: Aggiungi log
  const addWorkLog = async (data: Omit<WorkLog, 'id'>) => {
    try {
      const response = await fetch(`${API_BASE}/worklogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const newLog = await response.json();
      setLogs((prev) => [...prev, newLog]);
    } catch (err) {
      console.error("Errore addLog:", err);
    }
  };

  // 3. DELETE: Cancella log
  const deleteLog = async (id: string) => {
    try {
      await fetch(`${API_BASE}/worklogs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      // Aggiorniamo la UI togliendo quello cancellato
      setLogs((prev) => prev.filter(log => log.id !== id));
    } catch (err) {
      console.error("Errore deleteLog:", err);
    }
  };

  // 4. PUT: Modifica log
  const updateLog = async (updatedLog: WorkLog) => {
    try {
      // Separiamo l'ID dal resto dei dati per mandarli nel body
      const { id, ...dataToSend } = updatedLog;
      
      const response = await fetch(`${API_BASE}/worklogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });
      
      const savedLog = await response.json();
      
      // Aggiorniamo la lista locale sostituendo quello vecchio con quello nuovo
      setLogs((prevLogs) =>
        prevLogs.map((log) => (log.id === id ? savedLog : log))
      );
    } catch (err) {
      console.error("Errore updateLog:", err);
    }
  };

  return (
    <WorkLogContext.Provider value={{ logs, addWorkLog, deleteLog, updateLog, refreshLogs }}>
      {children}
    </WorkLogContext.Provider>
  );
};

export const useWorkLog = () => {
  const context = useContext(WorkLogContext);
  if (!context) {
    throw new Error("useWorkLog deve essere usato dentro un WorkLogProvider");
  }
  return context;
};
