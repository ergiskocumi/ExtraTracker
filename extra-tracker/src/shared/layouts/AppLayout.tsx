/**
 * 🏠 APP LAYOUT - Layout principale per utenti autenticati
 *
 * Design moderno con:
 * - Header bar minimalista e geometrica
 * - Menu utente con accesso rapido
 * - Animazioni fluide e performanti
 * - Supporto temi Light/Dark
 */

import { memo, useEffect, useRef, lazy, Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '../components/Brand/Logo';
import { UserMenuDropdown } from '../components/UserMenu';
import { ThemeToggle } from '../components/ThemeToggle';
import { FloatingGenerationIndicator } from '../../features/study/components/Generation';
const FloatingFeedbackButton = lazy(() =>
    import('../../features/feedback/components/FloatingFeedbackButton').then((m) => ({
        default: m.FloatingFeedbackButton,
    }))
);
const GlobalFeedbackModal = lazy(() =>
    import('../../features/feedback/components/GlobalFeedbackModal').then((m) => ({
        default: m.GlobalFeedbackModal,
    }))
);
const TutorialManager = lazy(() =>
    import('../components/Tutorial/TutorialManager').then((m) => ({
        default: m.TutorialManager,
    }))
);

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
                        <motion.div 
                            className="transition-transform duration-300"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Logo size="md" variant="full" animated={true} />
                        </motion.div>
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
            <main className="flex-1 w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 mx-auto relative z-0">
                <Outlet />
            </main>

            {/* Footer: nascosto in /study per non disturbare sessioni e studio */}
            {!hideFooter && <Footer />}

            {/* Global Feedback Components */}
            <Suspense fallback={null}>
                <FloatingFeedbackButton />
                <GlobalFeedbackModal />
                <TutorialManager />
                <FloatingGenerationIndicator />
            </Suspense>
        </div>
    );
};

export default AppLayout;
