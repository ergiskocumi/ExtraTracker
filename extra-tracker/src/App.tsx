import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import {Routes, Route, Link, useLocation} from 'react-router-dom'; // importiamo i componenti necessari per il routing

function App() {
  const location = useLocation();
  
  return (
    // Layout moderno con colori chiari
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30'>
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 animate-float">
                <span className="text-white text-xl">⏱️</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text">
                Extra Tracker
              </h1>
            </div>

            {/* MENU DI NAVIGAZIONE */}
            <nav className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl">
              <Link 
                to="/" 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                <span>📊</span>
                <span>Dashboard</span>
              </Link>
              <Link 
                to="/settings" 
                className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
              >
                <span>⚙️</span>
                <span>Progetti</span>
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
        </Routes>
      </main>

      {/* FOOTER */}
      <footer className="mt-auto py-6 text-center text-sm text-slate-400">
        <p>© 2024 Extra Tracker • Gestisci il tuo tempo con stile</p>
      </footer>
    </div>
  )
}

export default App