import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface HistoryMeta {
    canUndo: boolean;
    canRedo: boolean;
}

const DEFAULT_MAX_HISTORY = 50;

const countWords = (text: string): number => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
};

export interface EditorHistoryState {
    canUndo: boolean;
    canRedo: boolean;
    wordCount: number;
    charCount: number;
    undo: () => void;
    redo: () => void;
}

export const useEditorHistory = (
    value: string,
    onChange: (nextValue: string) => void,
    resetKey?: string | number | boolean,
    maxHistory: number = DEFAULT_MAX_HISTORY
): EditorHistoryState => {
    const historyRef = useRef<string[]>([value]);
    const indexRef = useRef(0);
    const isApplyingRef = useRef(false);
    const [meta, setMeta] = useState<HistoryMeta>({
        canUndo: false,
        canRedo: false,
    });

    const updateMeta = useCallback(() => {
        setMeta({
            canUndo: indexRef.current > 0,
            canRedo: indexRef.current < historyRef.current.length - 1,
        });
    }, []);

    const resetHistory = useCallback(() => {
        historyRef.current = [value];
        indexRef.current = 0;
        updateMeta();
    }, [updateMeta, value]);

    // Reset history only on first mount or when resetKey changes (e.g. switch card/tab), NOT on every value change.
    // Otherwise every keystroke would clear undo history and could cause focus/input issues.
    const prevResetKeyRef = useRef<typeof resetKey>(resetKey);
    const hasInitializedResetRef = useRef(false);
    useEffect(() => {
        if (!hasInitializedResetRef.current) {
            hasInitializedResetRef.current = true;
            resetHistory();
            return;
        }

        const keyChanged = prevResetKeyRef.current !== resetKey;
        if (keyChanged) {
            prevResetKeyRef.current = resetKey;
            resetHistory();
        }
    }, [resetKey, resetHistory]);

    useEffect(() => {
        if (isApplyingRef.current) {
            isApplyingRef.current = false;
            updateMeta();
            return;
        }

        if (historyRef.current[indexRef.current] === value) return;

        const trimmedHistory = historyRef.current.slice(0, indexRef.current + 1);
        const nextHistory = [...trimmedHistory, value];
        const overflow = Math.max(0, nextHistory.length - maxHistory);

        historyRef.current = overflow > 0 ? nextHistory.slice(overflow) : nextHistory;
        indexRef.current = historyRef.current.length - 1;
        updateMeta();
    }, [maxHistory, updateMeta, value]);

    const undo = useCallback(() => {
        if (indexRef.current === 0) return;
        indexRef.current -= 1;
        isApplyingRef.current = true;
        onChange(historyRef.current[indexRef.current]);
        updateMeta();
    }, [onChange, updateMeta]);

    const redo = useCallback(() => {
        if (indexRef.current >= historyRef.current.length - 1) return;
        indexRef.current += 1;
        isApplyingRef.current = true;
        onChange(historyRef.current[indexRef.current]);
        updateMeta();
    }, [onChange, updateMeta]);

    const wordCount = useMemo(() => countWords(value), [value]);
    const charCount = value.length;

    return {
        canUndo: meta.canUndo,
        canRedo: meta.canRedo,
        wordCount,
        charCount,
        undo,
        redo,
    };
};

export default useEditorHistory;
