/**
 * 🚀 APP - Entry point con routing autenticato
 * 
 * Sistema di routing:
 * - /login, /register → Pagine pubbliche (AuthLayout)
 * - /, /goals, /settings, /timeline → Pagine protette (AppLayout)
 */

import { Routes, Route } from 'react-router-dom';
import { GoalsProvider } from './context/GoalsContext';
  import { ProjectsProvider } from './context/ProjectsContext';
import { WorkLogProvider } from './context/WorkLogContenxt';
import { ProtectedRoute } from './context/AuthContext';
import { AppLayout, AuthLayout } from './layouts';

// Pagine
import { DashboardPage } from './pages/DashboardPageNew';
import { SettingsPage } from './pages/SettingsPage';
import { GoalsPage } from './pages/GoalsPage';
import { GoalDetailPage } from './pages/GoalDetailPage';
import { TimelinePage } from './pages/TimelinePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

function App() {
    return (
        <Routes>
            {/* ===== ROUTE PUBBLICHE (Auth) ===== */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* ===== ROUTE PROTETTE (App) ===== */}
            <Route 
                element={
                    <ProtectedRoute>
                        <ProjectsProvider>
                            <WorkLogProvider>
                                <GoalsProvider>
                                    <AppLayout />
                                </GoalsProvider>
                            </WorkLogProvider>
                        </ProjectsProvider>
                    </ProtectedRoute>
                }
            >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/goals/:id" element={<GoalDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/timeline" element={<TimelinePage />} />
            </Route>
        </Routes>
    );
}

export default App;