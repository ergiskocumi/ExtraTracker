/**
 * 💎 Modern Pricing Section Component
 * 
 * Features:
 * - Animated text reveal with gradient highlights
 * - Glassmorphism pricing cards
 * - Popular plan with ring highlight and pulse animation
 * - Staggered card reveal on scroll
 * - Price counter animation
 * - Hover lift and glow effects
 * - Trust elements with security icons
 */

import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Check, Sparkles, Shield, CreditCard, Lock, Zap } from 'lucide-react';

// ============================================
// TYPES & INTERFACES
// ============================================
export interface PricingSectionProps {
  onCtaClick?: (plan: string) => void;
  appUrl?: string;
}

interface PricingPlan {
  name: string;
  desc: string;
  price: string;
  original?: string;
  period: string;
  badge?: string;
  features: string[];
  cta: string;
  popular: boolean;
}

// ============================================
// PRICING DATA
// ============================================
const PRICING: PricingPlan[] = [
  {
    name: "Free",
    desc: "Per iniziare",
    price: "0",
    period: "per sempre",
    features: ["Time Tracking base", "2 progetti", "Timer Pomodoro", "50 flashcards", "App mobile"],
    cta: "Inizia Gratis",
    popular: false
  },
  {
    name: "Student Pro",
    desc: "Per studenti seri",
    price: "4.99",
    original: "9.99",
    period: "/mese",
    badge: "-50%",
    features: ["Tutto in Free", "Progetti illimitati", "Flashcards illimitate", "Magic Generate", "Exam Solver", "AI Tutor 24/7", "Analytics avanzate"],
    cta: "Scegli Pro",
    popular: true
  },
  {
    name: "Study Group",
    desc: "Per gruppi studio",
    price: "9.99",
    period: "/mese",
    features: ["Tutto in Pro", "5 utenti", "Deck condivisi", "Admin dashboard", "Supporto VIP"],
    cta: "Contattaci",
    popular: false
  }
];

// ============================================
// ANIMATION VARIANTS
// ============================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 50,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const fadeUpVariants = {
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

const wordVariants = {
  hidden: { 
    opacity: 0, 
    y: 40,
    filter: 'blur(10px)',
  },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// ============================================
// ANIMATED COUNTER COMPONENT
// ============================================
const AnimatedPrice = ({ value, isInView }: { value: string; isInView: boolean }) => {
  const numericValue = parseFloat(value);
  const hasDecimal = value.includes('.');
  const [displayValue, setDisplayValue] = useState(0);
  
  const springValue = useSpring(0, { 
    stiffness: 50, 
    damping: 20,
    duration: 1.5,
  });
  
  const display = useTransform(springValue, (latest) => 
    hasDecimal ? latest.toFixed(2) : Math.floor(latest).toString()
  );

  useEffect(() => {
    if (isInView) {
      springValue.set(numericValue);
    }
  }, [isInView, numericValue, springValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => {
      setDisplayValue(parseFloat(latest));
    });
    return () => unsubscribe();
  }, [display]);

  return (
    <motion.span className="tabular-nums">
      {hasDecimal ? displayValue.toFixed(2) : displayValue}
    </motion.span>
  );
};

// ============================================
// SECTION HEADER COMPONENT
// ============================================
const SectionHeader = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(headerRef, { once: true, margin: "-100px" });

  const titleWords = ["Investi", "nel", "tuo"];
  const highlightWord = "futuro";

  return (
    <motion.div
      ref={headerRef}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className="text-center mb-16 md:mb-20"
    >
      {/* Eyebrow */}
      <motion.div
        variants={fadeUpVariants}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6"
      >
        <Sparkles className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium text-violet-200">Prezzi</span>
      </motion.div>

      {/* Title with word-by-word animation */}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
        <span className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {titleWords.map((word, i) => (
            <motion.span
              key={i}
              variants={wordVariants}
              className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent"
            >
              {word}
            </motion.span>
          ))}
        </span>
        <br className="hidden sm:block" />
        <motion.span
          variants={wordVariants}
          className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent inline-block"
        >
          {highlightWord}
        </motion.span>
      </h2>

      {/* Subtitle */}
      <motion.p
        variants={fadeUpVariants}
        className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
      >
        Meno di un caffè al giorno per cambiare il tuo percorso universitario.
      </motion.p>
    </motion.div>
  );
};

// ============================================
// PRICING CARD COMPONENT
// ============================================
interface PricingCardProps {
  plan: PricingPlan;
  index: number;
  onCtaClick?: (plan: string) => void;
}

