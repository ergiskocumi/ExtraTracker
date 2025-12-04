import type { Project } from "../projects/type";
import { BuildingIcon, UserIcon, EuroIcon, SparklesIcon, FolderIcon, FileTextIcon, } from "../../components/icons";

interface ProjectFormProps {
    projects: Project[];
    // Aggiorniamo la firma della prop onAdd
    onAdd: (name: string, code: string, rate: number, description?: string) => void;
}

export const ProjectForm = ({ projects, onAdd }: ProjectFormProps) => {
    return (
        <div className="space-y-6">
          {/* Form Card */}
          <div className="p-6 card animate-scale-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container">
                <BuildingIcon className="text-primary-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Gestione Progetti</h3>
                <p className="text-sm text-white/50">Aggiungi nuovi clienti e tariffe orarie</p>
              </div>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                // Recuperiamo TUTTI i dati
                const name = formData.get('name') as string;
                const code = formData.get('code') as string;
                const rate = Number(formData.get('rate'));
                const description = formData.get('description') as string;
                
                // Controllo validità (nome, codice e tariffa sono obbligatori)
                if (name && code && rate) {
                  onAdd(name, code, rate, description);
                  e.currentTarget.reset();
                } else {
                  alert("Compila tutti i campi obbligatori (Nome, Codice, Tariffa)");
                }
              }}
              className="grid items-start grid-cols-1 gap-4 md:grid-cols-2"
            >
              {/* Nome Cliente */}
              <div>
                <label className="label">
                  <span className="flex items-center gap-1.5"><UserIcon size={14} /> Nome Cliente *</span>
                </label>
                <input name="name" required placeholder="Es. Google" className="input" />
              </div>

              {/* Codice Commessa (NUOVO) */}
              <div>
                <label className="label">
                  <span className="flex items-center gap-1.5"> Codice Commessa *</span>
                </label>
                <input name="code" required placeholder="Es. GOO-01" className="uppercase input" />
              </div>
              
              {/* Tariffa */}
              <div>
                <label className="label">
                  <span className="flex items-center gap-1.5"><EuroIcon size={14} /> Tariffa Oraria (€) *</span>
                </label>
                <input name="rate" type="number" required placeholder="Es. 50" className="input" />
              </div>

              {/* Descrizione (NUOVO - Opzionale) */}
              <div>
                <label className="label">
                  <span className="flex items-center gap-1.5"><FileTextIcon size={14} /> Descrizione</span>
                </label>
                <input name="description" placeholder="Note aggiuntive..." className="input" />
              </div>

              {/* Bottone a tutta larghezza su mobile, 2 colonne su desktop */}
              <div className="mt-2 md:col-span-2">
                <button type="submit" className="w-full btn btn-success md:w-auto">
                  <SparklesIcon size={16} />
                  <span>Crea Progetto</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista Progetti Esistenti */}
          {projects.length > 0 && (
            <div className="p-6 card animate-slide-up">
              <h4 className="flex items-center gap-2 mb-4 text-sm font-semibold text-white/60">
                <FolderIcon size={16} /> Progetti Esistenti ({projects.length})
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p, index) => (
                  <div 
                    key={p.id} 
                    className="group flex flex-col bg-white/[0.03]
                               border border-white/[0.08] rounded-xl p-4
                               transition-all duration-200 hover:bg-white/[0.06] hover:border-primary-500/30
                               animate-scale-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-glow-sm">
                          <span className="text-xs font-bold text-white">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-white">{p.name}</span>
                      </div>
                      <span className="px-2 py-1 font-mono text-xs rounded bg-white/10 text-white/60">
                        {p.code}
                      </span>
                    </div>
                    
                    <div className="flex items-end justify-between mt-2">
                      <p className="text-xs text-white/40 truncate max-w-[70%]">
                        {p.description || "Nessuna descrizione"}
                      </p>
                      <p className="text-sm font-bold text-accent-400">{p.rate} €/h</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
    );
};