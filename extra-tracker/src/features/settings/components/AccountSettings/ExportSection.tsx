/**
 * ExportSection - Sezione per l'esportazione dei dati
 * 
 * Questo componente gestisce l'esportazione di tutti i dati dell'utente
 * in formato JSON. È una funzionalità critica per permettere agli utenti
 * di fare backup dei propri dati prima di operazioni rischiose.
 * 
 * @component
 */

import { motion } from 'framer-motion';
import { Database, Download } from 'lucide-react';
import { ANIMATION_CONFIG } from './constants';

interface ExportSectionProps {
    /** Indica se l'operazione di export è in corso */
    isLoading: boolean;
    
    /** Callback chiamato quando l'utente clicca sul pulsante di export */
    onExport: () => Promise<void>;
}

/**
 * Componente per la sezione di esportazione dati
 * 
 * Mostra un'interfaccia chiara e intuitiva per permettere all'utente
 * di scaricare una copia completa dei propri dati. L'animazione
 * e il design sono pensati per comunicare sicurezza e professionalità.
 */
export function ExportSection({ isLoading, onExport }: ExportSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                duration: ANIMATION_CONFIG.DURATION_LONG, 
                ease: ANIMATION_CONFIG.EASING_SMOOTH 
            }}
            className="group relative overflow-hidden rounded-3xl border border-white/[0.1] 
                       bg-gradient-to-br from-gray-800/50 via-gray-800/40 to-gray-900/50
                       backdrop-blur-2xl backdrop-saturate-150
                       shadow-[0_8px_32px_0_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                       p-8 transition-all duration-500
                       hover:border-white/[0.15] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
        >
            {/* Overlay gradient che appare al hover per feedback visivo */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative flex items-start gap-6">
                {/* Icona con animazione al hover per attirare l'attenzione */}
                <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="flex-shrink-0 p-4 rounded-2xl 
                               bg-blue-500/15
                               border border-blue-500/20
                               backdrop-blur-sm"
                >
                    <Database className="w-7 h-7 text-blue-400" strokeWidth={2} />
                </motion.div>
                
                <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                        Esporta dati
                    </h3>
                    <p className="text-[15px] text-white/65 leading-relaxed mb-6 max-w-2xl">
                        Scarica una copia completa dei tuoi dati in formato JSON. Include tutti i tuoi esami, 
                        progetti, flashcard e attività registrate.
                    </p>
                    
                    {/* Pulsante di export con stato di loading */}
                    <motion.button
                        onClick={onExport}
                        disabled={isLoading}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="group/btn relative px-6 py-3.5 rounded-xl
                                   bg-blue-500/20
                                   border border-blue-500/30
                                   text-blue-300 font-semibold text-[15px]
                                   backdrop-blur-sm
                                   hover:bg-blue-500/25
                                   hover:border-blue-400/40
                                   hover:text-blue-200
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-all duration-300
                                   flex items-center gap-2.5"
                    >
                        <Download 
                            className="w-5 h-5 group-hover/btn:translate-y-[-2px] transition-transform duration-300" 
                            strokeWidth={2.5} 
                        />
                        <span>{isLoading ? 'Esportazione...' : 'Esporta dati'}</span>
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
