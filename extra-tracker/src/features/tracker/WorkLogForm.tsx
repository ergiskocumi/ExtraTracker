import type { Project } from "../projects/type";
import { useEffect, useState } from "react";
import { EditIcon, FolderIcon, CalendarIcon, PlayIcon, StopIcon, PlusIcon, FileTextIcon } from "../../components/icons";
import type { WorkLog, WorkLogFormMode } from "./type";
import DatePicker, { registerLocale } from "react-datepicker";
import { it } from "date-fns/locale/it";
import "react-datepicker/dist/react-datepicker.css";
import { generateTimeSlots } from "../../utils/dateUtils";
import { TimeSelect } from "../../components/TimeSelect";

// Registra la lingua italiana
registerLocale("it", it);

interface WorkLogFormProps {
  projects: Project[];
  onSave: (data: { projectId: string; date: string; startTime: string; endTime: string }) => void;
  initialData: WorkLog | null;
  mode: WorkLogFormMode;
  onCancel: () => void;
}

export const WorkLogForm = ({ projects, onSave, initialData, mode, onCancel }: WorkLogFormProps) => {
  
  const TIME_SLOTS = generateTimeSlots();

  const [formData, setFormData] = useState({
    projectId: initialData?.projectId || "",
    date: initialData?.date || "",
    startTime: initialData?.startTime || "",
    endTime: initialData?.endTime || "",
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialData?.date ? new Date(initialData.date) : null
  );

  // Allinea il form quando cambia il dato in ingresso (edit/smart copy)
  useEffect(() => {
    setFormData({
      projectId: initialData?.projectId || "",
      date: initialData?.date || "",
      startTime: initialData?.startTime || "",
      endTime: initialData?.endTime || "",
    });
    setSelectedDate(initialData?.date ? new Date(initialData.date) : null);
  }, [initialData, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Handler per il DatePicker
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      // Converte in formato YYYY-MM-DD per il form (aggiusta il fuso orario se serve, qui uso ISO semplice)
      // Nota: toISOString() usa UTC. Per mantenere l'ora locale spesso è meglio:
      // const localDate = date.toLocaleDateString('en-CA'); // Format YYYY-MM-DD
      const formattedDate = date.toISOString().split('T')[0];
      setFormData((prevData) => ({ ...prevData, date: formattedDate }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
   
    // Resetta solo quando siamo in inserimento o smart copy
    if (!initialData || mode === "smartCopy") {
      setFormData({ projectId: '', date: '', startTime: '', endTime: '' });
      setSelectedDate(null);
    }
  };

  const isEditing = mode === "edit";
  const isDuplicating = mode === "smartCopy";

  return (
    <div 
      className={`card p-6 animate-scale-in transition-colors duration-300 
      ${isEditing ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
    >
      {/* HEADER DEL FORM */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border
            ${isEditing 
              ? 'bg-amber-500/20 border-amber-500/30' 
              : isDuplicating
                ? 'bg-blue-500/20 border-blue-500/30'
                : 'bg-accent-500/20 border-accent-500/30'}`
          }>
            {isEditing && <EditIcon className="text-amber-400" size={20} />}
            {isDuplicating && <FileTextIcon className="text-blue-400" size={20} />}
            {!isEditing && !isDuplicating && <PlusIcon className="text-accent-400" size={20} />}
          </div>
          
          <div>
            <h3 className={`text-lg font-semibold 
              ${isEditing ? 'text-amber-100' : isDuplicating ? 'text-blue-100' : 'text-white'}`}>
              {isEditing ? 'Modifica Attività' : isDuplicating ? 'Smart Copy' : 'Nuovo Inserimento'}
            </h3>
            <p className="text-sm text-white/50">
              {isEditing 
                ? 'Modifica i dettagli del log selezionato' 
                : isDuplicating 
                  ? 'Copia i dettagli e salva un nuovo log' 
                  : 'Registra le tue ore di lavoro'}
            </p>
          </div>
        </div>

        {(isEditing || isDuplicating) && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm underline transition-colors text-white/50 hover:text-white"
          >
            Annulla
          </button>
        )}
      </div>
      {isDuplicating && (
        <div className="px-4 py-2 mb-4 text-sm border text-blue-100/80 bg-blue-500/10 border-blue-500/30 rounded-xl">
          Smart Copy attiva: controlla data e orari prima di salvare per creare un nuovo log.
        </div>
      )}
      <form 
        onSubmit={handleSubmit}
        className="grid items-end grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        
        {/* 1. SELETTORE PROGETTO */}
        <div className="lg:col-span-1">
          <label className="label">
            <span className="flex items-center gap-1.5"><FolderIcon size={14} /> Progetto</span>
          </label>
          <select 
            name="projectId" 
            required 
            className="select"
            value={formData.projectId} 
            onChange={handleChange}
          >
            <option value="">-- Seleziona --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* 2. DATA */}
        <div>
          <label className="label">
            <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> Data</span>
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="dd/MM/yyyy"
            locale="it"
            placeholderText="Seleziona data"
            className="w-full cursor-pointer input"
            calendarClassName="dark-calendar"
            showPopperArrow={false}
            popperPlacement="top-start"
            popperProps={{
              strategy: "fixed"
            }}
            portalId="datepicker-portal"
            required 
          />
        </div>

          {/* 3. ORA INIZIO */}
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><PlayIcon size={14} /> Inizio</span>
            </label>
            <TimeSelect
              value={formData.startTime}
              onChange={(value) => setFormData((prev) => ({ ...prev, startTime: value }))}
              options={TIME_SLOTS}
              placeholder="-- : --"
              required
            />
          </div>

          {/* 4. ORA FINE */}
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><StopIcon size={14} /> Fine</span>
            </label>
            <TimeSelect
              value={formData.endTime}
              onChange={(value) => setFormData((prev) => ({ ...prev, endTime: value }))}
              options={TIME_SLOTS}
              placeholder="-- : --"
              required
            />
          </div>

       {/* BOTTONE SUBMIT */}
        <div>
          <button 
            type="submit" 
            className={`w-full btn ${isEditing 
              ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-glow-sm' 
              : isDuplicating
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-glow-sm' // Bottone Blu per Duplica
                : 'btn-success'
            }`}
          >
            {isEditing && <EditIcon size={16} />}
            {isDuplicating && !isEditing && <FileTextIcon size={16} />}
            {!isEditing && !isDuplicating && <PlusIcon size={16} />}
            {/* Testo del bottone */}
            <span>
              {isEditing ? 'Salva Modifiche' : isDuplicating ? 'Crea Smart Copy' : 'Aggiungi'}
            </span>
          </button>
        </div>

      </form>
    </div>
  );
};
