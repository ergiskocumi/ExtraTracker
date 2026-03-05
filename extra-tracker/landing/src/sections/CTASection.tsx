/**
 * 🎯 CTA Section Component
 * 
 * Features:
 * - Large gradient background card with glassmorphism
 * - Scroll-triggered entrance with scale and fade
 * - Animated gradient background
 * - Magnetic button effects
 * - Staggered trust badges
 */

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useInView } from 'framer-motion';
import { ArrowRight, CreditCard, XCircle, TrendingUp, Sparkles } from 'lucide-react';

// ============================================
// TYPES & INTERFACES
// ============================================
export interface CTASectionProps {
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  appUrl?: string;
}

// ============================================
// TRUST BADGES DATA
// ============================================
const TRUST_BADGES = [
  { icon: CreditCard, label: 'Nessuna carta' },
  { icon: XCircle, label: 'Cancella quando vuoi' },
  { icon: TrendingUp, label: '95% promozioni' },
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
      delayChildren: 0.2,
    },
  },
};

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// ============================================
// MAGNETIC BUTTON COMPONENT
// ============================================
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

const MagneticButton = ({ children, className = '', onClick, variant = 'primary' }: MagneticButtonProps) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 300 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;

    x.set(distanceX * 0.15);
    y.set(distanceY * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const baseStyles = variant === 'primary'
    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50'
    : 'bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30';

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={`relative px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${baseStyles} ${className}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Shimmer effect for primary button */}
      {variant === 'primary' && (
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  );
};

// ============================================
// ANIMATED BACKGROUND COMPONENT
// ============================================
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl">
      {/* Main gradient orbs */}
      <motion.div
        className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, rgba(139, 92, 246, 0.15) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 80, 0],
          y: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute -bottom-1/2 -right-1/4 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(167, 139, 250, 0.12) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{
          x: [0, -60, 0],
          y: [0, -50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.08) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{
          x: [0, 40, 0],
          y: [0, -40, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

// ============================================
// MAIN CTA SECTION COMPONENT
// ============================================
export const CTASection = ({ onPrimaryClick, onSecondaryClick, appUrl = '/' }: CTASectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const handlePrimaryClick = () => {
    if (onPrimaryClick) {
      onPrimaryClick();
    } else {
      window.location.href = appUrl + '/register';
    }
  };

  const handleSecondaryClick = () => {
    if (onSecondaryClick) {
      onSecondaryClick();
    } else {
      window.location.href = appUrl + '/login';
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ backgroundColor: '#0a0a1a' }}
    >
      {/* Section background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={scaleInVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="relative"
        >
          {/* Main CTA Card */}
          <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
            {/* Animated gradient background */}
            <AnimatedBackground />

            {/* Content */}
            <div className="relative z-10 px-8 py-16 md:px-16 md:py-24 text-center">
              {/* Sparkle badge */}
              <motion.div
                variants={fadeUpVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
              >
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </motion.div>
                <span className="text-sm text-white/70">Inizia la tua trasformazione</span>
              </motion.div>

              {/* Headline */}
              <motion.h2
                variants={fadeUpVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8 leading-tight"
              >
                <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                  Pronto a superare i tuoi esami?
                </span>
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                variants={fadeUpVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed"
              >
                Unisciti a{' '}
                <span className="text-white/70 font-semibold">50.000+ studenti</span>{' '}
                che usano Silvi.AI ogni giorno. Inizia gratis, nessuna carta richiesta.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
              >
                <motion.div variants={fadeUpVariants}>
                  <MagneticButton onClick={handlePrimaryClick} variant="primary">
                    Inizia Gratis Oggi
                    <ArrowRight className="w-5 h-5" />
                  </MagneticButton>
                </motion.div>

                <motion.div variants={fadeUpVariants}>
                  <MagneticButton onClick={handleSecondaryClick} variant="secondary">
                    Ho già un account
                  </MagneticButton>
                </motion.div>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="flex flex-wrap items-center justify-center gap-4 md:gap-8"
              >
                {TRUST_BADGES.map((badge, index) => (
                  <motion.div
                    key={badge.label}
                    variants={badgeVariants}
                    custom={index}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
                  >
                    <badge.icon className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-white/60">{badge.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Bottom gradient line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
          </div>

          {/* Decorative glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-cyan-500/10 rounded-3xl blur-2xl -z-10 opacity-50" />
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
