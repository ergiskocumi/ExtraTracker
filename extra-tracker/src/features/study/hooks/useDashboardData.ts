import { useState, useEffect, useCallback } from 'react';
import { studyService, type Deck } from '../services/studyService';
import { foldersService, type Folder } from '../services/foldersService';
import { tagsService, type Tag } from '../services/tagsService';
import { emitToast } from '../../../shared/components/toast';

export const useDashboardData = () => {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [dueCardCount, setDueCardCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);

    const loadDecks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const dashboardData = await studyService.getDashboard();
            setDecks(dashboardData.decks);
            setDueCardCount(dashboardData.dueCardCount);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento');
            emitToast.error('Impossibile caricare i mazzi');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadFolders = useCallback(async () => {
        try {
            const folderTree = await foldersService.getFolderTree();
            setFolders(folderTree);
        } catch (err: any) {
            emitToast.error('Errore nel caricamento delle cartelle');
        }
    }, []);

    const loadTags = useCallback(async () => {
        try {
            const allTags = await tagsService.getAllTags();
            setTags(allTags);
        } catch (err: any) {
            emitToast.error('Errore nel caricamento dei tag');
        }
    }, []);

    useEffect(() => {
        const loadAll = async () => {
            try {
                await Promise.all([
                    loadDecks(),
                    loadFolders(),
                    loadTags(),
                ]);
            } catch (err) {
                // Error already handled in individual load functions
            }
        };
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Load only once on mount

    const refreshAll = useCallback(async () => {
        await Promise.all([
            loadDecks(),
            loadFolders(),
            loadTags(),
        ]);
    }, [loadDecks, loadFolders, loadTags]);

    return {
        decks,
        setDecks,
        dueCardCount,
        isLoading,
        error,
        folders,
        tags,
        loadDecks,
        loadFolders,
        loadTags,
        refreshAll,
    };
};
