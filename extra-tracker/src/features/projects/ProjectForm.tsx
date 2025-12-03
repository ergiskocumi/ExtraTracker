import type { Project } from "../projects/type";

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-md">
                <span className="text-white text-lg">🏢</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Gestione Progetti</h3>
                <p className="text-sm text-slate-500">Aggiungi nuovi clienti e tariffe orarie</p>
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
                  <span className="flex items-center gap-1">👤 Nome Cliente</span>
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
                  <span className="flex items-center gap-1">💶 Tariffa Oraria (€)</span>
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
                <span>✨</span>
                <span>Crea Progetto</span>
              </button>
            </form>
          </div>

          {/* Lista Progetti */}
          {projects.length > 0 && (
            <div className="card p-6 animate-slide-up">
              <h4 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                <span>📁</span> Progetti Esistenti ({projects.length})
              </h4>
              <div className="flex flex-wrap gap-3">
                {projects.map((p, index) => (
                  <div 
                    key={p.id} 
                    className="group flex items-center gap-3 bg-gradient-to-r from-slate-50 to-slate-100 
                               border border-slate-200 rounded-xl px-4 py-3 
                               transition-all duration-200 hover:shadow-md hover:border-primary-200
                               hover:from-primary-50 hover:to-indigo-50 animate-scale-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 
                                    flex items-center justify-center shadow-sm 
                                    group-hover:shadow-md transition-shadow">
                      <span className="text-white font-bold text-xs">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700 text-sm">{p.name}</p>
                      <p className="text-xs text-accent-600 font-semibold">{p.rate}€/h</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length === 0 && (
            <div className="card p-8 text-center animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-3xl">🏢</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Nessun progetto</h3>
              <p className="text-slate-500">Crea il tuo primo progetto per iniziare a tracciare le ore!</p>
            </div>
          )}
        </div>
    );
};
