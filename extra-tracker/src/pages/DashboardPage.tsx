import { useState } from 'react'
import DatePicker, { registerLocale } from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { it } from "date-fns/locale/it"
import { enUS } from "date-fns/locale/en-US"
import { es } from "date-fns/locale/es"
import { de } from "date-fns/locale/de"
import { fr } from "date-fns/locale/fr"

import { ProjectSummary } from '../features/tracker/ProjectSummary'
import { WorkLogList } from '../features/tracker/WorkLogList'
import { WorkLogForm } from '../features/tracker/WorkLogForm'
import { GoalsWidget } from '../features/dashboard/GoalsWidget'
import { useFilterMonth } from '../hooks/useFilterMonth'
import { useProjects } from '../context/ProjectsContext'
import { useWorkLog } from '../context/WorkLogContenxt'
import { CalendarIcon } from '../components/icons'
import { useFormat } from '../hooks/useFormat'
import type { WorkLog, WorkLogFormMode } from '../features/tracker/type'

// Registra le lingue supportate (date-fns)
registerLocale("it", it);
registerLocale("en", enUS);
registerLocale("es", es);
registerLocale("de", de);
registerLocale("fr", fr);
export const DashboardPage = () => {

  const { language } = useFormat();

    const { projects } = useProjects();
    const { logs, addWorkLog, deleteLog, updateLog} = useWorkLog(); //aggiunto updateLog
    const { selectedMonth, setSelectedMonth, filteredLogs } = useFilterMonth(logs);

    const [formMode, setFormMode] = useState<WorkLogFormMode>("new");
    const [formData, setFormData] = useState<WorkLog | null>(null);

    const resetFormState = () => {
      setFormMode("new");
      setFormData(null);
    };

    const handleSave = (data: Omit<WorkLog, 'id' | 'description'>) => { 
      if (formMode === "edit" && formData) {
        updateLog({ ...formData, ...data });
      } else {
        addWorkLog(data);
      }
      resetFormState();
    };

    const handleDuplicate = (log: WorkLog) => {
      const today = new Date().toISOString().split('T')[0];
      const smartLog = { 
        ...log, 
        id: "",       
        date: today
      };
      
      setFormData(smartLog); 
      setFormMode("smartCopy"); 
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEdit = (log: WorkLog) => {
      setFormData(log);
      setFormMode("edit");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
   return (
    <div className="space-y-8 animate-slide-up">
      {/* HEADER SEZIONE */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="mb-1 text-3xl font-bold text-white">Dashboard</h2>
          <p className="text-white/50">Monitora le tue ore di lavoro e i guadagni</p>
        </div>
        
        {/* SELETTORE MESE */}
        <div className="flex items-center gap-3 px-4 py-3 card-glass">
          <label className="flex items-center gap-2 text-sm font-medium text-white/60">
            <CalendarIcon size={18} />
            Periodo:
          </label>
          <DatePicker
            selected={selectedMonth ? new Date(selectedMonth + "-01") : new Date()}
            onChange={(date: Date | null) => {
              if (date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                setSelectedMonth(`${year}-${month}`);
              }
            }}
            dateFormat="MMMM yyyy"
            showMonthYearPicker
            locale={language}
            className="w-auto px-3 py-2 capitalize cursor-pointer input"
            calendarClassName="dark-calendar"
            showPopperArrow={false}
            popperPlacement="bottom-end"
            popperProps={{
              strategy: "fixed"
            }}
            portalId="datepicker-portal"
          />
        </div>
      </div>

      {/* RIEPILOGO PROGETTI */}
      <ProjectSummary logs={filteredLogs} projects={projects} />
      
      {/* WIDGET OBIETTIVI */}
      <GoalsWidget />
      
      {/* DIVIDER */}
      <div className="divider" />
      
     {/* FORM INSERIMENTO */}
      <WorkLogForm 
        key={`${formMode}-${formData?.id ?? 'new'}`}
        projects={projects} 
        onSave={handleSave} 
        initialData={formData}  
        mode={formMode}
        onCancel={resetFormState}
      />
      
      <WorkLogList 
        logs={filteredLogs} 
        projects={projects} 
        onDelete={deleteLog} 
        onEdit={handleEdit}
        onDuplicate={handleDuplicate} 
      />
    </div>
  );
};
