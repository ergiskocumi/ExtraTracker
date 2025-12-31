import { ProjectForm } from '../features/projects/ProjectForm';
import { useProjects } from '../context/ProjectsContext';

export const ProjectsPage = () => {
    const { projects, addProject } = useProjects();

    return (
        <div className="space-y-8 animate-slide-up">
            <div>
                <h2 className="text-3xl font-bold text-white mb-1">Progetti</h2>
                <p className="text-white/50">Gestisci qui i tuoi clienti e le tariffe orarie</p>
            </div>

            <div className="divider" />

            <ProjectForm projects={projects} onAdd={addProject} />
        </div>
    );
};
