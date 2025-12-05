import type { WorkLog } from "./type";
import type { Project } from "../projects/type";
import { calculateDurationInHours } from "../../utils/dateUtils";
import { formatCurrency } from "../../utils/currencyUtils";
import { ListIcon, TrashIcon, FileTextIcon, } from "../../components/icons";


// import degli oggetti che vogliamo visualizzare poi a scermo
interface WorkLogListProps {
    logs: WorkLog[];
    projects: Project[];
    onDelete: (id:string) => void; // dopo aver implementato la funzione di eliminazione, la passo come prop qua
    onEdit: (log: WorkLog) => void; // funzione per modificare un log esistente
    onDuplicate: (log: WorkLog) => void; // funzione per duplicare un log esistente
  }

export const WorkLogList = ({ logs, projects, onDelete, onEdit, onDuplicate }: WorkLogListProps) => {
    
    // funzione di utilità per ottenere il nome del progetto dato l'ID
    const getProjectName = (projectId: string) => {
        const project = projects.find(p => p.id === projectId); // gli passo un id dell'oggetto e lui da li entra dentro il campo id di project e lo confronta con projectId
        return project ? project.name : "Progetto sconosciuto"; // se trova il progetto ritorna il nome altrimenti "Progetto sconosciuto"
    };

    //funzione che calcola gli euro in base alle ore lavorate e alla tariffa del progetto
    const getHoursEuro = (log: WorkLog, projects: Project): string => {
        const hours = calculateDurationInHours(log.startTime, log.endTime);
        const euros = projects.rate * hours;
        return formatCurrency(euros);
    };

    const calculatedLogAmount = (log: WorkLog): number => {
        const project = projects.find(p => p.id === log.projectId);
        if (!project) return 0; // se non riesco a trovare il progetto ritorno 0

        const hours = calculateDurationInHours(log.startTime, log.endTime);
        return hours * project.rate;
    };

    const totalHours = logs.reduce((total, log) => {
        return total + calculateDurationInHours(log.startTime, log.endTime);
    }, 0);

    const totalAmount = logs.reduce((total, log) => {
        return total + calculatedLogAmount(log);
    }, 0);

    // Formatta la data in modo leggibile
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    };

    if (logs.length === 0) {
      return (
        <div className="p-8 text-center card animate-fade-in">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 border rounded-full bg-primary-500/20 border-primary-500/30">
            <FileTextIcon className="text-primary-400" size={28} />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-white">Nessun log registrato</h3>
          <p className="text-white/50">Inizia ad aggiungere le tue ore di lavoro!</p>
        </div>
      );
    }

    return (
    <div className="overflow-hidden card animate-slide-up">
      <div className="p-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <ListIcon className="text-primary-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Diario di Lavoro</h2>
            <p className="text-sm text-white/50">{logs.length} registrazioni</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Data</th>
              <th>Progetto</th>
              <th>Orario</th>
              <th>Ore</th>
              <th>Importo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={log.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }} >
                <td>
                  <span className="font-medium text-white/80">{formatDate(log.date)}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 border rounded-lg bg-gradient-to-br from-primary-500/30 to-primary-600/30 border-primary-500/30">
                      <span className="text-xs font-bold text-primary-300">
                        {getProjectName(log.projectId).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-white/80">{getProjectName(log.projectId)}</span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-neutral">
                    {log.startTime} - {log.endTime}
                  </span>
                </td>
                <td>
                  <span className="font-semibold text-white/80">
                    {calculateDurationInHours(log.startTime, log.endTime).toFixed(2)} h
                  </span>
                </td>
                <td>
                  <span className="font-bold text-accent-400">
                    {getHoursEuro(log, projects.find(p => p.id === log.projectId)!)}
                  </span>
                </td>
                
                <td>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onDelete(log.id)}
                      className="btn btn-danger py-1.5 px-3 text-xs"
                    >
                      <TrashIcon size={14} />
                      <span>Elimina</span>
                    </button>
                    
                    <button 
                      onClick={() => onEdit(log)} 
                      className="btn py-1.5 px-3 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
                    > 
                      <span>Modifica</span>
                    </button>

                    <button  
                      onClick={() => onDuplicate(log)} 
                      className="btn py-1.5 px-3 text-xs bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-colors" 
                      title="Smart copy: crea un nuovo log copiando questo"
                    > 
                      <FileTextIcon size={14} />
                      <span>Smart Copy</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {/* --- FOOTER TOTALI --- */}
          <tfoot>
            <tr>
              <td colSpan={3} className="text-right">
                <span className="text-white/60">TOTALE GENERALE:</span>
              </td>
              <td>
                <span className="text-lg font-bold text-primary-400">{totalHours.toFixed(2)} h</span>
              </td>
              <td>
                <span className="text-lg font-bold text-accent-400">{formatCurrency(totalAmount)}</span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    );
}
