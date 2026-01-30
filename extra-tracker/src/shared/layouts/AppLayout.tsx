/**
 * 🏠 APP LAYOUT - Layout principale per utenti autenticati
 *
 * Design moderno con:
 * - Header bar minimalista e geometrica
 * - Menu utente con accesso rapido
 * - Animazioni fluide e performanti
 * - Supporto temi Light/Dark
 */

import { memo, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Logo } from '../components/Brand/Logo';
import { UserMenuDropdown } from '../components/UserMenu';
import { ThemeToggle } from '../components/ThemeToggle';
import { FloatingFeedbackButton } from '../../features/feedback/components/FloatingFeedbackButton';
import { GlobalFeedbackModal } from '../../features/feedback/components/GlobalFeedbackModal';
import { TutorialManager } from '../components/Tutorial/TutorialManager';

// ============================================
// HEADER COMPONENT
// ============================================

const Header = memo(() => {
    const APP_NAME = 'Silvi';
    const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
    const headerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const updateHeaderHeight = () => {
            if (!headerRef.current) return;
            const height = headerRef.current.getBoundingClientRect().height || 64;
            document.documentElement.style.setProperty('--app-header-height', `${height}px`);
        };

        updateHeaderHeight();
        window.addEventListener('resize', updateHeaderHeight);

        return () => {
            window.removeEventListener('resize', updateHeaderHeight);
        };
    }, []);

    return (
        <header ref={headerRef} className="sticky top-0 z-50 transition-all duration-300">
            {/* Premium Glass Background - Theme Aware */}
            <div
                className="absolute inset-0 transition-all duration-300"
                style={{
                    background: 'var(--bg-header)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    borderBottom: '1px solid var(--border-subtle)',
                }}
            />
            
            {/* Subtle Gradient Line at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/30 to-transparent opacity-80" />

            {/* Content */}
            <div className="relative px-4 py-3 mx-auto max-w-7xl sm:px-6">
                <div className="flex items-center justify-between h-12">
                    {/* LEFT: Brand */}
                    <Link
                        to="/"
                        className="flex items-center gap-3 group relative z-10"
                        title={`${APP_NAME}${appVersion ? ` v${appVersion}` : ''}`}
                    >
                        <div className="transition-transform duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                            <Logo size="md" variant="full" />
                        </div>
                        
                        {appVersion && (
                            <span 
                                className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium group-hover:border-primary-500/30 transition-colors"
                                style={{
                                    color: 'var(--text-muted)',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                v{appVersion}
                            </span>
                        )}
                    </Link>

                    {/* RIGHT: Theme Toggle + User Menu */}
                    <div className="flex items-center gap-3 relative z-10">
                        <ThemeToggle />
                        <div data-tutorial="user-menu">
                            <UserMenuDropdown />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
});

Header.displayName = 'Header';

// ============================================
// FOOTER COMPONENT
// ============================================

const Footer = memo(() => (
    <footer className="py-8 text-center relative z-10">
        <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent to-transparent"
            style={{ '--tw-gradient-via': 'var(--border-default)' } as React.CSSProperties}
        />
        <p className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Silvi AI • <span className="text-primary-400/80">Study smarter, not harder</span>
        </p>
    </footer>
));

Footer.displayName = 'Footer';

// ============================================
// MAIN LAYOUT
// ============================================

export const AppLayout = () => {
    const { pathname } = useLocation();
    const hideFooter = pathname.startsWith('/study');

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <Header />

            {/* Main Content */}
            <main className="flex-1 w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 mx-auto animate-fade-in relative z-0">
                <Outlet />
            </main>

            {/* Footer: nascosto in /study per non disturbare sessioni e studio */}
            {!hideFooter && <Footer />}

            {/* Global Feedback Components */}
            <FloatingFeedbackButton />
            <GlobalFeedbackModal />
            
            {/* Tutorial Manager */}
            <TutorialManager />
        </div>
    );
};

export default AppLayout;
