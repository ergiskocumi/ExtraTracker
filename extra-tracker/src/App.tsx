import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import {Routes, Route, Link, useLocation} from 'react-router-dom';
import { DashboardIcon, SettingsIcon, LogoIcon } from './components/icons';
import { TimelinePage } from './pages/TimelinePage';
import { ClockIcon } from './components/icons';

function App() {
  const location = useLocation();
  
  return (
    // Layout moderno con tema dark/purple
    <div className='min-h-screen'>
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-dark-500/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-sm animate-float">
                <LogoIcon className="text-white" size={22} />
              </div>
              <h1 className="text-2xl font-bold gradient-text">
                Extra Tracker
              </h1>
            </div>

            {/* MENU DI NAVIGAZIONE */}
            <nav className="flex items-center gap-2 p-1.5 bg-white/[0.03] rounded-xl border border-white/[0.08]">
              <Link 
                to="/" 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                <DashboardIcon size={18} />
                <span>Dashboard</span>
              </Link>
              <Link 
                to="/settings" 
                className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
              >
                <SettingsIcon size={18} />
                <span>Progetti</span>
              </Link>

              <Link 
                to="/timeline" 
                className={`nav-link ${location.pathname === '/timeline' ? 'active' : ''}`}
              >
                <ClockIcon size={18} />
                <span>Timeline</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* CONTENUTO PAGINA */}
      <main className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
        </Routes>
      </main>

      {/* FOOTER */}
      <footer className="mt-auto py-6 text-center text-sm text-white/30">
        <p>© 2024 Extra Tracker • Gestisci il tuo tempo con stile</p>
      </footer>
    </div>
  )
}

export default App