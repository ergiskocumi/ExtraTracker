/**
 * 📝 DOCUMENTATION TEMPLATE
 * =========================
 * 
 * Template per attività di documentazione.
 * Campi: docType, sections
 */

import { FiFileText, FiList } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import type { DocumentationTemplateData } from '../../types';

interface DocumentationTemplateProps {
    data: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
}

export const DocumentationTemplate = ({ data, onChange }: DocumentationTemplateProps) => {
    const templateData = data as DocumentationTemplateData;
    
    const [docType, setDocType] = useState<'technical' | 'user-guide' | 'api'>(
        templateData?.docType || 'technical'
    );
    const [sections, setSections] = useState<string[]>(templateData?.sections || []);

    useEffect(() => {
        onChange({
            docType: docType || undefined,
            sections: sections.length > 0 ? sections : undefined,
        });
    }, [docType, sections, onChange]);

    const addSection = (value: string) => {
        if (value.trim() && !sections.includes(value.trim())) {
            setSections([...sections, value.trim()]);
        }
    };

    const removeSection = (index: number) => {
        setSections(sections.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            e.preventDefault();
            addSection(e.currentTarget.value);
            e.currentTarget.value = '';
        }
    };

    return (
        <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
                <FiFileText size={18} className="text-primary-400" />
                <h4 className="text-sm font-semibold text-white">Documentation Details</h4>
            </div>

            {/* DOC TYPE */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiFileText size={14} />
                    Tipo Documentazione
                </label>
                <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as typeof docType)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                    <option value="technical">Technical</option>
                    <option value="user-guide">User Guide</option>
                    <option value="api">API Documentation</option>
                </select>
            </div>

            {/* SECTIONS */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiList size={14} />
                    Sezioni (premi Enter per aggiungere)
                </label>
                <input
                    type="text"
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm mb-2"
                    placeholder="Es. Introduzione, Setup, Usage"
                />
                {sections.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {sections.map((section, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-violet-500/20 text-violet-300 text-xs"
                            >
                                {section}
                                <button
                                    type="button"
                                    onClick={() => removeSection(idx)}
                                    className="hover:text-violet-100"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
