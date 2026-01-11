/**
 * AccountInfo - Componente per mostrare le informazioni dell'account
 * 
 * Questo componente mostra l'email dell'account corrente in modo
 * chiaro e accessibile. È un componente puramente presentazionale.
 * 
 * @component
 */

import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { ANIMATION_CONFIG } from './constants';

interface AccountInfoProps {
    /** Email dell'account da mostrare */
    email: string;
}

/**
 * Componente per mostrare l'email dell'account
 * 
 * Mostra l'email in un formato chiaro e leggibile, con un'icona
 * per identificare rapidamente il tipo di informazione.
 */
export function AccountInfo({ email }: AccountInfoProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                duration: ANIMATION_CONFIG.DURATION_LONG, 
                delay: ANIMATION_CONFIG.DELAY_MEDIUM,
                ease: ANIMATION_CONFIG.EASING_SMOOTH 
            }}
            className="rounded-3xl border border-white/[0.1] 
                       bg-gradient-to-br from-gray-800/50 via-gray-800/40 to-gray-900/50
                       backdrop-blur-2xl backdrop-saturate-150
                       shadow-[0_8px_32px_0_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                       p-6 flex items-center gap-4"
        >
            {/* Icona email */}
            <div className="flex-shrink-0 p-3 rounded-xl 
                           bg-violet-500/15
                           border border-violet-500/20
                           backdrop-blur-sm">
                <Mail className="w-5 h-5 text-violet-400" strokeWidth={2.5} />
            </div>
            
            {/* Informazioni email */}
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white/55 mb-1 uppercase tracking-wider">
                    Email account
                </p>
                <p className="text-[16px] font-bold text-white truncate">
                    {email}
                </p>
            </div>
        </motion.div>
    );
}
