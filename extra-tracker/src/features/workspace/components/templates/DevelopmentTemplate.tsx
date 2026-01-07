/**
 * 💻 DEVELOPMENT TEMPLATE
 * =======================
 * 
 * Template per attività di sviluppo.
 * Campi: branch, commits, filesChanged, status
 */

import { useState, useEffect } from 'react';
import { FiGitBranch, FiCode, FiFile, FiCheckCircle } from 'react-icons/fi';
import type { DevelopmentTemplateData } from '../../types';

interface DevelopmentTemplateProps {
    data: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
}

export const DevelopmentTemplate = ({ data, onChange }: DevelopmentTemplateProps) => {
    const templateData = data as DevelopmentTemplateData;
    
    const [branch, setBranch] = useState(templateData?.branch || '');
    const [commits, setCommits] = useState<string[]>(templateData?.commits || []);
    const [filesChanged, setFilesChanged] = useState<string[]>(templateData?.filesChanged || []);
    const [status, setStatus] = useState<'draft' | 'in-progress' | 'completed' | 'blocked'>(
        templateData?.status || 'in-progress'
    );

    // Aggiorna il parent quando cambiano i valori
    useEffect(() => {
        onChange({
            branch: branch || undefined,
            commits: commits.length > 0 ? commits : undefined,
            filesChanged: filesChanged.length > 0 ? filesChanged : undefined,
            status: status || undefined,
        });
    }, [branch, commits, filesChanged, status, onChange]);

    const addItem = (list: string[], setList: (items: string[]) => void, value: string) => {
        if (value.trim() && !list.includes(value.trim())) {
            setList([...list, value.trim()]);
        }
    };

    const removeItem = (list: string[], setList: (items: string[]) => void, index: number) => {
        setList(list.filter((_, i) => i !== index));
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        list: string[],
        setList: (items: string[]) => void
    ) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            e.preventDefault();
            addItem(list, setList, e.currentTarget.value);
            e.currentTarget.value = '';
        }
    };

    return (
        <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
                <FiCode size={18} className="text-primary-400" />
                <h4 className="text-sm font-semibold text-white">Development Details</h4>
            </div>

            {/* BRANCH */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiGitBranch size={14} />
                    Branch
                </label>
                <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="Es. feature/auth-jwt"
                />
            </div>

            {/* COMMITS */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiCode size={14} />
                    Commits (premi Enter per aggiungere)
                </label>
                <input
                    type="text"
                    onKeyDown={(e) => handleKeyDown(e, commits, setCommits)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm mb-2"
                    placeholder="Es. abc123"
                />
                {commits.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {commits.map((commit, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary-500/20 text-primary-300 text-xs font-mono"
                            >
                                {commit}
                                <button
                                    type="button"
                                    onClick={() => removeItem(commits, setCommits, idx)}
                                    className="hover:text-primary-100"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* FILES CHANGED */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiFile size={14} />
                    File modificati (premi Enter per aggiungere)
                </label>
                <input
                    type="text"
                    onKeyDown={(e) => handleKeyDown(e, filesChanged, setFilesChanged)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm mb-2"
                    placeholder="Es. auth.ts"
                />
                {filesChanged.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {filesChanged.map((file, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs"
                            >
                                {file}
                                <button
                                    type="button"
                                    onClick={() => removeItem(filesChanged, setFilesChanged, idx)}
                                    className="hover:text-emerald-100"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* STATUS */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiCheckCircle size={14} />
                    Status
                </label>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                    <option value="draft">Draft</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                </select>
            </div>
        </div>
    );
};
