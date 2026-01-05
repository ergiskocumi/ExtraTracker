/**
 * 📄 FREEFORM TEMPLATE
 * ====================
 * 
 * Template generico per note libere.
 * Nessun campo strutturato, solo note opzionali.
 */

import { FiEdit3 } from 'react-icons/fi';

interface FreeformTemplateProps {
    data: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
}

export const FreeformTemplate = ({ data, onChange }: FreeformTemplateProps) => {
    // Freeform non ha campi strutturati, ma possiamo permettere note aggiuntive
    // Il contenuto principale va nel campo "content" del form principale
    
    return (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
                <FiEdit3 size={18} className="text-primary-400" />
                <h4 className="text-sm font-semibold text-white">Freeform Entry</h4>
            </div>
            <p className="text-xs text-white/60">
                Aggiungi le tue note nel campo "Note / Contenuto" qui sotto.
                Questo template non richiede campi strutturati.
            </p>
        </div>
    );
};
