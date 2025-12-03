import type { WorkLog } from "./type";
import type { Project } from "../projects/type";
import { calculateDurationInHours } from "../../utils/dateUtils";
import { formatCurrency } from "../../utils/currencyUtils";


// import degli oggetti che vogliamo visualizzare poi a scermo
interface WorkLogListProps {
    logs: WorkLog[];
    projects: Project[];
    onDelete: (id:string) => void; // dopo aver implementato la funzione di eliminazione, la passo come prop qua
}

export const WorkLogList = ({ logs, projects, onDelete }: WorkLogListProps) => {
    
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

    console.log("DEBUG: ",{logs,projects} )

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
        <div className="card p-8 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-3xl">📝</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Nessun log registrato</h3>
          <p className="text-slate-500">Inizia ad aggiungere le tue ore di lavoro!</p>
        </div>
      );
    }

    return (
    <div className="card overflow-hidden animate-slide-up">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-md">
            <span className="text-white text-lg">📋</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Diario di Lavoro</h2>
            <p className="text-sm text-slate-500">{logs.length} registrazioni</p>
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
              <tr 
                key={log.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td>
                  <span className="font-medium text-slate-700">{formatDate(log.date)}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-600">
                        {getProjectName(log.projectId).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-slate-700">{getProjectName(log.projectId)}</span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-neutral">
                    {log.startTime} - {log.endTime}
                  </span>
                </td>
                <td>
                  <span className="font-semibold text-slate-700">
                    {calculateDurationInHours(log.startTime, log.endTime).toFixed(2)} h
                  </span>
                </td>
                <td>
                  <span className="font-bold text-accent-600">
                    {getHoursEuro(log, projects.find(p => p.id === log.projectId)!)}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => onDelete(log.id)}
                    className="btn btn-danger py-1.5 px-3 text-xs"
                  >
                    <span>🗑️</span>
                    <span>Elimina</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {/* --- FOOTER TOTALI --- */}
          <tfoot>
            <tr>
              <td colSpan={3} className="text-right">
                <span className="text-slate-600">TOTALE GENERALE:</span>
              </td>
              <td>
                <span className="text-primary-600 font-bold text-lg">{totalHours.toFixed(2)} h</span>
              </td>
              <td>
                <span className="text-accent-600 font-bold text-lg">{formatCurrency(totalAmount)}</span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    );
}