/**
 * 🎨 TOAST COMPONENT - Componente UI per singolo Toast
 * 
 * 🎓 PRINCIPIO: Single Responsibility
 * Questo componente si occupa SOLO della presentazione visiva.
 * Non conosce né gestisce lo stato globale dei toast.
 * 
 * 🎓 PRINCIPIO: Composition over Inheritance
 * Componiamo classi Tailwind invece di creare gerarchie CSS complesse.
 */

import { useEffect, useState, useCallback, type JSX } from 'react';
import type { Toast as ToastType, ToastType as ToastVariant } from './types';

// ==========================================
// ICONE SVG - Inline per evitare dipendenze
// ==========================================

/**
 * 🎓 PRINCIPIO: Dependency Inversion
 * Definiamo le icone inline invece di dipendere da librerie esterne.
 * Questo rende il componente più leggero e indipendente.
 */
const icons: Record<ToastVariant, JSX.Element> = {
    success: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    info: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

// ==========================================
// STILI PER TIPO DI TOAST - GLASSMORPHISM
// ==========================================

/**
 * 🎓 PRINCIPIO: Open/Closed
 * Questa mappa è aperta all'estensione (nuovi tipi) ma chiusa alla modifica.
 * Per aggiungere un nuovo tipo, basta aggiungere una entry qui.
 * 
 * 🎨 GLASSMORPHISM EFFECT (stile iPhone):
 * - backdrop-blur-xl: Sfocatura dello sfondo
 * - bg-opacity: Opacità che lascia intravedere i colori sottostanti
 * - border: Bordo sottile con opacità
 * - shadow-2xl: Ombra profonda per effetto elevazione
 */
const toastStyles: Record<ToastVariant, string> = {
    success: 'backdrop-blur-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-100 shadow-2xl shadow-emerald-500/20',
    error: 'backdrop-blur-xl bg-red-500/10 border border-red-400/30 text-red-100 shadow-2xl shadow-red-500/20',
    warning: 'backdrop-blur-xl bg-amber-500/10 border border-amber-400/30 text-amber-100 shadow-2xl shadow-amber-500/20',
    info: 'backdrop-blur-xl bg-primary-500/10 border border-primary-400/30 text-primary-100 shadow-2xl shadow-primary-500/20',
};

const iconStyles: Record<ToastVariant, string> = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-primary-400',
};

const progressStyles: Record<ToastVariant, string> = {
    success: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
    error: 'bg-gradient-to-r from-red-400 to-red-500',
    warning: 'bg-gradient-to-r from-amber-400 to-amber-500',
    info: 'bg-gradient-to-r from-primary-400 to-primary-500',
};

// ==========================================
// COMPONENTE TOAST
// ==========================================

interface ToastProps {
    toast: ToastType;
    onDismiss: (id: string) => void;
}

export const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    // Stato per animazioni di entrata/uscita
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    // Stato per la progress bar
    const [progress, setProgress] = useState(100);

    const duration = toast.duration ?? 5000;
    const dismissible = toast.dismissible ?? true;

    /**
     * 🎓 PATTERN: useCallback per Memoizzazione
     * Memorizziamo la funzione di dismissione per evitare re-render inutili
     * e per poterla usare come dependency stabile negli useEffect.
     */
    const handleDismiss = useCallback(() => {
        setIsLeaving(true);
        // Aspetta che l'animazione di uscita finisca prima di rimuovere
        setTimeout(() => onDismiss(toast.id), 300);
    }, [onDismiss, toast.id]);

    // Animazione di entrata
    useEffect(() => {
        // Piccolo delay per triggerare la transizione CSS
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    // Auto-dismiss con progress bar
    useEffect(() => {
        if (duration <= 0) return; // Duration 0 = toast permanente

        // #region agent log
        const toastId = toast.id;
        fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ToastItem.tsx:125',message:'Toast interval started',data:{toastId,duration,intervalMs:50},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        const startTime = Date.now();
        let intervalCount = 0;
        // OTTIMIZZATO: Usa requestAnimationFrame invece di setInterval per migliore performance
        let rafId: number | null = null;
        const updateProgress = () => {
            intervalCount++;
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            // #region agent log
            if (intervalCount % 20 === 0) { // Log ogni secondo (20 * 50ms)
                fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ToastItem.tsx:138',message:'Toast interval running',data:{toastId,intervalCount,elapsed,remaining},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            }
            // #endregion

            if (remaining <= 0) {
                handleDismiss();
            } else {
                rafId = requestAnimationFrame(updateProgress);
            }
        };
        rafId = requestAnimationFrame(updateProgress);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ToastItem.tsx:150',message:'Toast interval cleaned',data:{toastId,intervalCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
        };
    }, [duration, handleDismiss, toast.id]);

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={`
                relative overflow-hidden
                w-full max-w-sm
                rounded-2xl
                transform transition-all duration-300 ease-out
                ${toastStyles[toast.type]}
                ${isVisible && !isLeaving 
                    ? 'translate-x-0 opacity-100 scale-100' 
                    : 'translate-x-full opacity-0 scale-95'
                }
            `}
        >
            {/* Inner glow effect per maggiore profondità */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-2xl" />
            
            <div className="relative p-4">
                <div className="flex items-start gap-3">
                    {/* Icona con background glassmorphism */}
                    <span className={`
                        flex-shrink-0 p-2 rounded-xl
                        backdrop-blur-sm bg-white/5
                        border border-white/10
                        ${iconStyles[toast.type]}
                    `}>
                        {icons[toast.type]}
                    </span>

                    {/* Contenuto */}
                    <div className="flex-1 min-w-0">
                        {toast.title && (
                            <p className="font-semibold text-sm mb-1 text-white/90">
                                {toast.title}
                            </p>
                        )}
                        <p className="text-sm text-white/70">
                            {toast.message}
                        </p>
                        
                        {/* Action Button (opzionale) */}
                        {toast.action && (
                            <button
                                onClick={toast.action.onClick}
                                className={`
                                    mt-2 px-3 py-1.5 text-xs font-medium rounded-lg
                                    backdrop-blur-sm bg-white/10 hover:bg-white/20
                                    border border-white/20
                                    transition-all duration-200
                                    focus:outline-none focus:ring-2 focus:ring-white/30
                                    ${iconStyles[toast.type]}
                                `}
                            >
                                {toast.action.label}
                            </button>
                        )}
                    </div>

                    {/* Pulsante Chiusura */}
                    {dismissible && (
                        <button
                            onClick={handleDismiss}
                            className="
                                flex-shrink-0 p-1.5 rounded-lg
                                backdrop-blur-sm hover:bg-white/10
                                border border-transparent hover:border-white/10
                                text-white/50 hover:text-white/80
                                transition-all duration-200
                                focus:outline-none focus:ring-2 focus:ring-white/30
                            "
                            aria-label="Chiudi notifica"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar con glassmorphism */}
            {duration > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 backdrop-blur-sm">
                    <div
                        className={`h-full transition-all duration-50 ${progressStyles[toast.type]} shadow-lg`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
};
