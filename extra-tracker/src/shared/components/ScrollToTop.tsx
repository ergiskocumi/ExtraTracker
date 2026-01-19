/**
 * 📜 SCROLL TO TOP - Componente globale per ripristino scroll su navigazione
 * 
 * Componente che scrolla automaticamente in cima alla pagina quando cambia
 * il pathname (route). Da usare dentro BrowserRouter.
 * 
 * Questo è un approccio globale che gestisce TUTTE le navigazioni,
 * mentre useScrollToTop() è per casi specifici.
 * 
 * @example
 * <BrowserRouter>
 *   <ScrollToTop />
 *   <Routes>...</Routes>
 * </BrowserRouter>
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollToTopProps {
    /**
     * Comportamento dello scroll: 'smooth' per animazione, 'auto' per istantaneo
     * @default 'smooth'
     */
    behavior?: ScrollBehavior;
    /**
     * Delay in millisecondi prima di eseguire lo scroll
     * @default 0
     */
    delay?: number;
}

/**
 * Componente che scrolla in cima alla pagina quando cambia la route
 */
export const ScrollToTop: React.FC<ScrollToTopProps> = ({ 
    behavior = 'smooth', 
    delay = 0 
}) => {
    const { pathname } = useLocation();

    useEffect(() => {
        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior,
            });
        };

        if (delay > 0) {
            const timeoutId = setTimeout(scrollToTop, delay);
            return () => clearTimeout(timeoutId);
        } else {
            scrollToTop();
        }
    }, [pathname, behavior, delay]);

    return null;
};

export default ScrollToTop;
