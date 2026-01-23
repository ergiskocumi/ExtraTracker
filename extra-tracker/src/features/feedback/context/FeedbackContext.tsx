/**
 * 📝 FEEDBACK CONTEXT - Gestione globale del feedback modal
 *
 * Permette di aprire il modal di feedback da qualsiasi parte dell'app.
 * Features:
 * - Apertura/chiusura globale
 * - Keyboard shortcut (Ctrl+Shift+F)
 * - Minimizzazione per screenshot
 */

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from 'react';

interface FeedbackContextValue {
    isOpen: boolean;
    isMinimized: boolean;
    openFeedback: () => void;
    closeFeedback: () => void;
    toggleMinimize: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const openFeedback = useCallback(() => {
        setIsOpen(true);
        setIsMinimized(false);
    }, []);

    const closeFeedback = useCallback(() => {
        setIsOpen(false);
        setIsMinimized(false);
    }, []);

    const toggleMinimize = useCallback(() => {
        setIsMinimized((prev) => !prev);
    }, []);

    // Keyboard shortcut: Ctrl+Shift+F
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                if (isOpen) {
                    closeFeedback();
                } else {
                    openFeedback();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, openFeedback, closeFeedback]);

    return (
        <FeedbackContext.Provider
            value={{
                isOpen,
                isMinimized,
                openFeedback,
                closeFeedback,
                toggleMinimize,
            }}
        >
            {children}
        </FeedbackContext.Provider>
    );
};

export const useFeedback = (): FeedbackContextValue => {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback must be used within FeedbackProvider');
    }
    return context;
};
