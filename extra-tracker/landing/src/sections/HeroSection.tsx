/**
 * Hero Section Component - Professional Redesign
 * 
 * Features:
 * - Professional Silvi.AI logo with academic + tech feel
 * - Floating feature cards instead of fake dashboard
 * - Improved spacing and typography
 * - Clean, professional design
 * - No fake/mock UI elements
 */


import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ChevronDown, 
  Play, 
  Sparkles,
  Timer,
  BookOpen,
  Brain,
  Target,
  Zap,
  TrendingUp,
  GraduationCap
} from 'lucide-react';

// ============================================
// TYPES & INTERFACES
// ============================================
export interface HeroSectionProps {
  appUrl?: string;
  useRouterLinks?: boolean;
}

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const floatVariants = {
  initial: { y: 0 },
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
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
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="logoGradientHover" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
        </defs>
        
        {/* Outer hexagon - represents structure/academic foundation */}
        <motion.path
          d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
          stroke="url(#logoGradient)"
          strokeWidth="2.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
        
        {/* Inner "S" shape - represents Silvi */}
        <motion.path
          d="M30 18C30 15.7909 28.2091 14 26 14H22C19.7909 14 18 15.7909 18 18C18 20.2091 19.7909 22 22 22H26C28.2091 22 30 23.7909 30 26C30 28.2091 28.2091 30 26 30H22C19.7909 30 18 28.2091 18 26"
          stroke="url(#logoGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeInOut' }}
        />
        
        {/* Neural network dots - represents AI */}
        <motion.circle
          cx="24"
          cy="34"
          r="2.5"
          fill="url(#logoGradient)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        />
        <motion.circle
          cx="17"
          cy="37"
          r="1.5"
          fill="url(#logoGradient)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        />
        <motion.circle
          cx="31"
          cy="37"
          r="1.5"
          fill="url(#logoGradient)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        />
        
        {/* Connection lines */}
        <motion.path
          d="M24 34L17 37M24 34L31 37"
          stroke="url(#logoGradient)"
          strokeWidth="1"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 0.5, delay: 1 }}
        />
      </svg>
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
      </div>
    </motion.div>
  );
};

