/**
 * 🎬 Interactive Demo Section Component - Simplified & Clean
 * 
 * Features:
 * - Interactive tabs for 4 demo modes (Magic Generate, Exam Solver, Cinema Mode, AI Tutor)
 * - Simple, clean feature previews without fake browser chrome
 * - Animated tab switching with AnimatePresence
 * - Better spacing and breathing room
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Sparkles,
  FileQuestion,
  Monitor,
  Bot,
  Upload,
  FileText,
  CheckCircle2,
  Send,
  User,
  ChevronRight,
  Play,
  BookOpen,
  Lightbulb,
} from 'lucide-react';

// ============================================
// TYPES & INTERFACES
// ============================================
type DemoTab = 'magic-generate' | 'exam-solver' | 'cinema-mode' | 'ai-tutor';

interface TabConfig {
  id: DemoTab;
  label: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
}

// ============================================
// TAB CONFIGURATION
// ============================================
const TABS: TabConfig[] = [
  {
    id: 'magic-generate',
    label: 'Magic Generate',
    icon: Sparkles,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-400',
  },
  {
    id: 'exam-solver',
    label: 'Exam Solver',
    icon: FileQuestion,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-400',
  },
  {
    id: 'cinema-mode',
    label: 'Cinema Mode',
    icon: Monitor,
    color: 'cyan',
    gradient: 'from-cyan-500 to-sky-400',
  },
  {
    id: 'ai-tutor',
    label: 'AI Tutor',
    icon: Bot,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-400',
  },
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

const tabContentVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
    },
  },
};

// ============================================
// SECTION HEADER COMPONENT
// ============================================
const SectionHeader = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="text-center mb-16 md:mb-20"
    >
      {/* Eyebrow */}
      <motion.div
        variants={fadeUpVariants}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
      >
        <Play className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium text-white/70">Vedi in azione</span>
      </motion.div>

      {/* Title */}
      <motion.h2
        variants={fadeUpVariants}
        className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6"
      >
        <span className="text-white">Prova le </span>
        <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          funzionalità AI
        </span>
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        variants={fadeUpVariants}
        className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto"
      >
        Esplora le demo interattive e scopri come l'IA trasforma il tuo modo di studiare
      </motion.p>
    </motion.div>
  );
};

