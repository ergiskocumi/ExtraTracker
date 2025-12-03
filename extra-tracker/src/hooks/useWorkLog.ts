import { useState,useEffect } from "react";
import type { WorkLog } from "../features/tracker/type";
import { MOCK_WORKLOGS } from "../data";

export const useWorkLog = () => {
// 1. Inizializziamo lo stato con i dati finti, ma ora almeno è modificabile.
  const [logs, setLogs] = useState<WorkLog[]>(() => {
    const savedData = localStorage.getItem('work-tracker-data');
     return savedData ? JSON.parse(savedData) : MOCK_WORKLOGS; //operatore ternario direttametne per risparmiare delle righe
  });

    //2. salvataggio effettivo dei dati nel local storage ogni volta che logs cambia
  useEffect(() => {
    localStorage.setItem('work-tracker-data', JSON.stringify(logs));
  }, [logs]);


    const addWorkLog = ( data: { projectId: string; date: string; startTime: string; endTime: string} ) => {
      const newLog: WorkLog = {
        id: Date.now().toString(), // Genera un ID unico basato sul timestamp
        ...data
    };
    setLogs([...logs, newLog]);
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

  return { logs, addWorkLog, deleteLog, updateLog};
};
