import { ArrowLeft, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminFeedbackHeaderProps {
    viewMode: 'list' | 'board';
    isLoading: boolean;
    onRefresh: () => void;
    onViewModeChange: (nextMode: 'list' | 'board') => void;
}

export const AdminFeedbackHeader: React.FC<AdminFeedbackHeaderProps> = ({
    viewMode,
    isLoading,
    onRefresh,
    onViewModeChange,
}) => (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div className="flex items-center gap-4">
            <Link
                to="/dashboard"
                className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Centro Admin
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold text-white mt-1">
                    Gestione Feedback
                </h1>
                <p className="text-white/60 text-sm mt-2 max-w-xl">
                    Assegna, aggiorna e chiudi i ticket con una vista piu ricca e
                    operativa.
                </p>
            </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
                <button
                    onClick={() => onViewModeChange('list')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl transition-colors ${
                        viewMode === 'list'
                            ? 'bg-white/10 text-white'
                            : 'text-white/50 hover:text-white'
                    }`}
                >
                    <List className="w-4 h-4" />
                    Lista
                </button>
                <button
                    onClick={() => onViewModeChange('board')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl transition-colors ${
                        viewMode === 'board'
                            ? 'bg-white/10 text-white'
                            : 'text-white/50 hover:text-white'
                    }`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    Board
                </button>
            </div>
            <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Aggiorna
            </button>
        </div>
    </div>
);

