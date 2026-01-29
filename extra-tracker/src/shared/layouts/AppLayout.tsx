/**
 * 🏠 APP LAYOUT - Layout principale per utenti autenticati
 *
 * Design moderno con:
 * - Header bar minimalista e geometrica
 * - Menu utente con accesso rapido
 * - Animazioni fluide e performanti
 */

import { memo, useEffect, useRef } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Logo } from '../components/Brand/Logo';
import { UserMenuDropdown } from '../components/UserMenu';
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
        <header ref={headerRef} className="sticky top-0 z-50">
            {/* Background with blur and gradient */}
            <div
                className="absolute inset-0 border-b border-white/[0.06]"
                style={{
                    background: 'linear-gradient(180deg, rgba(15, 13, 25, 0.95) 0%, rgba(20, 18, 35, 0.9) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                }}
            />

            {/* Content */}
            <div className="relative px-4 py-3 mx-auto max-w-7xl sm:px-6">
                <div className="flex items-center justify-between">
                    {/* LEFT: Brand */}
                    <Link
                        to="/"
                        className="flex items-center gap-3 group"
                        title={`${APP_NAME}${appVersion ? ` v${appVersion}` : ''}`}
                    >
                        <Logo size="md" variant="full" className="text-white" />
                        {appVersion && (
                            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] text-white/30 font-medium bg-white/[0.04] border border-white/[0.06]">
                                v{appVersion}
                            </span>
                        )}
                    </Link>

                    {/* RIGHT: User Menu */}
                    <div data-tutorial="user-menu">
                        <UserMenuDropdown />
                    </div>
                </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
        </header>
    );
});

Header.displayName = 'Header';

// ============================================
// FOOTER COMPONENT
// ============================================

const Footer = memo(() => (
    <footer className="py-6 text-center">
        <p className="text-xs text-white/25">
            © {new Date().getFullYear()} Silvi AI • Gestisci il tuo tempo con stile
        </p>
    </footer>
));

Footer.displayName = 'Footer';

// ============================================
// MAIN LAYOUT
// ============================================

export const AppLayout = () => {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <Header />

            {/* Main Content */}
            <main className="flex-1 w-full max-w-6xl px-6 py-8 mx-auto animate-fade-in">
                <Outlet />
            </main>

            {/* Footer */}
            <Footer />

            {/* Global Feedback Components */}
            <FloatingFeedbackButton />
            <GlobalFeedbackModal />
            
            {/* Tutorial Manager */}
            <TutorialManager />
        </div>
    );
};

export default AppLayout;
