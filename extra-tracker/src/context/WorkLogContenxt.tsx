import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { WorkLog } from "../features/tracker/type";

interface WorkLogContextType {
  logs: WorkLog[];
  addWorkLog: (data: Omit<WorkLog, 'id'>) => void;
  deleteLog: (id: string) => void;
  updateLog: (updatedLog: WorkLog) => void;
}

const WorkLogContext = createContext<WorkLogContextType | undefined>(undefined);

export const WorkLogProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<WorkLog[]>([]);

  // 1. GET: Carica i log dal server
  useEffect(() => {
    fetch('http://localhost:5000/api/worklogs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error("Errore fetch logs:", err));
  }, []);

  // 2. POST: Aggiungi log
  const addWorkLog = async (data: Omit<WorkLog, 'id'>) => {
    try {
      const response = await fetch('http://localhost:5000/api/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`http://localhost:5000/api/worklogs/${id}`, {
        method: 'DELETE',
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
      
      const response = await fetch(`http://localhost:5000/api/worklogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    <WorkLogContext.Provider value={{ logs, addWorkLog, deleteLog, updateLog }}>
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
