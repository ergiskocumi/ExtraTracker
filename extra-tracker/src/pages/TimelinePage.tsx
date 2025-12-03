
import { useState } from "react";
import { motion } from "framer-motion"; // Libreria animazioni
import { useWorkLog } from "../context/WorkLogContenxt";
import { useProjects } from "../context/ProjectsContext";
import { useFilterMonth } from "../hooks/useFilterMonth";
import { CalendarIcon, ClockIcon, FolderIcon } from "../components/icons";
import { formatCurrency } from "../utils/currencyUtils";
import { calculateDurationInHours } from "../utils/dateUtils";
import { FaBriefcase, FaCode, FaCoffee } from "react-icons/fa"; // Icone generiche

export const TimelinePage = () => {
  // 1. Recuperiamo i dati dal Context
  const { logs } = useWorkLog();
  const { projects } = useProjects();
  
  // 2. Filtri (Vogliamo vedere la timeline del mese selezionato)
  const { selectedMonth, setSelectedMonth, filteredLogs } = useFilterMonth(logs);

  // 3. Stato per gestire quale card è stata cliccata
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // 4. Ordiniamo i log dal più recente al più vecchio (così i nuovi sono in alto)
  const sortedLogs = [...filteredLogs].sort((a, b) => 
    new Date(b.date + 'T' + b.startTime).getTime() - new Date(a.date + 'T' + a.startTime).getTime()
  );

  // Helper per trovare il log selezionato
  const selectedLog = logs.find(l => l.id === selectedLogId);
  const selectedProject = selectedLog ? projects.find(p => p.id === selectedLog.projectId) : null;

  return (
    <div className="min-h-screen animate-fade-in pb-10">
      
      {/* HEADER DELLA PAGINA */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">La tua Timeline</h2>
          <p className="text-white/50">Ripercorri la tua storia lavorativa</p>
        </div>
        
        {/* Selettore Mese */}
        <div className="flex items-center gap-3 card-glass px-4 py-3">
          <CalendarIcon size={18} />
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input py-1 px-2 w-auto border-none bg-transparent focus:ring-0"
          />
        </div>
      </div>

      {/* --- LAYOUT MASTER-DETAIL (GRIGLIA) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLONNA SINISTRA: TIMELINE LIST (occupa 5 colonne su 12) */}
        <div className="lg:col-span-5 space-y-8 relative">
          
          {/* La linea verticale centrale */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-primary-500/20 to-transparent" />

          {sortedLogs.length === 0 && (
            <p className="text-white/40 ml-16 italic">Nessuna attività in questo periodo.</p>
          )}

          {sortedLogs.map((log, index) => {
            const project = projects.find(p => p.id === log.projectId);
            const isSelected = selectedLogId === log.id;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedLogId(log.id)}
                className="relative pl-16 cursor-pointer group"
              >
                {/* Pallino sulla linea */}
                <div className={`absolute left-[26px] top-5 w-4 h-4 rounded-full border-2 
                  ${isSelected ? 'bg-accent-500 border-accent-300 scale-125' : 'bg-dark-500 border-primary-500'} 
                  transition-all duration-300 z-10`} 
                />

                {/* Card della Timeline */}
                <div className={`p-5 rounded-2xl border transition-all duration-300
                  ${isSelected 
                    ? 'bg-primary-500/20 border-primary-500/50 shadow-glow-sm' 
                    : 'card hover:bg-white/[0.08] border-white/[0.05]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-primary-300 uppercase tracking-wider">
                      {new Date(log.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short'})}
                    </span>
                    <span className="text-xs text-white/40 font-mono">
                      {log.startTime}
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-bold text-white mb-1">
                    {project?.name || 'Progetto Sconosciuto'}
                  </h4>
                  
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <ClockIcon size={14} />
                    <span>{calculateDurationInHours(log.startTime, log.endTime).toFixed(2)} ore</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>


        {/* COLONNA DESTRA: DETTAGLIO (occupa 7 colonne su 12) */}
        <div className="lg:col-span-7">
          <div className="sticky top-24">
            
            {selectedLog ? (
              <motion.div 
                key={selectedLog.id} // La key forza l'animazione al cambio
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8 border-t-4 border-t-accent-500"
              >
                {/* INTESTAZIONE DETTAGLIO */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                      {selectedProject?.name}
                    </h1>
                    <div className="flex items-center gap-3">
                      <span className="badge badge-primary px-3 py-1 text-sm">
                        {selectedProject?.code}
                      </span>
                      <span className="text-white/50 text-sm">
                        {new Date(selectedLog.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <FaBriefcase className="text-white text-2xl" />
                  </div>
                </div>

                {/* GRIGLIA INFO */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.05]">
                    <p className="text-sm text-white/50 mb-1">Orario</p>
                    <p className="text-xl font-mono text-white">
                      {selectedLog.startTime} - {selectedLog.endTime}
                    </p>
                  </div>
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.05]">
                    <p className="text-sm text-white/50 mb-1">Durata</p>
                    <p className="text-xl font-bold text-white">
                      {calculateDurationInHours(selectedLog.startTime, selectedLog.endTime).toFixed(2)} h
                    </p>
                  </div>
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.05]">
                    <p className="text-sm text-white/50 mb-1">Tariffa</p>
                    <p className="text-xl text-white">
                      {selectedProject?.rate} €/h
                    </p>
                  </div>
                  <div className="bg-accent-500/10 p-4 rounded-xl border border-accent-500/20">
                    <p className="text-sm text-accent-300 mb-1">Guadagno</p>
                    <p className="text-2xl font-bold text-accent-400">
                      {formatCurrency(calculateDurationInHours(selectedLog.startTime, selectedLog.endTime) * (selectedProject?.rate || 0))}
                    </p>
                  </div>
                </div>

                {/* DESCRIZIONE (Se ci fosse nel tipo WorkLog, per ora mettiamo un placeholder) */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-2">Note di lavoro</h4>
                  <p className="text-white/70 leading-relaxed bg-black/20 p-4 rounded-lg">
                    {selectedLog.description || "Nessuna descrizione aggiuntiva per questo lavoro."}
                  </p>
                </div>

              </motion.div>
            ) : (
              // EMPTY STATE (Se non ho selezionato nulla)
              <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <FaCode className="text-4xl text-white/30" />
                </div>
                <h3 className="text-xl font-semibold text-white">Seleziona un'attività</h3>
                <p className="text-white/50">Clicca sulla timeline a sinistra per vedere i dettagli.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};