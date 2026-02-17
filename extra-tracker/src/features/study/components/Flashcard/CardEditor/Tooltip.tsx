import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    side?: 'top' | 'bottom';
    className?: string;
}

const HOVER_DELAY_MS = 280;
const TOOLTIP_OFFSET = 8;
/** Altezza stimata per posizionare senza misurare il tooltip al primo paint */
const TOOLTIP_HEIGHT_ESTIMATE = 32;

/**
 * Z-index per tooltip in portal: deve essere superiore a tutti i modali/overlay.
 * FullscreenEditModal e altri usano 99999; i tooltip devono stare sopra.
 */
const TOOLTIP_Z_INDEX = 100000;

/**
 * Tooltip in portal: tema light/dark, sempre sopra modali e overlay (z-index),
 * non tagliato da overflow-hidden. Posizione da trigger, stile curato.
 */
export const Tooltip: React.FC<TooltipProps> = ({
    text,
    children,
    side = 'top',
    className = '',
}) => {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = useCallback(() => {
        delayRef.current = setTimeout(() => setVisible(true), HOVER_DELAY_MS);
    }, []);

    const hide = useCallback(() => {
        if (delayRef.current) {
            clearTimeout(delayRef.current);
            delayRef.current = null;
        }
        setVisible(false);
        setPosition(null);
    }, []);

    useLayoutEffect(() => {
        if (!visible || !triggerRef.current) return;
        const tr = triggerRef.current.getBoundingClientRect();
        const left = tr.left + tr.width / 2;
        const top =
            side === 'top'
                ? tr.top - TOOLTIP_HEIGHT_ESTIMATE - TOOLTIP_OFFSET
                : tr.bottom + TOOLTIP_OFFSET;
        setPosition({ left, top });
    }, [visible, side]);

    const portalContent =
        visible &&
        typeof document !== 'undefined' &&
        position &&
        createPortal(
            <div
                role="tooltip"
                className="fixed px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap shadow-lg border transition-opacity duration-150 ease-out"
                style={{
                    zIndex: TOOLTIP_Z_INDEX,
                    left: position.left,
                    top: position.top,
                    transform: 'translate(-50%, 0)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-default)',
                }}
            >
                {text}
                <span
                    className="absolute left-1/2 w-0 h-0 border-4 border-transparent"
                    style={{
                        marginLeft: -8,
                        ...(side === 'top'
                            ? { top: '100%', borderTopColor: 'var(--bg-elevated)' }
                            : { bottom: '100%', borderBottomColor: 'var(--bg-elevated)' }),
                    }}
                    aria-hidden="true"
                />
            </div>,
            document.body
        );

    return (
        <>
            <div
                ref={triggerRef}
                className={`relative inline-flex ${className}`}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
            >
                {children}
            </div>
            {portalContent}
        </>
    );
};

export default Tooltip;
