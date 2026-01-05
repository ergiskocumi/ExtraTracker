/**
 * 📂 PROJECT LIST
 * ===============
 * 
 * Lista progetti con card e form per nuovo progetto.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspace } from '../context/WorkspaceContext';
import { ProjectCard } from './ProjectCard';
import { ProjectForm } from './ProjectForm';
import { FiFolderPlus } from 'react-icons/fi';
import type { WorkProject } from '../types';

interface ProjectListProps {
    projects: WorkProject[];
    loading: boolean;
    selectedProject: string | null;
    onSelectProject: (id: string | null) => void;
    showNewProjectForm: boolean;
    onCloseNewProjectForm: () => void;
}

export const ProjectList = ({
    projects,
    loading,
    selectedProject,
    onSelectProject,
    showNewProjectForm,
    onCloseNewProjectForm,
}: ProjectListProps) => {
    const activeProjects = projects.filter((p) => p.status === 'active');

    if (loading) {
        return (
            <div className="card p-6">
                <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">I Miei Progetti</h3>
                <span className="text-sm text-white/50">{activeProjects.length}</span>
            </div>

            {/* FORM NUOVO PROGETTO */}
            {showNewProjectForm && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    <ProjectForm onClose={onCloseNewProjectForm} />
                </motion.div>
            )}

            {/* LISTA PROGETTI */}
            {activeProjects.length === 0 ? (
                <div className="card p-8 text-center">
                    <FiFolderPlus size={48} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/60 mb-4">Nessun progetto ancora</p>
                    <p className="text-sm text-white/40">
                        Crea il tuo primo progetto per iniziare a tracciare il lavoro
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeProjects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            isSelected={selectedProject === project.id}
                            onClick={() => onSelectProject(
                                selectedProject === project.id ? null : project.id
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
