import type { Project } from "./type";
import { BuildingIcon, UserIcon, EuroIcon, SparklesIcon, FileTextIcon, ClockIcon, ChartIcon } from "../../shared/components/icons";
import { useFormat } from '../../shared/hooks/useFormat';

interface ProjectFormProps {
  projects?: Project[];
    onAdd: (params: {
      name: string;
      code: string;
      rate: number;
      description?: string;
      estimatedHours?: number;
      progress?: number;
    }) => void;
}

export const ProjectForm = ({ projects = [], onAdd }: ProjectFormProps) => {
  const { currencySymbol, defaultHourlyRate } = useFormat();

  return (
    <div className="card p-6 space-y-5 animate-scale-in">
      <div className="flex items-center gap-3">
        <div className="icon-container">
          <BuildingIcon className="text-primary-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Nuovo Cliente / Progetto</h3>
          <p className="text-sm text-white/50">Definisci tariffa, stima e progresso per attivare il monitoraggio</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);

          const name = formData.get('name') as string;
          const code = formData.get('code') as string;
          const rate = Number(formData.get('rate'));
          const description = formData.get('description') as string;
          const estimatedHoursRaw = formData.get('estimatedHours');
          const estimatedHours = estimatedHoursRaw ? Number(estimatedHoursRaw) : undefined;
          const progressRaw = formData.get('progress');
          const progress = progressRaw ? Number(progressRaw) : undefined;

          if (name && code && rate) {
            onAdd({ name, code, rate, description, estimatedHours, progress });
            e.currentTarget.reset();
          } else {
            alert('Compila tutti i campi obbligatori (Nome, Codice, Tariffa)');
          }
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><UserIcon size={14} /> Nome Cliente *</span>
            </label>
            <input name="name" required placeholder="Es. Google" className="input" />
          </div>
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5">Codice Commessa *</span>
            </label>
            <input name="code" required placeholder="Es. GOO-01" className="uppercase input" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><EuroIcon size={14} /> Tariffa Oraria ({currencySymbol}) *</span>
            </label>
            <input
              name="rate"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={defaultHourlyRate > 0 ? defaultHourlyRate : undefined}
              placeholder="Es. 75"
              className="input"
            />
          </div>
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><ClockIcon size={14} /> Ore Stimate</span>
            </label>
            <input
              name="estimatedHours"
              type="number"
              min="0"
              step="1"
              placeholder="Es. 120"
              className="input"
            />
            <p className="mt-1 text-xs text-white/40">💡 Necessario per calcolare le proiezioni</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><ChartIcon size={14} /> Progresso Attuale (%)</span>
            </label>
            <input
              name="progress"
              type="number"
              min="0"
              max="100"
              step="5"
              placeholder="Es. 25"
              className="input"
            />
            <p className="mt-1 text-xs text-white/40">💡 A che punto sei col lavoro? (0-100%)</p>
          </div>
          <div>
            <label className="label">
              <span className="flex items-center gap-1.5"><FileTextIcon size={14} /> Descrizione</span>
            </label>
            <textarea name="description" placeholder="Note operative..." className="input min-h-[68px]" />
          </div>
        </div>

        <button type="submit" className="btn btn-success w-full md:w-auto">
          <SparklesIcon size={16} />
          <span>Salva Progetto</span>
        </button>
      </form>

      <p className="text-xs text-white/40">Progetti monitorati: {projects.length}</p>
    </div>
  );
};