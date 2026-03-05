/**
 * Header Component - With SilviLogo
 * 
 * Features:
 * - Fixed position with glassmorphism on scroll
 * - Responsive design with mobile hamburger menu
 * - Smooth scroll navigation
 * - SilviLogo component integration
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

// ============================================
// TYPES & INTERFACES
// ============================================
export interface HeaderProps {
  appUrl?: string;
  useRouterLinks?: boolean;
}

interface NavLink {
  label: string;
  href: string;
}

// ============================================
// NAVIGATION DATA
// ============================================
const navLinks: NavLink[] = [
  { label: 'Funzionalità', href: '#features' },
  { label: 'Come Funziona', href: '#how-it-works' },
  { label: 'Prezzi', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

// ============================================
// SILVI.AI LOGO COMPONENT
// ============================================
const SilviLogo = ({ className = '' }: { className?: string }) => {
  return (
    <motion.div 
      className={`relative ${className}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="headerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        
        {/* Outer rounded square */}
        <rect
          x="4"
          y="4"
          width="40"
          height="40"
          rx="10"
          fill="url(#headerLogoGradient)"
        />
        
        {/* Inner "S" shape */}
        <path
          d="M16 18C16 16.8954 16.8954 16 18 16H24C25.1046 16 26 16.8954 26 18V20C26 21.1046 25.1046 22 24 22H20C18.8954 22 18 22.8954 18 24V30C18 31.1046 18.8954 32 20 32H30C31.1046 32 32 31.1046 32 30V26C32 24.8954 31.1046 24 30 24H26"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </motion.div>
  );
};

// ============================================
// MAIN HEADER COMPONENT
// ============================================
export const Header = ({ appUrl = '/', useRouterLinks: _useRouterLinks = false }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect - simpler detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Handle smooth scroll to section
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    
    closeMobileMenu();
  }, [closeMobileMenu]);

  // Handle CTA button clicks
  const handleLogin = useCallback(() => {
    window.location.href = appUrl + '/login';
    closeMobileMenu();
  }, [appUrl, closeMobileMenu]);

  const handleSignup = useCallback(() => {
    window.location.href = appUrl + '/register';
    closeMobileMenu();
  }, [appUrl, closeMobileMenu]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo with SilviLogo component */}
          <a
            href="#"
            className="flex items-center gap-3 group transition-transform duration-200 hover:scale-[1.02]"
          >
            <SilviLogo className="w-10 h-10" />
            <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Silvi.AI
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="relative px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors duration-300 group"
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute inset-0 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={handleLogin}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-300"
            >
              Accedi
            </button>
            <button
              onClick={handleSignup}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 relative overflow-hidden group"
            >
              {/* Shimmer effect on hover */}
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10">Inizia Gratis</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all duration-300"
            aria-label={isMobileMenuOpen ? 'Chiudi menu' : 'Apri menu'}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-4 bg-[#0a0a1a]/95 backdrop-blur-xl border-t border-white/10">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 font-medium"
              >
                {link.label}
              </a>
            ))}
            {/* Mobile CTA Buttons */}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <button
                onClick={handleLogin}
                className="w-full px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 font-medium text-left"
              >
                Accedi
              </button>
              <button
                onClick={handleSignup}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300"
              >
                Inizia Gratis
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
