import { useState } from 'react';
import type { Project } from "./type";
import { UserIcon, EuroIcon, SparklesIcon, FileTextIcon, ClockIcon, BriefcaseIcon, CurrencyIcon } from "../../shared/components/icons";
import { useFormat } from '../../shared/hooks/useFormat';
import { FiUser, FiBriefcase } from 'react-icons/fi';

interface ProjectFormProps {
  projects?: Project[];
    onAdd: (params: {
      name: string;
      code: string;
      type: 'CLIENT' | 'PERSONAL';
      rate?: number;
      budget?: number;
      description?: string;
      estimatedHours?: number;
      progress?: number;
    }) => void;
}

export const ProjectForm = ({ projects = [], onAdd }: ProjectFormProps) => {
  const { currencySymbol, defaultHourlyRate } = useFormat();
  const [projectType, setProjectType] = useState<'CLIENT' | 'PERSONAL'>('CLIENT');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const name = formData.get('name') as string;
        const code = formData.get('code') as string;
        const rateRaw = formData.get('rate');
        const rate = rateRaw ? Number(rateRaw) : undefined;
        const budgetRaw = formData.get('budget');
        const budget = budgetRaw ? Number(budgetRaw) : undefined;
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
            budget: projectType === 'CLIENT' ? budget : undefined,
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
      className="space-y-8"
    >
      {/* SEZIONE A: Selezione Tipo Progetto - Card Selezionabili */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-white/90">
          Tipo Progetto <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setProjectType('CLIENT')}
            className={`
              relative p-5 rounded-xl border-2 transition-all text-left group
              ${projectType === 'CLIENT'
                ? 'border-primary-500 bg-primary-500/20 shadow-lg shadow-primary-500/20'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-all
                ${projectType === 'CLIENT'
                  ? 'bg-primary-500/30 text-primary-300'
                  : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white/80'
                }
              `}>
                <FiBriefcase size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white mb-1">Cliente</div>
                <p className="text-sm text-white/60">Progetto fatturabile con tariffa oraria</p>
              </div>
              {projectType === 'CLIENT' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary-500" />
              )}
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setProjectType('PERSONAL')}
            className={`
              relative p-5 rounded-xl border-2 transition-all text-left group
              ${projectType === 'PERSONAL'
                ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-all
                ${projectType === 'PERSONAL'
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white/80'
                }
              `}>
                <FiUser size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white mb-1">Personale</div>
                <p className="text-sm text-white/60">Hobby, studio o progetti personali</p>
              </div>
              {projectType === 'PERSONAL' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-purple-500" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* SEZIONE B: Dettagli Principali */}
      <div className="space-y-4">
        <div className="pb-2 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Dettagli Principali</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-white/80 mb-2">
              <span className="flex items-center gap-1.5">
                <UserIcon size={14} className="text-white/60" />
                Nome Progetto <span className="text-rose-400">*</span>
              </span>
            </label>
            <input 
              name="name" 
              required 
              placeholder="Es. Google, Apple, Progetto Studio..." 
              className="input w-full" 
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-white/80 mb-2">
              <span className="flex items-center gap-1.5">
                Codice / Sigla <span className="text-rose-400">*</span>
              </span>
            </label>
            <input 
              name="code" 
              required 
              placeholder="Es. GOO-01, APP-2024..." 
              className="input w-full uppercase" 
            />
            <p className="mt-1.5 text-xs text-white/40">Usato per identificare rapidamente il progetto</p>
          </div>
        </div>
      </div>

      {/* SEZIONE C: Economia & Stime (Solo per CLIENT) */}
      {projectType === 'CLIENT' && (
        <div className="space-y-4">
          <div className="pb-2 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Budget e Tariffe</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <span className="flex items-center gap-1.5">
                  <EuroIcon size={14} className="text-white/60" />
                  Tariffa Oraria ({currencySymbol}) <span className="text-rose-400">*</span>
                </span>
              </label>
              <input
                name="rate"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={defaultHourlyRate > 0 ? defaultHourlyRate : undefined}
                placeholder="Es. 75.00"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <span className="flex items-center gap-1.5">
                  <CurrencyIcon size={14} className="text-white/60" />
                  Budget Totale ({currencySymbol})
                </span>
              </label>
              <input
                name="budget"
                type="number"
                min="0"
                step="0.01"
                placeholder="Es. 10000.00"
                className="input w-full"
              />
              <p className="mt-1.5 text-xs text-white/40">Opzionale: limite massimo di spesa</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-white/80 mb-2">
                <span className="flex items-center gap-1.5">
                  <ClockIcon size={14} className="text-white/60" />
                  Ore Stimate
                </span>
              </label>
              <input
                name="estimatedHours"
                type="number"
                min="0"
                step="1"
                placeholder="Es. 120"
                className="input w-full"
              />
              <p className="mt-1.5 text-xs text-white/40">💡 Necessario per calcolare le proiezioni e il burn rate</p>
            </div>
          </div>
        </div>
      )}

      {/* SEZIONE D: Dettagli Aggiuntivi */}
      <div className="space-y-4">
        <div className="pb-2 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Dettagli Aggiuntivi</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              <span className="flex items-center gap-1.5">
                Progresso Attuale (%)
              </span>
            </label>
            <input
              name="progress"
              type="number"
              min="0"
              max="100"
              step="5"
              placeholder="Es. 25"
              className="input w-full"
            />
            <p className="mt-1.5 text-xs text-white/40">💡 A che punto sei col lavoro? (0-100%)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              <span className="flex items-center gap-1.5">
                <FileTextIcon size={14} className="text-white/60" />
                Descrizione / Note
              </span>
            </label>
            <textarea 
              name="description" 
              placeholder="Note operative, obiettivi, dettagli..." 
              className="input w-full min-h-[100px] resize-none" 
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Bottoni Azione */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={() => {
            const form = document.querySelector('form');
            if (form) {
              form.reset();
              setProjectType('CLIENT');
            }
          }}
          className="px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all text-sm font-medium"
        >
          Annulla
        </button>
        <button 
          type="submit" 
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 w-full sm:w-auto"
        >
          <SparklesIcon size={16} />
          <span>Salva Progetto</span>
        </button>
      </div>
    </form>
  );
};