// ============================================
// MAGIC GENERATE DEMO - Simple Card Preview
// ============================================
const MagicGenerateDemo = () => {
  return (
    <div className="p-8 md:p-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/30 transition-colors"
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Carica il tuo PDF</h4>
              <p className="text-sm text-white/50">Trascina qui o clicca per selezionare</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <FileText className="w-4 h-4" />
              <span>Supporta PDF fino a 50MB</span>
            </div>
          </div>
        </motion.div>

        {/* Arrow */}
        <div className="hidden lg:flex justify-center">
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronRight className="w-8 h-8 text-white/20" />
          </motion.div>
        </div>

        {/* Result Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-1 space-y-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">24 flashcards generate!</span>
          </div>
          
          {[
            { q: 'Qual è la funzione principale del cuore?', a: 'Pompare il sangue attraverso il sistema circolatorio' },
            { q: 'Quante camere ha il cuore umano?', a: 'Quattro: due atri e due ventricoli' },
            { q: 'Cosa sono le valvole cardiache?', a: 'Strutture che regolano il flusso del sangue' },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-violet-400">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm text-white/90 font-medium mb-1">{card.q}</p>
                  <p className="text-sm text-white/50">{card.a}</p>
                </div>
              </div>
            </motion.div>
          ))}
          
          <p className="text-sm text-white/40 text-center">+ 21 altre flashcards</p>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// EXAM SOLVER DEMO - Simple Q&A Format
// ============================================
const ExamSolverDemo = () => {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const questions = [
    {
      q: 'Qual è la legge di Ohm?',
      options: ['V = I × R', 'P = V × I', 'R = V / I', 'I = V / R'],
      correct: 0,
      explanation: 'La legge di Ohm stabilisce che la tensione (V) è uguale alla corrente (I) moltiplicata per la resistenza (R).',
    },
    {
      q: 'In un circuito in serie, cosa succede alla corrente?',
      options: ['Si divide', 'Rimane costante', 'Aumenta', 'Diminuisce'],
      correct: 1,
      explanation: 'In un circuito in serie, la corrente è la stessa in tutti i punti del circuito.',
    },
    {
      q: 'Qual è l\'unità di misura della potenza elettrica?',
      options: ['Volt', 'Ampere', 'Watt', 'Ohm'],
      correct: 2,
      explanation: 'Il Watt (W) è l\'unità di misura della potenza elettrica.',
    },
  ];

  return (
    <div className="p-8 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Question List */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {questions.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => {
                setActiveQuestion(i);
                setShowAnswer(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeQuestion === i
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              Domanda {i + 1}
            </motion.button>
          ))}
        </div>

        {/* Active Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeQuestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Question */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <FileQuestion className="w-5 h-5 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">Domanda {activeQuestion + 1}</span>
              </div>
              <h3 className="text-xl text-white font-medium">
                {questions[activeQuestion].q}
              </h3>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {questions[activeQuestion].options.map((opt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    showAnswer
                      ? i === questions[activeQuestion].correct
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-white/50'
                      : 'bg-white/5 border-white/10 text-white/80 hover:border-amber-500/30'
                  }`}
                >
                  {opt}
                </motion.div>
              ))}
            </div>

            {/* Answer Reveal */}
            <AnimatePresence>
              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-300 mb-1">Spiegazione</p>
                      <p className="text-sm text-white/70">{questions[activeQuestion].explanation}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action */}
            {!showAnswer && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAnswer(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                Mostra risposta corretta
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================
// CINEMA MODE DEMO - Side-by-Side Layout
// ============================================
const CinemaModeDemo = () => {
  return (
    <div className="p-8 md:p-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF Side */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-white/70">Biologia_Capitolo3.pdf</span>
          </div>
          
          {/* PDF Content Mock */}
          <div className="space-y-3">
            <div className="h-3 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-5/6" />
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-24 bg-cyan-500/10 rounded-lg border border-cyan-500/20 my-4 flex items-center justify-center">
              <span className="text-xs text-cyan-400/60">Diagramma cellula</span>
            </div>
            <div className="h-3 bg-white/10 rounded w-2/3" />
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-4/5" />
          </div>
        </motion.div>

        {/* Flashcard Side */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-white/70">Flashcard 1/12</span>
            </div>
          </div>

          <div className="aspect-[4/3] flex flex-col items-center justify-center text-center p-6">
            <span className="text-xs text-cyan-400/60 uppercase tracking-wider mb-4">Domanda</span>
            <h3 className="text-2xl font-bold text-white mb-4">
              Qual è la funzione dei mitocondri?
            </h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium"
            >
              Mostra risposta
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Feature Description */}
      <div className="mt-8 text-center">
        <p className="text-white/50 text-sm">
          Studia i tuoi PDF con flashcards generate automaticamente, affiancate per un apprendimento efficiente
        </p>
      </div>
    </div>
  );
};

// ============================================
// AI TUTOR DEMO - Simple Chat Bubbles
// ============================================
const AITutorDemo = () => {
  const messages = [
    {
      type: 'ai',
      content: 'Ciao! Sono il tuo tutor AI. Come posso aiutarti oggi?',
    },
    {
      type: 'user',
      content: 'Non capisco la legge di Ohm',
    },
    {
      type: 'ai',
      content: 'La legge di Ohm descrive la relazione tra tensione (V), corrente (I) e resistenza (R): V = I × R. Immagina l\'acqua che scorre in un tubo!',
    },
  ];

  return (
    <div className="p-8 md:p-12">
      <div className="max-w-2xl mx-auto">
        {/* Chat Header */}
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-medium">AI Tutor</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Online</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-white/40" />
            <span className="text-xs text-white/40">Fisica I</span>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.type === 'user'
                    ? 'bg-violet-500'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                }`}>
                  {msg.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl ${
                  msg.type === 'user'
                    ? 'bg-violet-500 text-white rounded-br-md'
                    : 'bg-white/5 text-white/90 rounded-bl-md border border-white/10'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex items-center gap-3"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Scrivi un messaggio..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500/50 transition-colors"
              readOnly
            />
          </div>
          <button className="w-11 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// DEMO CONTENT SWITCHER
// ============================================
const DemoContent = ({ activeTab }: { activeTab: DemoTab }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        variants={tabContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {activeTab === 'magic-generate' && <MagicGenerateDemo />}
        {activeTab === 'exam-solver' && <ExamSolverDemo />}
        {activeTab === 'cinema-mode' && <CinemaModeDemo />}
        {activeTab === 'ai-tutor' && <AITutorDemo />}
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================
// MAIN DEMO SECTION COMPONENT
// ============================================
export const DemoSection = () => {
  const [activeTab, setActiveTab] = useState<DemoTab>('magic-generate');
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ backgroundColor: '#0a0a1a' }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader />

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex items-center gap-2 px-5 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-white/10 border border-white/20'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-10 rounded-xl`}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                <div className="relative flex items-center gap-2">
                  <Icon
                    className="w-5 h-5 transition-colors"
                    style={{ color: isActive ? `var(--color-${tab.color}-400)` : 'rgba(255,255,255,0.5)' }}
                  />
                  <span
                    className={`text-sm font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-white/70'
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Demo Content - Clean Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-cyan-500/10 rounded-3xl blur-xl opacity-60" />
          
          {/* Main content card */}
          <div className="relative bg-[#0f0f22]/80 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <DemoContent activeTab={activeTab} />
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 text-center"
        >
          <p className="text-white/40 text-sm mb-4">
            Pronto a trasformare il tuo studio?
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-violet-500/30 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Inizia gratis
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default DemoSection;
