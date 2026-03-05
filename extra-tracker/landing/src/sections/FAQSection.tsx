/**
 * 🚀 Modern FAQ Section Component
 * 
 * Features:
 * - Glassmorphism accordion design
 * - Animated text reveal for header
 * - Smooth expand/collapse with AnimatePresence
 * - Icon rotation animation
 * - Staggered item reveal on scroll
 * - Only one item open at a time
 * - First item open by default
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface FAQ {
  q: string;
  a: string;
}

interface FAQItemProps {
  faq: FAQ;
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
}

// ============================================================================
// Data
// ============================================================================

const FAQS: FAQ[] = [
  {
    q: "Come funziona il time tracking?",
    a: "Avvia il timer quando inizi a studiare. Silvi.AI categorizza automaticamente il tempo per corso e genera report dettagliati sulle tue abitudini."
  },
  {
    q: "Posso usare l'app su più dispositivi?",
    a: "Sì! Silvi.AI funziona su Web, iOS e Android con sincronizzazione istantanea dei dati tra tutti i dispositivi."
  },
  {
    q: "Quanto è accurato l'Exam Solver?",
    a: "Utilizza modelli AI avanzati. Fornisce risposte accurate con spiegazioni, ma ricorda sempre di verificare e usarlo come supporto."
  },
  {
    q: "I miei dati sono al sicuro?",
    a: "Assolutamente. Crittografia end-to-end, server in Europa (GDPR compliant), nessuna vendita di dati a terzi."
  },
  {
    q: "Posso cancellare quando voglio?",
    a: "Certo! Nessun vincolo. Cancelli quando vuoi e mantieni l'accesso fino alla fine del periodo pagato."
  },
  {
    q: "Come ottengo lo sconto studenti?",
    a: "Registrati con email .edu o carica un documento universitario. Lo sconto 50% si applica immediatamente."
  }
];

// ============================================================================
// Animation Variants
// ============================================================================

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

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1] as const,
    },
  },
};

const answerVariants = {
  hidden: { 
    opacity: 0, 
    height: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.4, 0.25, 1] as const,
    },
  },
  visible: { 
    opacity: 1, 
    height: "auto",
    transition: {
      duration: 0.3,
      ease: [0.25, 0.4, 0.25, 1] as const,
    },
  },
};

// ============================================================================
// Animated Text Component
// ============================================================================

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
}

function AnimatedText({ text, className = "", delay = 0 }: AnimatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <span ref={ref} className={className}>
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.4,
            delay: delay + index * 0.03,
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className="inline-block"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

// ============================================================================
// FAQ Item Component
// ============================================================================

function FAQItem({ faq, isOpen, onToggle }: FAQItemProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={`
        relative rounded-2xl overflow-hidden
        bg-white/[0.03] backdrop-blur-xl
        border border-white/10
        transition-all duration-300
        ${isOpen ? "bg-violet-500/[0.03] border-violet-500/20" : "hover:bg-white/[0.05]"}
      `}
    >
      {/* Question Button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 md:p-8 text-left group"
      >
        <span className={`
          text-base md:text-lg font-medium pr-6
          transition-colors duration-300
          ${isOpen ? "text-white" : "text-white/80 group-hover:text-white"}
        `}>
          {faq.q}
        </span>
        
        {/* Chevron Icon */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ 
            duration: 0.3, 
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className={`
            flex-shrink-0 w-10 h-10 rounded-xl
            flex items-center justify-center
            transition-colors duration-300
            ${isOpen 
              ? "bg-violet-500/20 text-violet-400" 
              : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/60"
            }
          `}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>
      
      {/* Answer */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            variants={answerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="overflow-hidden"
          >
            <div className="px-6 md:px-8 pb-6 md:pb-8">
              <div className="h-px bg-white/10 mb-5" />
              <p className="text-white/60 leading-relaxed">
                {faq.a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Section Header Component
// ============================================================================

function SectionHeader() {
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const isSubtitleInView = useInView(subtitleRef, { once: true, margin: "-100px" });
  
  return (
    <div className="text-center mb-16 md:mb-20">
      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
      >
        <HelpCircle className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium text-white/70">Domande frequenti</span>
      </motion.div>
      
      {/* Title */}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
        <AnimatedText text="Hai qualche " delay={0} />
        <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          <AnimatedText text="domanda?" delay={0.3} />
        </span>
      </h2>
      
      {/* Subtitle */}
      <motion.p
        ref={subtitleRef}
        initial={{ opacity: 0, y: 20 }}
        animate={isSubtitleInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
      >
        Trova le risposte alle domande più comuni su Silvi.AI
      </motion.p>
    </div>
  );
}

// ============================================================================
// Main FAQ Section Component
// ============================================================================

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ backgroundColor: "#0a0a1a" }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[120px]" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader />
        
        {/* FAQ Items */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="space-y-5"
        >
          {FAQS.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </motion.div>
        
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
          className="mt-16 md:mt-20 text-center"
        >
          <p className="text-white/40 text-sm">
            Non hai trovato la risposta che cercavi?{" "}
            <a 
              href="mailto:support@silvi.ai" 
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Contattaci
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default FAQSection;