const PricingCard = ({ plan, index, onCtaClick }: PricingCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });
  const [isHovered, setIsHovered] = useState(false);

  // Mouse position for glow effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const spotlightX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), { stiffness: 300, damping: 30 });
  const spotlightY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleCta = () => {
    if (onCtaClick) {
      onCtaClick(plan.name);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{ delay: index * 0.15 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative group ${plan.popular ? 'lg:-mt-4 lg:mb-4' : ''}`}
    >
      {/* Popular card glow effect */}
      {plan.popular && (
        <motion.div
          className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 opacity-75 blur-sm"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Card container */}
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`
          relative h-full p-6 md:p-8 rounded-2xl
          bg-white/[0.03] backdrop-blur-xl
          border ${plan.popular ? 'border-violet-500/50' : 'border-white/10'}
          transition-shadow duration-500
          ${isHovered && !plan.popular ? 'shadow-2xl shadow-violet-500/10' : 'shadow-lg shadow-black/5'}
          ${plan.popular ? 'shadow-2xl shadow-violet-500/20' : ''}
          overflow-hidden
        `}
      >
        {/* Spotlight effect on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: useTransform(
              [spotlightX, spotlightY],
              ([x, y]) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(255,255,255,0.06), transparent 40%)`
            ),
          }}
        />

        {/* Popular badge */}
        {plan.popular && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-sm font-medium text-white shadow-lg shadow-violet-500/30 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Più Popolare
            </div>
          </motion.div>
        )}

        {/* Discount badge */}
        {plan.badge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30"
          >
            {plan.badge}
          </motion.div>
        )}

        {/* Plan header */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
          <p className="text-sm text-white/50">{plan.desc}</p>
        </div>

        {/* Price section */}
        <div className="mb-8">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-4xl md:text-5xl font-bold text-white">
              €<AnimatedPrice value={plan.price} isInView={isInView} />
            </span>
            <span className="text-white/50">{plan.period}</span>
            {plan.original && (
              <span className="text-sm text-white/30 line-through ml-2">€{plan.original}</span>
            )}
          </div>
        </div>

        {/* Features list */}
        <ul className="space-y-4 mb-8">
          {plan.features.map((feature, fIdx) => (
            <motion.li
              key={fIdx}
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 + index * 0.1 + fIdx * 0.05 }}
              className="flex items-start gap-3 text-sm text-white/70"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              {feature}
            </motion.li>
          ))}
        </ul>

        {/* CTA Button */}
        <motion.button
          onClick={handleCta}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            w-full py-3.5 rounded-xl font-semibold transition-all duration-300
            ${plan.popular
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50'
              : 'bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20'
            }
          `}
        >
          {/* Shimmer effect for popular button */}
          {plan.popular && (
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
          <span className="relative z-10">{plan.cta}</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// TRUST ELEMENTS COMPONENT
// ============================================
const TrustElements = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const trustItems = [
    { icon: Shield, text: "Pagamenti sicuri" },
    { icon: Lock, text: "Crittografia SSL" },
    { icon: CreditCard, text: "Carte accettate" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="mt-12 md:mt-16 text-center"
    >
      {/* Discount note */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
      >
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-emerald-300">50% di sconto con email .edu o documento universitario</span>
      </motion.div>

      {/* Security icons */}
      <div className="flex flex-wrap items-center justify-center gap-6">
        {trustItems.map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
            className="flex items-center gap-2 text-white/40"
          >
            <item.icon className="w-4 h-4" />
            <span className="text-xs">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================
// BACKGROUND ELEMENTS
// ============================================
const BackgroundElements = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Gradient orbs */}
      <motion.div
        className="absolute top-1/4 -left-32 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px]"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px]"
        animate={{
          x: [0, -30, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Grid pattern */}
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
    </div>
  );
};

// ============================================
// MAIN PRICING SECTION COMPONENT
// ============================================
export const PricingSection = ({ onCtaClick }: PricingSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ backgroundColor: "#0a0a1a" }}
    >
      <BackgroundElements />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader />

        {/* Pricing cards grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid md:grid-cols-3 gap-6 lg:gap-8"
        >
          {PRICING.map((plan, index) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              index={index}
              onCtaClick={onCtaClick}
            />
          ))}
        </motion.div>

        {/* Trust elements */}
        <TrustElements />
      </div>
    </section>
  );
};

export default PricingSection;
