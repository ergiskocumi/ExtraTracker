/**
 * 🚀 APP - Entry point con routing autenticato
 * 
 * Sistema di routing:
 * - /login, /register, /forgot-password, /reset-password, /verify-email → Pagine pubbliche (AuthLayout)
 * - /, /goals, /settings, /timeline, /study → Pagine protette (AppLayout)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GoalsProvider } from './features/goals/context/GoalsContext';
import { ProjectsProvider } from './features/projects/context/ProjectsContext';
import { WorkLogProvider } from './features/tracker/context/WorkLogContext';
import { SettingsProvider } from './features/settings/context/SettingsContext';
import { WorkspaceProvider } from './features/workspace/context/WorkspaceContext';
import { ProtectedRoute } from './features/auth/context/AuthContext';
import { AppLayout, AuthLayout } from './shared/layouts';
import { useSettings } from './features/settings/context/SettingsContext';

// OTTIMIZZATO: Lazy loading per tutte le pagine (code splitting)
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import('./features/projects/pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const GoalsPage = lazy(() => import('./features/goals/pages/GoalsPage').then(m => ({ default: m.GoalsPage })));
const GoalDetailPage = lazy(() => import('./features/goals/pages/GoalDetailPage').then(m => ({ default: m.GoalDetailPage })));
const TimelinePage = lazy(() => import('./features/tracker/pages/TimelinePage').then(m => ({ default: m.TimelinePage })));
const WorkspacePage = lazy(() => import('./features/workspace/pages/WorkspacePage').then(m => ({ default: m.WorkspacePage })));
const ProjectDetailPage = lazy(() => import('./features/workspace/pages/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./features/auth/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./features/auth/pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));

// Study / Flashcards Pages - Lazy loaded
const DecksDashboardPage = lazy(() => import('./features/study/pages/DecksDashboardPage').then(m => ({ default: m.DecksDashboardPage })));
const StudySessionPage = lazy(() => import('./features/study/pages/StudySessionPage').then(m => ({ default: m.StudySessionPage })));
const DeckDetailPage = lazy(() => import('./features/study/pages/DeckDetailPage').then(m => ({ default: m.DeckDetailPage })));
const SplitStudyPage = lazy(() => import('./features/study/pages/SplitStudyPage').then(m => ({ default: m.SplitStudyPage })));

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

    const to = preferences.defaultView === 'timeline'
        ? '/timeline'
        : preferences.defaultView === 'goals'
            ? '/goals'
            : '/dashboard';

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
                                <ProjectsProvider>
                                    <WorkLogProvider>
                                        <WorkspaceProvider>
                                            <GoalsProvider>
                                                <AppLayout />
                                            </GoalsProvider>
                                        </WorkspaceProvider>
                                    </WorkLogProvider>
                                </ProjectsProvider>
                            </SettingsProvider>
                        </ProtectedRoute>
                    }
                >
                    <Route path="/" element={<HomeRedirect />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/goals" element={<GoalsPage />} />
                    <Route path="/goals/:id" element={<GoalDetailPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/workspace" element={<WorkspacePage />} />
                    <Route path="/workspace/project/:id" element={<ProjectDetailPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/timeline" element={<TimelinePage />} />
                    
                    {/* Study / Flashcards */}
                    <Route path="/study" element={<DecksDashboardPage />} />
                    <Route path="/study/deck/:id" element={<DeckDetailPage />} />
                    <Route path="/study/:deckId/split" element={<SplitStudyPage />} />
                    <Route path="/study/:deckId" element={<StudySessionPage />} />
                    <Route path="/study/:deckId/session" element={<StudySessionPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

export default App;
