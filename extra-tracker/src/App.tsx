/**
 * 🚀 APP - Entry point con routing autenticato
 * 
 * Sistema di routing:
 * - /login, /register, /forgot-password, /reset-password, /verify-email → Pagine pubbliche (AuthLayout)
 * - /, /settings, /study → Pagine protette (AppLayout)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './features/settings/context/SettingsContext';
import { FeedbackProvider } from './features/feedback/context/FeedbackContext';
import { ProtectedRoute } from './features/auth/context/AuthContext';
import { AdminRoute } from './features/auth/components/AdminRoute';
import { AppLayout, AuthLayout } from './shared/layouts';
import { useSettings } from './features/settings/context/SettingsContext';

// OTTIMIZZATO: Lazy loading per tutte le pagine (code splitting)
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
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

// Admin Pages - Lazy loaded
const AdminFeedbackPage = lazy(() => import('./features/feedback/pages/AdminFeedbackPage').then(m => ({ default: m.AdminFeedbackPage })));

// Loading fallback component
const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-dark-500">
        <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

const HomeRedirect = () => {
    const { preferences, hasLoaded } = useSettings();

    // Evita redirect "a caso" prima di aver caricato le preferenze reali dal backend.
    if (!hasLoaded) return null;

    const to = '/dashboard';

    return <Navigate to={to} replace />;
};

function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* ===== ROUTE PUBBLICHE (Auth) ===== */}
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                </Route>

                {/* ===== ROUTE PROTETTE (App) ===== */}
                <Route
                    element={
                        <ProtectedRoute>
                            <SettingsProvider>
                                <FeedbackProvider>
                                    <AppLayout />
                                </FeedbackProvider>
                            </SettingsProvider>
                        </ProtectedRoute>
                    }
                >
                    <Route path="/" element={<HomeRedirect />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* Study / Flashcards */}
                    <Route path="/study" element={<DecksDashboardPage />} />
                    <Route path="/study/deck/:id" element={<DeckDetailPage />} />
                    <Route path="/study/deck/:deckId/cinema" element={<CinemaPage />} />
                    <Route path="/study/:deckId" element={<StudySessionPage />} />
                    <Route path="/study/:deckId/session" element={<StudySessionPage />} />

                    {/* Admin Routes */}
                    <Route
                        path="/admin/feedback"
                        element={
                            <AdminRoute>
                                <AdminFeedbackPage />
                            </AdminRoute>
                        }
                    />
                </Route>
            </Routes>
        </Suspense>
    );
}

export default App;
