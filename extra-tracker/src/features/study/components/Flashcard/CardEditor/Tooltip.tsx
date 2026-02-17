import React from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    side?: 'top' | 'bottom';
    className?: string;
}

/**
 * Tooltip leggero senza dipendenze esterne.
 * Usa Tailwind group-hover per l'animazione.
 * Lo stile scuro è convenzionale per i tooltip in entrambi i temi.
 */
export const Tooltip: React.FC<TooltipProps> = ({
    text,
    children,
    side = 'top',
    className = '',
}) => (
    <div className={`relative group/tip inline-flex ${className}`}>
        {children}
        <div
            role="tooltip"
            className={`
                pointer-events-none select-none absolute z-[300] left-1/2 -translate-x-1/2
                px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap
                bg-slate-900 text-white border border-white/10 shadow-xl
                opacity-0 group-hover/tip:opacity-100
                transition-opacity duration-150 delay-300
                ${side === 'top'
                    ? 'bottom-full mb-2'
                    : 'top-full mt-2'
                }
            `}
        >
            {text}
            {/* Arrow */}
            <span
                className={`
                    absolute left-1/2 -translate-x-1/2 border-4 border-transparent
                    ${side === 'top'
                        ? 'top-full border-t-slate-900'
                        : 'bottom-full border-b-slate-900'
                    }
                `}
                aria-hidden="true"
            />
        </div>
    </div>
);

export default Tooltip;
