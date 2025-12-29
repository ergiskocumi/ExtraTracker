import type { WorkLog } from "./type";
import type { Project } from "../projects/type";
import { calculatesTotalsByProject } from "../../utils/calculations";
import { useFormat } from "../../hooks/useFormat";
import { ClockIcon, CurrencyIcon, ChartIcon, FileTextIcon } from "../../components/icons";

// inizializzo le props che mi servono per questo componente
interface ProjectSummaryProps {
    logs: WorkLog[];
    projects: Project[];
}

//funzione principale del componente ProjectSummary
export const ProjectSummary = ({ logs, projects }: ProjectSummaryProps) => {
    const { formatMoney, formatHours } = useFormat();
    const summaryData = calculatesTotalsByProject(logs, projects);

    if (summaryData.length === 0) {
        return (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
              <FileTextIcon className="text-primary-400" size={28} />
            </div>
            <p className="text-white/60 italic">Nessuna attività registrata per questo periodo.</p>
            <p className="text-sm text-white/40 mt-2">Aggiungi il tuo primo log di lavoro per iniziare!</p>
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
              <div className="icon-container">
                <ClockIcon className="text-primary-400" size={24} />
              </div>
              <div>
                <p className="text-label mb-1">Ore Totali</p>
                <p className="value-large">{formatHours(totalHours)}</p>
              </div>
            </div>
          </div>
          
          <div className="stat-card glow-effect">
            <div className="flex items-center gap-4">
              <div className="icon-container-accent">
                <CurrencyIcon className="text-accent-400" size={24} />
              </div>
              <div>
                <p className="text-label mb-1">Guadagno Totale</p>
                <p className="value-accent">{formatMoney(totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards per progetto */}
        <div>
          <h3 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
            <ChartIcon size={20} /> Dettaglio per Progetto
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaryData.map((item, index) => (
              <div 
                key={item.projectId} 
                className="card p-5 glow-effect animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-sm">
                    <span className="text-white font-bold text-sm">
                      {item.projectName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="badge badge-success">Attivo</span>
                </div>
                
                <h4 className="font-semibold text-white mb-3 text-lg">{item.projectName}</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-white/[0.08]">
                    <span className="text-sm text-white/50">Ore lavorate</span>
                    <span className="font-semibold text-white/80">{formatHours(item.totalHours)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-white/50">Totale</span>
                    <span className="font-bold text-lg text-primary-400">{formatMoney(item.totalAmount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
};
