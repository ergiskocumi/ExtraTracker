import type { WorkLog } from "./type";
import type { Project } from "../projects/type";
import { calculatesTotalsByProject } from "../../utils/calculations";
import { formatCurrency } from "../../utils/currencyUtils";

// inizializzo le props che mi servono per questo componente
interface ProjectSummaryProps {
    logs: WorkLog[];
    projects: Project[];
}

//funzione principale del componente ProjectSummary
export const ProjectSummary = ({ logs, projects }: ProjectSummaryProps) => {
    const summaryData = calculatesTotalsByProject(logs, projects);

    if (summaryData.length === 0) {
        return (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-3xl">📋</span>
            </div>
            <p className="text-slate-500 italic">Nessuna attività registrata per questo periodo.</p>
            <p className="text-sm text-slate-400 mt-2">Aggiungi il tuo primo log di lavoro per iniziare!</p>
          </div>
        );
    }

    // Calcola i totali generali
    const totalHours = summaryData.reduce((acc, item) => acc + item.totalHours, 0);
    const totalAmount = summaryData.reduce((acc, item) => acc + item.totalAmount, 0);

    return (
      <div className="space-y-6">
        {/* Riepilogo Generale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card glow-effect">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <span className="text-2xl">⏰</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Ore Totali</p>
                <p className="text-3xl font-bold text-slate-800">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </div>
          
          <div className="stat-card glow-effect">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-100 to-accent-200 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Guadagno Totale</p>
                <p className="text-3xl font-bold text-accent-600">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards per progetto */}
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span>📊</span> Dettaglio per Progetto
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaryData.map((item, index) => (
              <div 
                key={item.projectId} 
                className="card p-5 glow-effect animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">
                      {item.projectName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="badge badge-primary">Attivo</span>
                </div>
                
                <h4 className="font-semibold text-slate-800 mb-3 text-lg">{item.projectName}</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Ore lavorate</span>
                    <span className="font-semibold text-slate-700">{item.totalHours.toFixed(2)} h</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Totale</span>
                    <span className="font-bold text-lg text-primary-600">{formatCurrency(item.totalAmount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
};
