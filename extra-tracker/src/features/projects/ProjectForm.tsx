import { useState } from 'react';
import type { Project } from "./type";
import { BuildingIcon, UserIcon, EuroIcon, SparklesIcon, FileTextIcon, ClockIcon, ChartIcon, BriefcaseIcon } from "../../shared/components/icons";
import { useFormat } from '../../shared/hooks/useFormat';

interface ProjectFormProps {
  projects?: Project[];
    onAdd: (params: {
      name: string;
      code: string;
      type: 'CLIENT' | 'PERSONAL';
      rate?: number;
      description?: string;
      estimatedHours?: number;
      progress?: number;
    }) => void;
}

export const ProjectForm = ({ projects = [], onAdd }: ProjectFormProps) => {
  const { currencySymbol, defaultHourlyRate } = useFormat();
  const [projectType, setProjectType] = useState<'CLIENT' | 'PERSONAL'>('CLIENT');

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
          const rateRaw = formData.get('rate');
          const rate = rateRaw ? Number(rateRaw) : undefined;
          const description = formData.get('description') as string;
          const estimatedHoursRaw = formData.get('estimatedHours');
          const estimatedHours = estimatedHoursRaw ? Number(estimatedHoursRaw) : undefined;
          const progressRaw = formData.get('progress');
          const progress = progressRaw ? Number(progressRaw) : undefined;

          // Validazione: rate obbligatorio per CLIENT
          if (projectType === 'CLIENT' && (!rate || rate <= 0)) {
            alert('La tariffa oraria è obbligatoria per progetti CLIENT');
            return;
          }

          if (name && code) {
            onAdd({ 
              name, 
              code, 
              type: projectType,
              rate: projectType === 'CLIENT' ? rate : undefined,
              description, 
              estimatedHours, 
              progress 
            });
            e.currentTarget.reset();
            setProjectType('CLIENT'); // Reset al tipo default
          } else {
            alert('Compila tutti i campi obbligatori (Nome, Codice)');
          }
        }}
        className="space-y-4"
      >
        {/* TIPO PROGETTO */}
        <div>
          <label className="label">
            <span className="flex items-center gap-1.5"><BriefcaseIcon size={14} /> Tipo Progetto *</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProjectType('CLIENT')}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${projectType === 'CLIENT'
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
                }
              `}
            >
              <div className="font-semibold text-white mb-1">Cliente</div>
              <p className="text-xs text-white/60">Progetto fatturabile</p>
            </button>
            <button
              type="button"
              onClick={() => setProjectType('PERSONAL')}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${projectType === 'PERSONAL'
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
                }
              `}
            >
              <div className="font-semibold text-white mb-1">Personale</div>
              <p className="text-xs text-white/60">Senza tariffa</p>
            </button>
          </div>
        </div>
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

        <div className={`grid gap-4 ${projectType === 'CLIENT' ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
          {projectType === 'CLIENT' && (
            <div>
              <label className="label">
                <span className="flex items-center gap-1.5"><EuroIcon size={14} /> Tariffa Oraria ({currencySymbol}) *</span>
              </label>
              <input
                name="rate"
                type="number"
                min="0"
                step="0.01"
                required={projectType === 'CLIENT'}
                defaultValue={defaultHourlyRate > 0 ? defaultHourlyRate : undefined}
                placeholder="Es. 75"
                className="input"
              />
            </div>
          )}
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