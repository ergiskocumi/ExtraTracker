import type { Project } from "../projects/type";
import { useState } from "react";
import { EditIcon, FolderIcon, CalendarIcon, PlayIcon, StopIcon, PlusIcon } from "../../components/icons";
import type { WorkLog } from "./type";
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
  onCancel: () => void;
}

export const WorkLogForm = ({ projects, onSave, initialData, onCancel }: WorkLogFormProps) => {
  
  const TIME_SLOTS = generateTimeSlots();

  const [formData, setFormData] = useState({
    projectId: '',
    date: '',
    startTime: '',
    endTime: ''
  });

  // Stato per il DatePicker (usa Date object)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Handler per il DatePicker
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      // Converte in formato YYYY-MM-DD per il form
      const formattedDate = date.toISOString().split('T')[0];
      setFormData((prevData) => ({ ...prevData, date: formattedDate }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
   
    if (!initialData) {
      setFormData({ projectId: '', date: '', startTime: '', endTime: '' });
      setSelectedDate(null);
    }
  };

  // Helper booleano per pulizia codice
  const isEditing = !!initialData;

  return (
    <div 
      className={`card p-6 animate-scale-in transition-colors duration-300 
      ${isEditing ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
    >
      {/* HEADER DEL FORM */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Cambio icona e colore in base allo stato */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border
            ${isEditing 
              ? 'bg-amber-500/20 border-amber-500/30' 
              : 'bg-accent-500/20 border-accent-500/30'}`
          }>
            {isEditing ? (
              <EditIcon className="text-amber-400" size={20} />
            ) : (
              <PlusIcon className="text-accent-400" size={20} />
            )}
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${isEditing ? 'text-amber-100' : 'text-white'}`}>
              {isEditing ? 'Modifica Attività' : 'Nuovo Inserimento'}
            </h3>
            <p className="text-sm text-white/50">
              {isEditing ? 'Modifica i dettagli del log selezionato' : 'Registra le tue ore di lavoro'}
            </p>
          </div>
        </div>

        {/* TASTO ANNULLA (Visibile solo in modifica) */}
        {isEditing && (
          <button 
            onClick={onCancel}
            className="text-sm transition-colors text-white/40 hover:text-white hover:underline"
          >
            Annulla
          </button>
        )}
      </div>
      
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
              ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-glow-sm' // Stile Modifica (Giallo)
              : 'btn-success' // Stile Nuovo (Verde)
            }`}
          >
            {isEditing ? <EditIcon size={16} /> : <PlusIcon size={16} />}
            <span>{isEditing ? 'Salva' : 'Aggiungi'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
