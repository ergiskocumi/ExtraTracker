/**
 * 🚀 APP - Entry point con routing autenticato
 *
 * Sistema di routing:
 * - / → Redirect a /login; se autenticato redirect a /dashboard
 * - /login, /register, /forgot-password, /reset-password, /verify-email → Pagine pubbliche (AuthLayout)
 * - /dashboard, /study... → Pagine protette (AppLayout)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { SettingsProvider } from './features/settings/context/SettingsContext';
import { ProtectedRoute, useAuth } from './features/auth/context/AuthContext';
import { AppLayout, AuthLayout } from './shared/layouts';
import { StudyProviders } from './features/study/components/StudyProviders';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

// OTTIMIZZATO: Lazy loading per tutte le pagine (code splitting)
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./features/auth/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./features/auth/pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));

// Study / Flashcards Pages - Lazy loaded
const DecksDashboardPage = lazy(() => import('./features/study/pages/DecksDashboardPage').then(m => ({ default: m.DecksDashboardPage })));
const StudySessionPage = lazy(() => import('./features/study/pages/StudySessionPage').then(m => ({ default: m.StudySessionPage })));
const DeckDetailPage = lazy(() => import('./features/study/pages/DeckDetailPage').then(m => ({ default: m.DeckDetailPage })));
const CinemaPage = lazy(() => import('./features/study/pages/CinemaPage').then(m => ({ default: m.CinemaPage })));

// Loading fallback component
const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-theme-base transition-colors">
        <div className="w-12 h-12 border-2 border-primary-500/70 border-t-transparent rounded-full animate-spin" />
    </div>
);

/** Route radice: login se non autenticato, dashboard se autenticato */
const RootRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-theme-base">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 rounded-full border-primary-500 border-t-transparent animate-spin" />
                    <p className="text-theme-muted text-sm">Caricamento...</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
};

function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
                <Routes>
                    {/* ===== ROUTE RADICE ===== */}
                    <Route path="/" element={<RootRoute />} />

                    {/* ===== ROUTE PUBBLICHE (Auth) ===== */}
                    <Route element={<AuthLayout />}>
                        <Route path="/login" element={<ErrorBoundary><LoginPage /></ErrorBoundary>} />
                        <Route path="/register" element={<ErrorBoundary><RegisterPage /></ErrorBoundary>} />
                        <Route path="/forgot-password" element={<ErrorBoundary><ForgotPasswordPage /></ErrorBoundary>} />
                        <Route path="/reset-password" element={<ErrorBoundary><ResetPasswordPage /></ErrorBoundary>} />
                        <Route path="/verify-email" element={<ErrorBoundary><VerifyEmailPage /></ErrorBoundary>} />
                    </Route>

                    {/* ===== ROUTE PROTETTE (App) ===== */}
                    <Route
                        element={
                            <ProtectedRoute redirectTo="/">
                                <SettingsProvider>
                                    <AppLayout />
                                </SettingsProvider>
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />

                        {/* Study / Flashcards - con StudyProviders */}
                        <Route path="/study" element={<ErrorBoundary><StudyProviders><DecksDashboardPage /></StudyProviders></ErrorBoundary>} />
                        <Route path="/study/deck/:id" element={<ErrorBoundary><StudyProviders><DeckDetailPage /></StudyProviders></ErrorBoundary>} />
                        <Route path="/study/deck/:deckId/cinema" element={<ErrorBoundary><StudyProviders><CinemaPage /></StudyProviders></ErrorBoundary>} />
                        <Route path="/study/:deckId/session" element={<ErrorBoundary><StudyProviders><StudySessionPage /></StudyProviders></ErrorBoundary>} />
                    </Route>

                    {/* ===== CATCH-ALL 404 ===== */}
                    <Route
                        path="*"
                        element={
                            <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 bg-theme-base">
                                <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-theme-primary">Pagina non trovata</h1>
                                <p className="text-theme-secondary text-center max-w-md">
                                    La pagina che stai cercando non esiste o e stata spostata.
                                </p>
                                <Link
                                    to="/dashboard"
                                    className="px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold shadow-lg shadow-primary-500/30 transition-colors"
                                >
                                    Torna alla Dashboard
                                </Link>
                            </div>
                        }
                    />
                </Routes>
            </ErrorBoundary>
        </Suspense>
    );
}

export default App;
