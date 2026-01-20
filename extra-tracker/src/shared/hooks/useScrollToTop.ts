/**
 * 📜 USE SCROLL TO TOP - Hook per ripristinare lo scroll alla navigazione
 * 
 * Scrolla automaticamente in cima alla pagina quando:
 * - Il componente viene montato
 * - Le dipendenze cambiano (es. route params)
 * 
 * Supporta sia scroll su window che su un container custom.
 * 
 * @example
 * // Scroll su window (default)
 * useScrollToTop();
 * 
 * // Scroll quando cambia l'ID del route
 * useScrollToTop([id]);
 * 
 * // Scroll su un container custom
 * const containerRef = useRef<HTMLDivElement>(null);
 * useScrollToTop([], containerRef);
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

interface UseScrollToTopOptions {
    /**
     * Comportamento dello scroll: 'smooth' per animazione, 'auto' per istantaneo
     * @default 'smooth'
     */
    behavior?: ScrollBehavior;
    /**
     * Delay in millisecondi prima di eseguire lo scroll (utile per animazioni)
     * @default 0
     */
    delay?: number;
}

/**
 * Hook per scrollare in cima alla pagina o a un container
 * 
 * @param dependencies - Array di dipendenze che triggerano lo scroll (es. [id] per scrollare quando cambia l'ID)
 * @param containerRef - Ref opzionale a un container scrollabile (default: window)
 * @param options - Opzioni per comportamento scroll
 */
export const useScrollToTop = (
    dependencies: any[] = [],
    containerRef?: RefObject<HTMLElement>,
    options: UseScrollToTopOptions = {}
): void => {
    const { behavior = 'smooth', delay = 0 } = options;
    const isFirstMount = useRef(true);

    useEffect(() => {
        // Skip scroll on first mount if no dependencies (solo se non ci sono dipendenze)
        // Se ci sono dipendenze, scrolla sempre quando cambiano
        if (isFirstMount.current && dependencies.length === 0) {
            isFirstMount.current = false;
        }

        const scrollToTop = () => {
            if (containerRef?.current) {
                // Scroll su container custom
                containerRef.current.scrollTo({
                    top: 0,
                    left: 0,
                    behavior,
                });
            } else {
                // Scroll su window (default)
                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior,
                });
            }
        };

        if (delay > 0) {
            const timeoutId = setTimeout(scrollToTop, delay);
            return () => clearTimeout(timeoutId);
        } else {
            scrollToTop();
        }
    }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useScrollToTop;
