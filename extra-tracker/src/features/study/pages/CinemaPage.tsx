import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowLeft, FileText, Layers } from 'lucide-react';
import { studyService, type Deck } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';

const CinemaLayout = lazy(() => import('../layout/CinemaLayout').then(m => ({ default: m.CinemaLayout })));

// ============================================
// SUB-COMPONENTS
// ============================================

const CinemaSkeletonLoader: React.FC = () => (
    <div
        className="fixed left-0 right-0 bottom-0 bg-theme-base overflow-hidden flex flex-col"
        style={{ top: 'var(--app-header-height, 56px)' }}
    >
        <div className="flex-1 flex gap-3 p-3 animate-pulse">
            <div className="flex-[7] rounded-2xl bg-theme-surface border border-theme-default overflow-hidden">
                <div className="h-10 bg-theme-subtle/40 border-b border-theme-default" />
                <div className="p-6 space-y-4">
                    <div className="h-4 bg-theme-subtle/60 rounded-lg w-3/4" />
                    <div className="h-4 bg-theme-subtle/50 rounded-lg w-full" />
                    <div className="h-4 bg-theme-subtle/40 rounded-lg w-5/6" />
                    <div className="h-64 bg-theme-subtle/30 rounded-xl mt-6" />
                </div>
            </div>
            <div className="flex-[3] rounded-2xl bg-theme-surface border border-theme-default overflow-hidden hidden sm:block">
                <div className="px-4 pt-4 pb-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="h-6 w-20 bg-theme-subtle/50 rounded-full" />
                        <div className="h-8 w-8 bg-theme-subtle/40 rounded-lg" />
                    </div>
                    <div className="h-px bg-theme-subtle/30" />
                </div>
                <div className="p-3 space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl border border-theme-default p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-16 bg-theme-subtle/50 rounded-full" />
                            </div>
                            <div className="h-3 bg-theme-subtle/40 rounded w-full" />
                            <div className="h-3 bg-theme-subtle/30 rounded w-2/3" />
                            <div className="h-px bg-theme-subtle/20 my-2" />
                            <div className="h-3 bg-theme-subtle/35 rounded w-full" />
                            <div className="h-3 bg-theme-subtle/25 rounded w-4/5" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="relative">
                    <FileText className="w-8 h-8 text-primary-500/40" />
                    <Layers className="w-5 h-5 text-primary-400/60 absolute -bottom-1 -right-1.5" />
                </div>
                <p className="text-xs text-theme-muted font-medium tracking-wide">Caricamento cinema...</p>
            </div>
        </div>
    </div>
);

interface ErrorStateProps {
    error: string;
    onNavigateBack: () => void;
    onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onNavigateBack, onRetry }) => (
    <div
        className="fixed left-0 right-0 bottom-0 bg-theme-base text-theme-primary flex flex-col items-center justify-center"
        style={{ top: 'var(--app-header-height, 56px)' }}
    >
        <div className="flex flex-col items-center max-w-md px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                <AlertCircle className="w-7 h-7 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-theme-primary mb-2">Impossibile caricare il mazzo</h2>
            <p className="text-sm text-theme-secondary mb-6 leading-relaxed">{error}</p>
            <div className="flex items-center gap-3">
                <button
                    onClick={onNavigateBack}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-surface border border-theme-default hover:bg-theme-card hover:border-theme-strong text-sm font-medium text-theme-secondary hover:text-theme-primary transition-all duration-200 active:scale-[0.97]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Indietro
                </button>
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium shadow-lg shadow-primary-500/20 transition-all duration-200 active:scale-[0.97]"
                >
                    Riprova
                </button>
            </div>
        </div>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const CinemaPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [deck, setDeck] = useState<Deck | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDeck = useCallback(async () => {
        if (!deckId) {
            setError('ID mazzo non valido');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const deckData = await studyService.getDeckById(deckId);
            setDeck(deckData);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore nel caricamento del mazzo';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [deckId]);

    useEffect(() => {
        loadDeck();
    }, [loadDeck]);

    const handleUpdateCard = useCallback(async (
        cardId: string,
        front: string,
        back: string
    ) => {
        if (!deckId) return;

        try {
            const updatedDeck = await studyService.updateCard(deckId, cardId, { front, back });
            setDeck(updatedDeck);
            emitToast.success('Carta modificata!');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Errore nella modifica della carta';
            emitToast.error(errorMessage);
            throw err;
        }
    }, [deckId]);

    const handleDeckUpdate = useCallback((updatedDeck: Deck) => {
        setDeck(updatedDeck);
    }, []);

    const pdfSrc = useMemo(() => deck?.pdfUrl || null, [deck?.pdfUrl]);

    const examIdFromState = (location.state as { examId?: string } | null)?.examId ?? null;
    const examId = deck?.examId ?? examIdFromState;

    const handleNavigateBack = useCallback(() => {
        if (examId) {
            navigate('/study', { state: { examId } });
            return;
        }
        if (deckId) {
            navigate(`/study/deck/${deckId}`);
            return;
        }
        navigate('/study');
    }, [navigate, deckId, examId]);

    // ========== RENDER ==========

    if (isLoading) {
        return <CinemaSkeletonLoader />;
    }

    if (error || !deck) {
        return (
            <ErrorState
                error={error || 'Mazzo non trovato'}
                onNavigateBack={handleNavigateBack}
                onRetry={loadDeck}
            />
        );
    }

    return (
        <Suspense fallback={<CinemaSkeletonLoader />}>
            <CinemaLayout
                deck={deck}
                pdfSrc={pdfSrc}
                onUpdateCard={handleUpdateCard}
                onNavigateBack={handleNavigateBack}
                onDeckUpdate={handleDeckUpdate}
            />
        </Suspense>
    );
};
