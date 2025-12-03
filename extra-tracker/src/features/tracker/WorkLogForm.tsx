import type { Project } from "../projects/type";
import { useState } from "react";
import { EditIcon, FolderIcon, CalendarIcon, PlayIcon, StopIcon, PlusIcon } from "../../components/icons";



interface WorkLogFormProps {
  projects: Project[];
  //qua si dichiara l'oggetto che ci aspettiamo esattametne di ricervere dal FORM appena creato. 
  onAdd: (logData: {projectId: string; date: string; startTime: string; endTime: string}) => void;
}

export const WorkLogForm = ({ projects, onAdd }: WorkLogFormProps) => {

    //qui dichiaro l'oggetto e lo stato iniziale del form che è vuoto ma so già cosa mi aspetto
    const [formData, setFormData] = useState({
        projectId: '',
        date: '',
        startTime: '',
        endTime: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        // praticamente vado a cambiare lo stato del form ogni volta che l'utente interagisce con un campo
        setFormData((prevData) => ({...prevData, [name]: value}));
    };

    //funzione che va a renderizzare il form dopo l'invio del utente. 
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        //qui vengono passati i dati all' APP principale, con i dati che ha inserito l'utente dopo aver compilato il form
        onAdd(formData);
        setFormData({ projectId: '', date: '', startTime: '', endTime: ''});  // resetto il form dopo l'invio
    };


  return (
    <div className="card p-6 animate-scale-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="icon-container-accent">
          <EditIcon className="text-accent-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Nuovo Inserimento</h3>
          <p className="text-sm text-white/50">Registra le tue ore di lavoro</p>
        </div>
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
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
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

        {/* BOTTONE */}
        <div>
          <button type="submit" className="btn btn-success w-full">
            <PlusIcon size={16} />
            <span>Aggiungi</span>
          </button>
        </div>

      </form>
    </div>
  );
};