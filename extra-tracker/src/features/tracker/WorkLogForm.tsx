import type { Project } from "../projects/type";
import { useState } from "react";
import { EditIcon, FolderIcon, CalendarIcon, PlayIcon, StopIcon, PlusIcon } from "../../components/icons";
import type { WorkLog } from "./type";

interface WorkLogFormProps {
  projects: Project[];
  onSave: (data: { projectId: string; date: string; startTime: string; endTime: string }) => void;
  initialData: WorkLog | null;
  onCancel: () => void;
}

export const WorkLogForm = ({ projects, onSave, initialData, onCancel }: WorkLogFormProps) => {
  
  const [formData, setFormData] = useState({
    projectId: '',
    date: '',
    startTime: '',
    endTime: ''
  });


  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
   
    if (!initialData) {
      setFormData({ projectId: '', date: '', startTime: '', endTime: '' });
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
            className="text-sm text-white/40 hover:text-white hover:underline transition-colors"
          >
            Annulla
          </button>
        )}
      </div>
      
      <form 
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
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
          <input 
            type="date" 
            name="date" 
            required 
            className="input" 
            value={formData.date} 
            onChange={handleChange} 
          />
        </div>

        {/* 3. ORA INIZIO */}
        <div>
          <label className="label">
            <span className="flex items-center gap-1.5"><PlayIcon size={14} /> Inizio</span>
          </label>
          <input 
            type="time" 
            name="startTime" 
            required 
            className="input" 
            value={formData.startTime} 
            onChange={handleChange} 
          />
        </div>

        {/* 4. ORA FINE */}
        <div>
          <label className="label">
            <span className="flex items-center gap-1.5"><StopIcon size={14} /> Fine</span>
          </label>
          <input 
            type="time" 
            name="endTime" 
            required 
            className="input" 
            value={formData.endTime} 
            onChange={handleChange} 
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