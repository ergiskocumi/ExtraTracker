/**
 * 🎨 TEMPLATE SELECTOR
 * ====================
 * 
 * Selettore categoria con icone e descrizioni.
 */

import { motion } from 'framer-motion';
import type { WorkEntryCategory } from '../../types';

interface TemplateSelectorProps {
    value: WorkEntryCategory;
    onChange: (category: WorkEntryCategory) => void;
}

const CATEGORIES: Array<{
    value: WorkEntryCategory;
    label: string;
    icon: string;
    description: string;
}> = [
    {
        value: 'development',
        label: 'Development',
        icon: '💻',
        description: 'Codice, commit, branch',
    },
    {
        value: 'documentation',
        label: 'Documentation',
        icon: '📝',
        description: 'Guide, API docs, README',
    },
    {
        value: 'ticket',
        label: 'Ticket',
        icon: '🎫',
        description: 'JIRA, GitHub Issues',
    },
    {
        value: 'meeting',
        label: 'Meeting',
        icon: '🤝',
        description: 'Riunioni, sync',
    },
    {
        value: 'research',
        label: 'Research',
        icon: '🔬',
        description: 'Studio, analisi',
    },
    {
        value: 'freeform',
        label: 'Freeform',
        icon: '📄',
        description: 'Note libere',
    },
];

export const TemplateSelector = ({ value, onChange }: TemplateSelectorProps) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => (
                <motion.button
                    key={cat.value}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onChange(cat.value)}
                    className={`
                        p-4 rounded-xl border-2 transition-all text-left
                        ${value === cat.value
                            ? 'border-primary-500 bg-primary-500/20 shadow-lg shadow-primary-500/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }
                    `}
                >
                    <div className="text-2xl mb-2">{cat.icon}</div>
                    <div className="text-sm font-semibold text-white mb-1">
                        {cat.label}
                    </div>
                    <div className="text-xs text-white/60">
                        {cat.description}
                    </div>
                </motion.button>
            ))}
        </div>
    );
};
