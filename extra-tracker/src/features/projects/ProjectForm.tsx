import type { Project } from "../projects/type";
import { BuildingIcon, UserIcon, EuroIcon, SparklesIcon, FolderIcon } from "../../components/icons";

interface ProjectFormProps {
    projects: Project[];
    onAdd: (name: string, rate: number) => void;
}

export const ProjectForm = ({ projects, onAdd }: ProjectFormProps) => {
    return (
        <div className="space-y-6">
          {/* Form Card */}
          <div className="card p-6 animate-scale-in">
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
                // Trucco per leggere i dati dal form senza creare stati (Uncontrolled)
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const rate = Number(formData.get('rate'));
                
                if (name && rate) {
                  onAdd(name, rate);
                  e.currentTarget.reset(); // Pulisce il form
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
            >
              <div>
                <label className="label">
                  <span className="flex items-center gap-1.5"><UserIcon size={14} /> Nome Cliente</span>
                </label>
                <input 
                  name="name" 
                  required 
                  placeholder="Es. Google" 
                  className="input" 
                />
              </div>
              
              <div>
                <label className="label">
                  <span className="flex items-center gap-1.5"><EuroIcon size={14} /> Tariffa Oraria (€)</span>
                </label>
                <input 
                  name="rate" 
                  type="number" 
                  required 
                  placeholder="Es. 50" 
                  className="input" 
                />
              </div>

              <button type="submit" className="btn btn-success">
                <SparklesIcon size={16} />
                <span>Crea Progetto</span>
              </button>
            </form>
          </div>

          {/* Lista Progetti */}
          {projects.length > 0 && (
            <div className="card p-6 animate-slide-up">
              <h4 className="text-sm font-semibold text-white/60 mb-4 flex items-center gap-2">
                <FolderIcon size={16} /> Progetti Esistenti ({projects.length})
              </h4>
              <div className="flex flex-wrap gap-3">
                {projects.map((p, index) => (
                  <div 
                    key={p.id} 
                    className="group flex items-center gap-3 bg-white/[0.03]
                               border border-white/[0.08] rounded-xl px-4 py-3 
                               transition-all duration-200 hover:bg-white/[0.06] hover:border-primary-500/30
                               animate-scale-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 
                                    flex items-center justify-center shadow-glow-sm 
                                    group-hover:shadow-glow transition-shadow">
                      <span className="text-white font-bold text-xs">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white/80 text-sm">{p.name}</p>
                      <p className="text-xs text-accent-400 font-semibold">{p.rate}€/h</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length === 0 && (
            <div className="card p-8 text-center animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
                <BuildingIcon className="text-primary-400" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Nessun progetto</h3>
              <p className="text-white/50">Crea il tuo primo progetto per iniziare a tracciare le ore!</p>
            </div>
          )}
        </div>
    );
};
