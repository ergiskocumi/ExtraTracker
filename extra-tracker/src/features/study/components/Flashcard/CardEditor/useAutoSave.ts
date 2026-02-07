import { useCallback, useEffect, useRef } from 'react';

interface AutoSaveOptions {
    content: string;
    onSave: (content: string) => Promise<void> | void;
    enabled?: boolean;
    delay?: number;
}

export const useAutoSave = ({
    content,
    onSave,
    enabled = true,
    delay = 3000,
}: AutoSaveOptions) => {
    const saveRef = useRef(onSave);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        saveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        if (!enabled) return;
        if (!content.trim()) return;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(async () => {
            try {
                await saveRef.current(content);
            } catch (error) {
                console.error('[Auto-save] Errore durante il salvataggio:', error);
            }
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [content, delay, enabled]);

    const forceSave = useCallback(async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        try {
            await saveRef.current(content);
        } catch (error) {
            console.error('[Auto-save] Errore durante il salvataggio:', error);
        }
    }, [content]);

    return { forceSave };
};

export default useAutoSave;
