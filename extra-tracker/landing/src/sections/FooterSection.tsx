/**
 * 🦶 Footer Section Component - Improved Spacing
 * 
 * Features:
 * - Better padding and spacing throughout
 * - Improved visual hierarchy
 * - SilviLogo component integration
 * - More breathing room between elements
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Twitter, Instagram, Linkedin, Github } from 'lucide-react';

// ============================================
// TYPES & INTERFACES
// ============================================
export interface FooterSectionProps {
  _appUrl?: string;
}

interface FooterLink {
  title: string;
  links: string[];
}

// ============================================
// FOOTER LINKS DATA
// ============================================
const FOOTER_LINKS: FooterLink[] = [
  {
    title: 'Prodotto',
    links: ['Time Tracking', 'Gestione Progetti', 'Pomodoro', 'Magic Generate', 'Exam Solver', 'Prezzi'],
  },
  {
    title: 'Risorse',
    links: ['Blog', 'Tutorial', 'Guide', 'FAQ', 'API'],
  },
  {
    title: 'Supporto',
    links: ['Help Center', 'Contatti', 'Status', 'Feedback'],
  },
  {
    title: 'Legale',
    links: ['Privacy', 'Terms', 'Cookie'],
  },
];

// ============================================
// SOCIAL LINKS DATA
// ============================================
const SOCIAL_LINKS = [
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Github, label: 'GitHub', href: '#' },
];

// ============================================
// ANIMATION VARIANTS
// ============================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const columnVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const linkVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

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
          <linearGradient id="footerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
          fill="url(#footerLogoGradient)"
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
// SOCIAL ICON COMPONENT
// ============================================
interface SocialIconProps {
  icon: typeof Twitter;
  label: string;
  href: string;
  index: number;
}

const SocialIcon = ({ icon: Icon, label, href, index }: SocialIconProps) => {
  return (
    <motion.a
      href={href}
      aria-label={label}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.4,
        delay: 0.5 + index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ scale: 1.15, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center
                 text-white/50 hover:text-violet-400 hover:border-violet-500/30 hover:bg-violet-500/10
                 transition-colors duration-300"
    >
      <Icon className="w-5 h-5" />
    </motion.a>
  );
};

// ============================================
// FOOTER LINK COLUMN COMPONENT
// ============================================
interface LinkColumnProps {
  column: FooterLink;
  columnIndex: number;
}

const LinkColumn = ({ column, columnIndex }: LinkColumnProps) => {
  return (
    <motion.div
      variants={columnVariants}
      custom={columnIndex}
    >
      <h4 className="text-sm font-semibold text-white mb-5 tracking-wide">
        {column.title}
      </h4>
      <motion.ul
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="space-y-4"
      >
        {column.links.map((link, linkIndex) => (
          <motion.li key={link} variants={linkVariants} custom={linkIndex}>
            <a
              href="#"
              className="text-sm text-white/50 hover:text-white transition-colors duration-300 
                         relative group inline-block"
            >
              {link}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-violet-400 
                             group-hover:w-full transition-all duration-300" />
            </a>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
};

// ============================================
// MAIN FOOTER SECTION COMPONENT
// ============================================
export const FooterSection = ({ }: FooterSectionProps) => {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, margin: '-50px' });

  const currentYear = new Date().getFullYear();

  return (
    <footer
      ref={footerRef}
      className="relative overflow-hidden"
      style={{ backgroundColor: '#0a0a1a' }}
    >
      {/* Top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 lg:gap-16"
          >
            {/* Brand Column */}
            <motion.div
              variants={columnVariants}
              className="col-span-2 md:col-span-3 lg:col-span-2"
            >
              <a href="#" className="flex items-center gap-3 group">
                <SilviLogo className="w-11 h-11" />
                <span className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Silvi.AI
                </span>
              </a>
              <p className="mt-6 text-sm text-white/50 max-w-xs leading-relaxed">
                L&apos;app definitiva per studenti universitari. Time tracking, gestione progetti, 
                AI che genera flashcards e risolve esami.
              </p>

              {/* Social Icons */}
              <div className="flex items-center gap-4 mt-8">
                {SOCIAL_LINKS.map((social, index) => (
                  <SocialIcon
                    key={social.label}
                    icon={social.icon}
                    label={social.label}
                    href={social.href}
                    index={index}
                  />
                ))}
              </div>
            </motion.div>

            {/* Link Columns */}
            {FOOTER_LINKS.map((column, index) => (
              <LinkColumn key={column.title} column={column} columnIndex={index} />
            ))}
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col md:flex-row items-center justify-between gap-6"
            >
              {/* Copyright */}
              <p className="text-sm text-white/40 text-center md:text-left">
                © {currentYear} Silvi.AI. Tutti i diritti riservati.
              </p>

              {/* Legal Links */}
              <div className="flex items-center gap-8">
                <a
                  href="#"
                  className="text-sm text-white/40 hover:text-white/70 transition-colors duration-300"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="text-sm text-white/40 hover:text-white/70 transition-colors duration-300"
                >
                  Terms of Service
                </a>
                <a
                  href="#"
                  className="text-sm text-white/40 hover:text-white/70 transition-colors duration-300"
                >
                  Cookie Policy
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
