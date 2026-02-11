/**
 * DASHBOARD PAGE - Student Focused & Vivace
 *
 * Psicologia dei colori:
 * - Viola (Primary): Saggezza, Creatività, Ispirazione.
 * - Smeraldo (Focus): Concentrazione, Calma, Azione positiva ("Ripassa").
 * - Ambra/Arancio (Energy): Motivazione, Attenzione per scadenze vicine.
 *
 * Effetti:
 * - Glassmorphism: Profondità e modernità.
 * - Gradienti: Vivacità senza distrazione.
 * - Animazioni: Ingresso fluido e hover reattivi.
 * - Theme Support: Light/Dark mode
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../settings/context/SettingsContext';
import { studyService, type Deck } from '../../study/services/studyService';
import examService from '../../study/services/examService';
import type { Exam } from '../../study/types/exam';
import { TargetIcon } from '../../../shared/components/icons';
import { pagePreloaders } from '../../../shared/hooks/usePreload';

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buongiorno';
    if (hour >= 12 && hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
};

const getDaysRemaining = (deadline: string) => {
    const now = new Date();
    const target = new Date(deadline);
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

// Calcola il colore in base all'urgenza - These accent colors stay same across themes
const getUrgencyColor = (days: number) => {
    if (days <= 3) return 'text-orange-500 bg-orange-500/15 border-orange-500/30'; // Urgente/Attenzione
    if (days <= 7) return 'text-amber-500 bg-amber-500/15 border-amber-500/30';   // Vicino/Energia
    return 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30';           // Tranquillo/Focus
};

export const DashboardPage = () => {
    const navigate = useNavigate();
    const { profile } = useSettings();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const userName = profile?.firstName || profile?.displayName || 'utente';

    useEffect(() => {
        let isCancelled = false;

        const loadDashboard = async () => {
            setIsLoading(true);
            try {
                const [dashboard, examsData] = await Promise.all([
                    studyService.getDashboard(),
                    examService.getAll(),
                ]);
                if (isCancelled) return;
                setDecks(dashboard.decks || []);
                setExams(examsData || []);
            } catch (err) {
                console.error('Dashboard load error:', err);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadDashboard();
        return () => {
            isCancelled = true;
        };
    }, []);

    const recentDecks = useMemo(() => {
        const sorted = [...decks].sort((a, b) => {
            const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bDate - aDate;
        });
        return sorted.slice(0, 3);
    }, [decks]);

    const upcomingExams = useMemo(() => {
        const active = exams.filter(exam => exam.status === 'active');
        const sorted = [...active].sort((a, b) => {
            const aDate = new Date(a.deadline).getTime();
            const bDate = new Date(b.deadline).getTime();
            return aDate - bDate;
        });
        return sorted.slice(0, 3);
    }, [exams]);

    const examById = useMemo(() => {
        const map = new Map<string, Exam>();
        exams.forEach(e => map.set(e.id, e));
        return map;
    }, [exams]);

    const getExamTitleForDeck = (deck: Deck) => {
        if (!deck.examId) return null;
        return examById.get(deck.examId)?.title ?? null;
    };

    return (
        <div className="dashboard-page space-y-8">
            {/* Ambient Glow Background - Subtle, theme-aware via CSS variables */}
            <div className="fixed top-0 left-0 right-0 h-[500px] pointer-events-none z-[-1] opacity-40">
                <div 
                    className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] rounded-full blur-[120px]"
                    style={{ background: 'var(--gradient-mesh-1)' }}
                />
                <div 
                    className="absolute top-[10%] right-[20%] w-[30%] h-[30%] rounded-full blur-[100px]"
                    style={{ background: 'var(--gradient-mesh-2)' }}
                />
            </div>

            {/* Welcome Section */}
            <section className="dashboard-greeting space-y-2 relative" data-tutorial="greeting">
                <h1 className="text-4xl md:text-5xl font-bold text-theme-primary tracking-tight leading-snug pb-1">
                    <span className="opacity-90">{getGreeting()},</span>{' '}
                    <button
                        type="button"
                        data-tutorial="user-menu"
                        onClick={() => navigate('/settings')}
                        className="dashboard-user-link bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-violet-400 hover:from-primary-400 hover:to-violet-300 transition-all duration-300 focus:outline-none pb-1"
                    >
                        {userName}
                    </button>
                    .
                </h1>
                <p className="dashboard-greeting-subtitle text-theme-secondary text-xl md:text-2xl font-light tracking-wide max-w-2xl">
                    Pronto a concentrarti? Ecco cosa c'è in programma oggi.
                </p>
            </section>

            {/* Recent decks - Card Vivaci & Glass */}
            <section
                className="dashboard-panel relative rounded-3xl backdrop-blur-md p-6 sm:p-8 overflow-hidden group/section border border-theme-default bg-theme-surface shadow-theme-md"
                data-tutorial="recent-decks"
            >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-50 pointer-events-none rounded-3xl" />
                
                <h2 className="dashboard-section-title relative mb-6 text-sm font-bold uppercase tracking-widest text-theme-muted flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                    Attività Recenti
                </h2>
                
                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
                    {recentDecks.map((deck) => {
                        const examTitle = getExamTitleForDeck(deck);
                        const hasDueCards = deck.dueCount > 0;
                        
                        return (
                            <div
                                key={deck.id}
                                className="dashboard-deck-card group relative flex flex-col justify-between min-h-[180px] p-6 rounded-2xl border border-theme-default bg-theme-card hover:bg-theme-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-lg hover:border-theme-strong overflow-hidden"
                            >
                                {/* Decorative gradient blob on hover */}
                                <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="text-xl font-bold text-theme-primary group-hover:text-primary-500 transition-colors truncate">
                                            {deck.title}
                                        </h3>
                                        {/* Badge da ripassare */}
                                        {hasDueCards && (
                                            <span className="dashboard-due-badge shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 text-orange-500 border border-orange-500/30">
                                                {deck.dueCount} da fare
                                            </span>
                                        )}
                                    </div>
                                    
                                    {examTitle && (
                                        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-theme-surface border border-theme-default text-theme-muted">
                                            {examTitle}
                                        </div>
                                    )}
                                </div>

                                <div className="relative z-10 mt-6 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/study/${deck.id}/session?mode=flashcard`)}
                                        onMouseEnter={pagePreloaders.studySession}
                                        onFocus={pagePreloaders.studySession}
                                        className={`dashboard-card-cta w-full py-3 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 border
                                                 ${hasDueCards ? 'dashboard-card-cta--accent' : 'dashboard-card-cta--quiet'}
                                                 ${hasDueCards
                                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                    : 'bg-theme-surface border-theme-default text-theme-secondary hover:bg-theme-card hover:text-theme-primary hover:border-theme-strong'
                                                 }`}
                                    >
                                        {hasDueCards ? 'Ripassa Ora' : 'Ripassa'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {!isLoading && recentDecks.length === 0 && (
                        <div className="dashboard-empty-state col-span-full py-10 text-center rounded-2xl border border-dashed border-theme-default bg-theme-surface">
                            <p className="text-theme-muted font-light">Nessun mazzo recente. Inizia a studiare!</p>
                            <button 
                                onClick={() => navigate('/study')}
                                className="dashboard-empty-cta mt-4 text-sm text-primary-500 hover:text-primary-400 font-medium"
                            >
                                + Crea nuovo mazzo
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Bottom Section: Exams & Motivation */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prossimi Esami - Focus & Urgency */}
                <div
                    className="dashboard-panel dashboard-panel--exams relative rounded-3xl backdrop-blur-md p-6 sm:p-8 transition-all duration-300 border border-theme-default bg-theme-surface shadow-theme-md hover:border-theme-strong"
                    data-tutorial="upcoming-exams"
                >
                    <div className="absolute inset-0 bg-gradient-to-bl from-orange-500/5 to-transparent opacity-30 pointer-events-none rounded-3xl" />

                    <h2 className="dashboard-section-title relative mb-6 flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-theme-muted">
                        <div className="p-1.5 rounded-lg bg-theme-surface border border-theme-default text-primary-500">
                            <TargetIcon size={16} />
                        </div>
                        Prossimi Esami
                    </h2>

                    <div className="relative space-y-3">
                        {upcomingExams.map((exam) => {
                            const days = getDaysRemaining(exam.deadline);
                            const urgencyClass = getUrgencyColor(days);
                            
                            return (
                                <div
                                    key={exam.id}
                                    className="dashboard-exam-row group flex items-center gap-4 rounded-2xl border border-theme-subtle bg-theme-card p-4 transition-all hover:bg-theme-surface hover:border-theme-default hover:shadow-theme-md"
                                >
                                    {/* Days Badge - Dynamic Color */}
                                    <div className={`h-12 w-12 rounded-2xl flex flex-col items-center justify-center border shadow-sm transition-transform group-hover:scale-105 ${urgencyClass}`}>
                                        <span className="text-lg font-bold leading-none">{days}</span>
                                        <span className="text-[9px] font-medium uppercase opacity-80">gg</span>
                                    </div>
                                    
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-theme-primary font-semibold truncate group-hover:text-primary-500 transition-colors">
                                                {exam.title}
                                            </h4>
                                            <span className="dashboard-exam-date text-xs text-theme-muted font-mono">
                                                {formatDate(exam.deadline)}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="dashboard-exam-progress-track h-1 w-full max-w-[100px] rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                                                <div 
                                                    className="h-full bg-primary-500 rounded-full opacity-50 group-hover:opacity-100 transition-opacity" 
                                                    style={{ width: `${Math.max(10, 100 - (days * 2))}%` }} 
                                                />
                                            </div>
                                            <span className="dashboard-exam-meta text-xs text-theme-muted font-medium whitespace-nowrap">
                                                {days === 0 ? 'Oggi!' : `mancano ${days} gg`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {!isLoading && upcomingExams.length === 0 && (
                            <p className="text-theme-muted text-center py-4 font-light">Tutto tranquillo! Nessun esame in vista.</p>
                        )}
                    </div>
                </div>

                {/* CTA - Energy & Action */}
                <button
                    type="button"
                    data-tutorial="exams-cta"
                    onClick={() => navigate('/study')}
                    className="dashboard-main-cta group relative rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center p-8 transition-all duration-500 hover:shadow-[0_0_40px_rgba(124,58,237,0.3)] hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-primary-500/30"
                >
                    {/* Background with animated gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-violet-700 opacity-90 transition-opacity group-hover:opacity-100" />
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />

                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <TargetIcon size={32} className="keep-light-text text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.5)]" />
                        </div>
                        <div>
                            <h3 className="dashboard-main-cta-title keep-light-text text-2xl font-bold text-white mb-1 tracking-tight">Vai agli Esami</h3>
                            <p className="dashboard-main-cta-subtitle keep-light-text text-primary-100 text-sm font-medium">Gestisci e pianifica il tuo successo</p>
                        </div>
                    </div>
                </button>
            </section>
        </div>
    );
};

export default DashboardPage;
