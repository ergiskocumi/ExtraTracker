import { ProjectSummary } from '../features/tracker/ProjectSummary'
import { WorkLogList } from '../features/tracker/WorkLogList'
import { WorkLogForm } from '../features/tracker/WorkLogForm'
import { useFilterMonth } from '../hooks/useFilterMonth'
import { useProjects } from '../hooks/useProjects'
import { useWorkLog } from '../hooks/useWorkLog'
import { CalendarIcon } from '../components/icons'
import { useState } from 'react'
import type { WorkLog } from '../features/tracker/type'



export const DashboardPage = () => {

    const { projects } = useProjects();
    const { logs, addWorkLog, deleteLog, updateLog} = useWorkLog(); //aggiunto updateLog
    const { selectedMonth, setSelectedMonth, filteredLogs } = useFilterMonth(logs);

    //stato per la modifica
    const [editingLog, setEditingLog] = useState<WorkLog | null>(null);

    const handleSave = (data: Omit<WorkLog, 'id' | 'description'>) => { 
      if (editingLog) {
        //qui dentro siamo in modalita modifica
        updateLog({ ...editingLog, ...data });
        setEditingLog(null); // esci dalla modalita modifica
      } else {
        //qui siamo in modalita aggiunta
        addWorkLog(data);
      }
    }

   return (
    <div className="space-y-8 animate-slide-up">
      {/* HEADER SEZIONE */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Dashboard</h2>
          <p className="text-white/50">Monitora le tue ore di lavoro e i guadagni</p>
        </div>
        
        {/* SELETTORE MESE */}
        <div className="flex items-center gap-3 card-glass px-4 py-3">
          <label className="text-sm font-medium text-white/60 flex items-center gap-2">
            <CalendarIcon size={18} />
            Periodo:
          </label>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input py-2 px-3 w-auto"
          />
        </div>
      </div>

      {/* RIEPILOGO PROGETTI */}
      <ProjectSummary logs={filteredLogs} projects={projects} />
      
      {/* DIVIDER */}
      <div className="divider" />
      
      {/* FORM INSERIMENTO */}
      <WorkLogForm 
      key={editingLog ? editingLog.id : 'new'}
      projects={projects} onSave={handleSave} initialData={editingLog} onCancel={() => setEditingLog(null)} />
      
      {/* LISTA LAVORI */}
      <WorkLogList 
      logs={filteredLogs} 
      projects={projects} 
      onDelete={deleteLog} 
      onEdit={(log) => setEditingLog(log)}
    />
    </div>
  );
};
