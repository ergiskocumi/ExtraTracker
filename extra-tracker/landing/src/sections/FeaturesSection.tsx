import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Clock,
  FolderKanban,
  Timer,
  Sparkles,
  FileQuestion,
  Monitor,
  Bot,
  BarChart3,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface Feature {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  gradient: string;
}

// ============================================================================
// Data
// ============================================================================

const FEATURES: Feature[] = [
  {
    id: "time-tracking",
    icon: Clock,
    title: "Time Tracking",
    subtitle: "Traccia ogni secondo",
    description: "Timer intelligente che categorizza automaticamente il tempo per corso e progetto.",
    color: "blue",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    id: "projects",
    icon: FolderKanban,
    title: "Gestione Progetti",
    subtitle: "Organizza i corsi",
    description: "Board Kanban, task, milestone e scadenze per ogni corso universitario.",
    color: "emerald",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    id: "pomodoro",
    icon: Timer,
    title: "Pomodoro",
    subtitle: "Sessioni di focus",
    description: "Timer Pomodoro integrato con statistiche e modalità deep work.",
    color: "rose",
    gradient: "from-rose-500 to-pink-400",
  },
  {
    id: "magic-generate",
    icon: Sparkles,
    title: "Magic Generate",
    subtitle: "Flashcards da PDF",
    description: "L'IA genera flashcards ottimizzate dai tuoi PDF in 30 secondi.",
    color: "violet",
    gradient: "from-violet-500 to-purple-400",
  },
  {
    id: "exam-solver",
    icon: FileQuestion,
    title: "Exam Solver",
    subtitle: "Risolvi esami",
    description: "Carica esami passati e ottieni risposte accurate con spiegazioni.",
    color: "amber",
    gradient: "from-amber-500 to-orange-400",
  },
  {
    id: "cinema-mode",
    icon: Monitor,
    title: "Cinema Mode",
    subtitle: "Studio immersivo",
    description: "PDF e flashcards side-by-side per uno studio senza distrazioni.",
    color: "cyan",
    gradient: "from-cyan-500 to-blue-400",
  },
  {
    id: "ai-tutor",
    icon: Bot,
    title: "AI Tutor",
    subtitle: "Professore 24/7",
    description: "Chiedi spiegazioni e ricevi risposte personalizzate dai tuoi materiali.",
    color: "fuchsia",
    gradient: "from-fuchsia-500 to-pink-400",
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics",
    subtitle: "Statistiche complete",
    description: "Heatmap, trend produttività e insight dettagliati sul tuo studio.",
    color: "indigo",
    gradient: "from-indigo-500 to-violet-400",
  },
];

// ============================================================================
// Feature Card Component
// ============================================================================

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const Icon = feature.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className="group"
    >
      <div
        className={`
          relative h-full p-6 md:p-8 rounded-2xl
          bg-white/[0.03] backdrop-blur-xl
          border border-white/10
          transition-all duration-300 ease-out
          hover:bg-white/[0.06]
          hover:border-white/20
          hover:shadow-lg hover:shadow-${feature.color}-500/10
          hover:-translate-y-1
          overflow-hidden
        `}
      >
        {/* Subtle gradient background on hover */}
        <div
          className={`
            absolute inset-0 rounded-2xl opacity-0 
            group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
            bg-gradient-to-br ${feature.gradient} opacity-5
          `}
        />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div
            className={`
              w-12 h-12 rounded-xl mb-5
              bg-${feature.color}-500/10
              flex items-center justify-center
              border border-white/5
              transition-transform duration-300
              group-hover:scale-110 group-hover:rotate-3
            `}
          >
            <Icon className={`w-6 h-6 text-${feature.color}-400`} />
          </div>
          
          {/* Subtitle */}
          <p className={`text-sm font-medium bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent mb-3`}>
            {feature.subtitle}
          </p>
          
          {/* Title */}
          <h3 className="text-lg font-semibold text-white mb-3">
            {feature.title}
          </h3>
          
          {/* Description */}
          <p className="text-sm text-white/60 leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Section Header Component
// ============================================================================

function SectionHeader() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <div ref={ref} className="text-center mb-16 md:mb-20">
      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
      >
        <Sparkles className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium text-white/70">Tutto ciò che ti serve</span>
      </motion.div>
      
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
        className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6"
      >
        Tutto quello che serve per{" "}
        <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          superare gli esami
        </span>
      </motion.h2>
      
      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
        className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
      >
        Una suite completa di strumenti progettati per ottimizzare ogni aspetto del tuo studio universitario
      </motion.p>
    </div>
  );
}

// ============================================================================
// Main Features Section Component
// ============================================================================

export function FeaturesSection() {
  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ backgroundColor: "#0a0a1a" }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[120px]" />
        
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
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader />
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
        
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="mt-16 md:mt-20 text-center"
        >
          <p className="text-white/40 text-sm">
            E molto altro in arrivo...{" "}
            <span className="text-white/60">🚀</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default FeaturesSection;
