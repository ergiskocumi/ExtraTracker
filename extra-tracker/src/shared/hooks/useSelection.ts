import { useCallback, useMemo, useState } from 'react';

export interface SelectionState {
    selectedIds: Set<string>;
    selectedCount: number;
    isSelectionMode: boolean;
    toggleSelection: (id: string) => void;
    toggleAll: (allIds: string[]) => void;
    isSelected: (id: string) => boolean;
    clearSelection: () => void;
    setSelectionMode: (enabled: boolean) => void;
}

interface UseSelectionOptions {
    initialSelectedIds?: string[];
    initialSelectionMode?: boolean;
}

export const useSelection = (options: UseSelectionOptions = {}): SelectionState => {
    const { initialSelectedIds = [], initialSelectionMode = false } = options;

    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        () => new Set(initialSelectedIds)
    );
    const [manualSelectionMode, setManualSelectionMode] = useState(initialSelectionMode);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleAll = useCallback((allIds: string[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            const ids = Array.from(new Set(allIds));
            const allSelected = ids.length > 0 && ids.every(id => next.has(id));

            if (allSelected) {
                ids.forEach(id => next.delete(id));
            } else {
                ids.forEach(id => next.add(id));
            }

            return next;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const isSelected = useCallback(
        (id: string) => selectedIds.has(id),
        [selectedIds]
    );

    const isSelectionMode = useMemo(() => {
        return manualSelectionMode || selectedIds.size > 0;
    }, [manualSelectionMode, selectedIds.size]);

    return {
        selectedIds,
        selectedCount: selectedIds.size,
        isSelectionMode,
        toggleSelection,
        toggleAll,
        isSelected,
        clearSelection,
        setSelectionMode: setManualSelectionMode,
    };
};

export default useSelection;
