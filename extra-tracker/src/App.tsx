/**
 * 🚀 APP - Entry point con routing autenticato
 * 
 * Sistema di routing:
 * - /login, /register, /forgot-password, /reset-password, /verify-email → Pagine pubbliche (AuthLayout)
 * - /, /goals, /settings, /timeline, /study → Pagine protette (AppLayout)
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { GoalsProvider } from './features/goals/context/GoalsContext';
import { ProjectsProvider } from './features/projects/context/ProjectsContext';
import { WorkLogProvider } from './features/tracker/context/WorkLogContext';
import { SettingsProvider } from './features/settings/context/SettingsContext';
import { ProtectedRoute } from './features/auth/context/AuthContext';
import { AppLayout, AuthLayout } from './shared/layouts';
import { useSettings } from './features/settings/context/SettingsContext';

// Pagine
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { ProjectsPage } from './features/projects/pages/ProjectsPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { GoalsPage } from './features/goals/pages/GoalsPage';
import { GoalDetailPage } from './features/goals/pages/GoalDetailPage';
import { TimelinePage } from './features/tracker/pages/TimelinePage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { VerifyEmailPage } from './features/auth/pages/VerifyEmailPage';

// Study / Flashcards Pages
import { DecksDashboardPage, StudySessionPage, DeckDetailPage } from './features/study/pages';

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
                                    <GoalsProvider>
                                        <AppLayout />
                                    </GoalsProvider>
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
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/timeline" element={<TimelinePage />} />
                
                {/* Study / Flashcards */}
                <Route path="/study" element={<DecksDashboardPage />} />
                <Route path="/study/deck/:id" element={<DeckDetailPage />} />
                <Route path="/study/:deckId" element={<StudySessionPage />} />
                <Route path="/study/:deckId/session" element={<StudySessionPage />} />
            </Route>
        </Routes>
    );
}

export default App;
