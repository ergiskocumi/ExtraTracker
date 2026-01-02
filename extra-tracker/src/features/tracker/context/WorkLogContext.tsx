import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { WorkLog } from "../type";
import { useAuth } from "../../auth/context/AuthContext";
import { apiClient } from "../../../shared/services/apiClient";
import { emitToast } from "../../../shared/components/toast";

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
      const response = await apiClient.get<WorkLog[]>('/worklogs');
      if (response.success && response.data) {
        setLogs(response.data);
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
      const response = await apiClient.post<WorkLog>('/worklogs', data);
      if (!response.success) return;

      const createdLog = response.data;
      if (!createdLog) return;

      setLogs((prev) => [...prev, createdLog]);
      
      // ✅ Toast di successo
      emitToast.success('Ore registrate con successo!', {
        title: 'Work Log Salvato',
      });
    } catch (err) {
      console.error("Errore addLog:", err);
    }
  };

  // 3. DELETE: Cancella log
  const deleteLog = async (id: string) => {
    try {
      const response = await apiClient.delete<null>(`/worklogs/${id}`);
      if (response.success) {
        // Aggiorniamo la UI togliendo quello cancellato
        setLogs((prev) => prev.filter(log => log.id !== id));
        
        // ✅ Toast di successo
        emitToast.success('Registro eliminato', {
          title: 'Eliminato',
        });
      }
    } catch (err) {
      console.error("Errore deleteLog:", err);
    }
  };

  // 4. PUT: Modifica log
  const updateLog = async (updatedLog: WorkLog) => {
    try {
      // Separiamo l'ID dal resto dei dati per mandarli nel body
      const { id, ...dataToSend } = updatedLog;
      
      const response = await apiClient.put<WorkLog>(`/worklogs/${id}`, dataToSend);
      if (!response.success) return;

      const savedLog = response.data;
      if (!savedLog) return;

      // Aggiorniamo la lista locale sostituendo quello vecchio con quello nuovo
      setLogs((prevLogs) =>
        prevLogs.map((log) => (log.id === id ? savedLog : log))
      );
      
      // ✅ Toast di successo
      emitToast.success('Modifiche salvate!', {
        title: 'Aggiornato',
      });
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
