import { useState } from "react";

type WorkLog = {
  date: string;
};

export const useFilterMonth = ( logs: WorkLog[]) => {
  // creazione del filtro per il mese selezionato
  const currentMonthStr = new Date().toISOString().slice(0,7); 

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const filteredLogs = logs.filter( log => log.date.startsWith(selectedMonth)); 

  return { selectedMonth, setSelectedMonth, filteredLogs };
};