// ============================================
// AURORA BACKGROUND COMPONENT
// ============================================
const AuroraBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* CSS-animated gradient blobs */}
      <div 
        className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full animate-aurora-1"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.22) 0%, rgba(139, 92, 246, 0.08) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div 
        className="absolute -top-1/4 -right-1/4 w-[700px] h-[700px] rounded-full animate-aurora-2"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, rgba(167, 139, 250, 0.06) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div 
        className="absolute top-1/3 left-1/3 w-[600px] h-[600px] rounded-full animate-aurora-3"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, rgba(34, 211, 238, 0.04) 40%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Dot pattern */}
      <div 
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `radial-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};

// ============================================
// FLOATING FEATURE CARD COMPONENT
// ============================================
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  delay?: number;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

const FeatureCard = ({ icon, title, description, color, delay = 0, position }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="absolute hidden lg:block"
      style={position}
    >
      <motion.div
        variants={floatVariants}
        initial="initial"
        animate="animate"
        style={{ animationDelay: `${delay * 2}s` }}
        className={`relative p-4 rounded-2xl bg-[#0f0f22]/90 backdrop-blur-xl border border-white/10 shadow-xl max-w-[200px] group hover:border-${color}-500/30 transition-colors duration-300`}
      >
        {/* Glow effect */}
        <div className={`absolute -inset-px rounded-2xl bg-gradient-to-r from-${color}-500/20 to-${color}-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm`} />
        
        <div className="relative">
          <div className={`w-10 h-10 rounded-xl bg-${color}-500/15 flex items-center justify-center mb-3`}>
            {icon}
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          <p className="text-xs text-white/50 leading-relaxed">{description}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// STATS CARD COMPONENT
// ============================================
const StatsCard = () => {
  const stats = [
    { value: '50K+', label: 'Studenti', icon: GraduationCap },
    { value: '2.5M+', label: 'Ore Tracciate', icon: Timer },
    { value: '5M+', label: 'Flashcards', icon: BookOpen },
    { value: '4.9', suffix: '/5', label: 'Valutazione', icon: TrendingUp },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 backdrop-blur-sm">
        {/* Subtle glow */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-cyan-500/10 opacity-50 blur-sm" />
        
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
              className="text-center group"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-violet-400/60 group-hover:text-violet-400 transition-colors" />
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                  {stat.value}
                  <span className="text-violet-400">{stat.suffix}</span>
                </div>
              </div>
              <div className="text-sm text-white/40 group-hover:text-white/60 transition-colors">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// SCROLL INDICATOR COMPONENT
// ============================================
const ScrollIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.6 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <span className="text-xs text-white/30 uppercase tracking-wider">Scorri</span>
      <div className="w-6 h-10 rounded-full border border-white/20 flex items-start justify-center p-2 animate-bounce-slow">
        <div className="w-1 h-2 bg-violet-400 rounded-full animate-pulse" />
      </div>
      <ChevronDown className="w-4 h-4 text-white/20" />
    </motion.div>
  );
};

// ============================================
// MAIN HERO SECTION COMPONENT
// ============================================
export const HeroSection = ({ appUrl = '/' }: HeroSectionProps) => {
  const handleCtaClick = () => {
    window.location.href = appUrl + '/register';
  };

  const handleSecondaryClick = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a1a]">
      {/* CSS-based animated background */}
      <AuroraBackground />
      
      {/* Floating Feature Cards - Desktop Only */}
      <div className="absolute inset-0 max-w-7xl mx-auto pointer-events-none">
        <FeatureCard
          icon={<Timer className="w-5 h-5 text-violet-400" />}
          title="Time Tracking"
          description="Traccia ogni ora di studio con precisione"
          color="violet"
          delay={0.8}
          position={{ top: '20%', left: '5%' }}
        />
        <FeatureCard
          icon={<Brain className="w-5 h-5 text-purple-400" />}
          title="AI Flashcards"
          description="Genera flashcards intelligenti automaticamente"
          color="purple"
          delay={1}
          position={{ top: '15%', right: '8%' }}
        />
        <FeatureCard
          icon={<Target className="w-5 h-5 text-cyan-400" />}
          title="Goal Setting"
          description="Imposta e raggiungi i tuoi obiettivi"
          color="cyan"
          delay={1.2}
          position={{ bottom: '25%', left: '3%' }}
        />
        <FeatureCard
          icon={<Zap className="w-5 h-5 text-amber-400" />}
          title="Focus Mode"
          description="Massima concentrazione, zero distrazioni"
          color="amber"
          delay={1.4}
          position={{ bottom: '30%', right: '5%' }}
        />
      </div>
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-24 pt-32 lg:pt-40">
        <motion.div 
          className="text-center max-w-4xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div
            variants={fadeInUp}
            className="flex justify-center mb-10"
          >
            <div className="flex items-center gap-4">
              <SilviLogo className="w-12 h-12 sm:w-14 sm:h-14" />
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Silvi<span className="text-violet-400">.AI</span>
              </span>
            </div>
          </motion.div>
          
          {/* Badge */}
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-10"
          >
            <Sparkles className="w-4 h-4 text-violet-400 animate-sparkle" />
            <span className="text-sm text-violet-200">La produttività del futuro</span>
          </motion.div>
          
          {/* Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-[1.05] tracking-tight"
          >
            <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
              Studia in modo
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Intelligente
            </span>
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p
            variants={fadeInUp}
            className="text-lg sm:text-xl lg:text-2xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            L'app definitiva per studenti universitari. Time tracking, gestione progetti, 
            AI che genera flashcards e risolve esami.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            {/* Primary CTA */}
            <button
              onClick={handleCtaClick}
              className="group relative px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden w-full sm:w-auto"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                Prova Gratis
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
            
            {/* Secondary CTA */}
            <button
              onClick={handleSecondaryClick}
              className="group px-8 py-4 rounded-xl font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                  <Play className="w-4 h-4 text-violet-400 ml-0.5" />
                </div>
                Scopri di più
              </span>
            </button>
          </motion.div>
          
          {/* Stats */}
          <StatsCard />
        </motion.div>
      </div>
      
      {/* Scroll Indicator */}
      <ScrollIndicator />
    </section>
  );
};

export default HeroSection;
