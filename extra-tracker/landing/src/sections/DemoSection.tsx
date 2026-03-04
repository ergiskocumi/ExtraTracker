/**
 * 🎬 Interactive Demo Section Component
 * 
 * Features:
 * - Interactive tabs for 4 demo modes (Magic Generate, Exam Solver, Cinema Mode, AI Tutor)
 * - Browser chrome mockup around demo content
 * - Animated tab switching with AnimatePresence
 * - Glassmorphism effects and gradient accents
 * - Scroll-triggered entrance animations
 */

import { useState, useRef, useEffect } from 'react';
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
  MoreHorizontal,
  RotateCcw,
  Download,
  BookOpen,
  Lightbulb,
  Zap,
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
      className="text-center mb-12 md:mb-16"
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
// BROWSER CHROME COMPONENT
// ============================================
const BrowserChrome = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-60" />
      
      {/* Main container */}
      <div className="relative bg-[#0f0f22] border border-white/10 rounded-2xl overflow-hidden">
        {/* Browser header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0a0a1a] border-b border-white/5">
          {/* Window controls */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors cursor-pointer" />
          </div>
          
          {/* Address bar */}
          <div className="flex-1 max-w-md mx-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
              <span className="text-xs text-white/40 flex-1 text-center">app.silvi.ai/demo</span>
              <RotateCcw className="w-3 h-3 text-white/30" />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <MoreHorizontal className="w-4 h-4 text-white/30" />
          </div>
        </div>
        
        {/* Content */}
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAGIC GENERATE DEMO
// ============================================
const MagicGenerateDemo = () => {
  const [step, setStep] = useState<'upload' | 'processing' | 'complete'>('upload');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step === 'processing') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep('complete'), 500);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleUpload = () => {
    setStep('processing');
    setProgress(0);
  };

  const reset = () => {
    setStep('upload');
    setProgress(0);
  };

  return (
    <div className="p-6 md:p-8 min-h-[400px]">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full flex flex-col items-center justify-center"
          >
            {/* Upload area */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              className="w-full max-w-md p-8 rounded-2xl border-2 border-dashed border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all cursor-pointer group"
            >
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-violet-400" />
                </motion.div>
                <div className="text-center">
                  <p className="text-white font-medium mb-1">Carica il tuo PDF</p>
                  <p className="text-sm text-white/50">Trascina qui o clicca per selezionare</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <FileText className="w-4 h-4" />
                  <span>Supporta PDF fino a 50MB</span>
                </div>
              </div>
            </motion.div>

            {/* Sample files */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {['Anatomia.pdf', 'Fisica.pdf', 'Chimica.pdf'].map((file, i) => (
                <motion.button
                  key={file}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={handleUpload}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/30 transition-all"
                >
                  <FileText className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-white/70">{file}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <div className="w-full max-w-md">
              {/* Spinner */}
              <div className="flex justify-center mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="relative"
                >
                  <div className="w-20 h-20 rounded-full border-4 border-violet-500/20" />
                  <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-violet-500" />
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-violet-400" />
                </motion.div>
              </div>

              {/* Progress */}
              <div className="text-center mb-6">
                <p className="text-white font-medium mb-2">Generazione flashcards...</p>
                <p className="text-sm text-white/50">L'IA sta analizzando il contenuto</p>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* Steps */}
              <div className="mt-6 space-y-2">
                {[
                  { label: 'Estrazione testo', done: progress > 20 },
                  { label: 'Analisi contenuti', done: progress > 50 },
                  { label: 'Generazione Q&A', done: progress > 80 },
                  { label: 'Ottimizzazione', done: progress >= 100 },
                ].map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: step.done ? 1 : 0.5, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${step.done ? 'bg-violet-500/20' : 'bg-white/5'}`}>
                      {step.done ? (
                        <CheckCircle2 className="w-3 h-3 text-violet-400" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      )}
                    </div>
                    <span className={`text-sm ${step.done ? 'text-white/70' : 'text-white/40'}`}>
                      {step.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full"
          >
            {/* Success header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-medium">24 flashcards generate!</p>
                  <p className="text-sm text-white/50">Da Anatomia.pdf • 3 minuti</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={reset}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-white/60" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Salva</span>
                </motion.button>
              </div>
            </div>

            {/* Flashcards preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { q: 'Qual è la funzione principale del cuore?', a: 'Pompare il sangue attraverso il sistema circolatorio' },
                { q: 'Quante camere ha il cuore umano?', a: 'Quattro: due atri e due ventricoli' },
                { q: 'Cosa sono le valvole cardiache?', a: 'Strutture che regolano il flusso del sangue' },
                { q: 'Qual è il ciclo cardiaco?', a: 'La sequenza di contrazione e rilassamento del cuore' },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-violet-400">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm text-white/90 font-medium mb-1">{card.q}</p>
                      <p className="text-sm text-white/50 group-hover:text-white/70 transition-colors">{card.a}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* More indicator */}
            <div className="mt-4 text-center">
              <span className="text-sm text-white/40">+ 20 altre flashcards</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// EXAM SOLVER DEMO
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
      explanation: 'Il Watt (W) è l\'unità di misura della potenza elettrica, equivalente a un Joule al secondo.',
    },
  ];

  return (
    <div className="p-6 md:p-8 min-h-[400px]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Question list */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-sm text-white/50 mb-4">Domande esame Fisica I</p>
          {questions.map((q, i) => (
            <motion.button
              key={i}
              onClick={() => {
                setActiveQuestion(i);
                setShowAnswer(false);
              }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                activeQuestion === i
                  ? 'bg-violet-500/20 border border-violet-500/30'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activeQuestion === i ? 'bg-violet-500/30' : 'bg-white/10'
                }`}>
                  <span className={`text-xs font-medium ${activeQuestion === i ? 'text-violet-300' : 'text-white/60'}`}>
                    {i + 1}
                  </span>
                </div>
                <p className={`text-sm ${activeQuestion === i ? 'text-white' : 'text-white/70'}`}>
                  {q.q}
                </p>
              </div>
            </motion.button>
          ))}

          {/* Upload more */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/50">Carica altri esami</span>
          </motion.button>
        </div>

        {/* Active question */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 h-full">
                {/* Question */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileQuestion className="w-5 h-5 text-amber-400" />
                    <span className="text-sm text-amber-400 font-medium">Domanda {activeQuestion + 1}</span>
                  </div>
                  <h3 className="text-lg text-white font-medium">
                    {questions[activeQuestion].q}
                  </h3>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-6">
                  {questions[activeQuestion].options.map((opt, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-4 rounded-xl border transition-all ${
                        showAnswer
                          ? i === questions[activeQuestion].correct
                            ? 'bg-emerald-500/20 border-emerald-500/30'
                            : 'bg-white/5 border-white/10'
                          : 'bg-white/5 border-white/10 hover:border-violet-500/30 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          showAnswer && i === questions[activeQuestion].correct
                            ? 'border-emerald-500 bg-emerald-500/20'
                            : 'border-white/30'
                        }`}>
                          {showAnswer && i === questions[activeQuestion].correct && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <span className={`${
                          showAnswer && i === questions[activeQuestion].correct
                            ? 'text-emerald-300'
                            : 'text-white/80'
                        }`}>
                          {opt}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Answer reveal */}
                <AnimatePresence>
                  {showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAnswer(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg hover:shadow-amber-500/25 transition-all"
                  >
                    Mostra risposta corretta
                  </motion.button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CINEMA MODE DEMO
// ============================================
const CinemaModeDemo = () => {
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const flashcards = [
    { front: 'Cellula', back: 'Unità fondamentale della vita, delimitata da una membrana.' },
    { front: 'DNA', back: 'Acido desossiribonucleico, molecola che porta l\'informazione genetica.' },
    { front: 'Mitocondrio', back: 'Organello responsabile della produzione di ATP.' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFlipped(false);
      setTimeout(() => {
        setCurrentCard((prev) => (prev + 1) % flashcards.length);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 md:p-8 min-h-[400px]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* PDF Viewer */}
        <div className="rounded-xl bg-[#0a0a1a] border border-white/10 overflow-hidden">
          {/* PDF toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-white/70">Biologia_Capitolo3.pdf</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Pagina 12 di 45</span>
            </div>
          </div>
          
          {/* PDF content mock */}
          <div className="p-6 space-y-4">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-5/6" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-32 bg-cyan-500/10 rounded-lg border border-cyan-500/20 my-4 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/30" />
                </div>
                <span className="text-xs text-cyan-400/60">Diagramma cellula</span>
              </div>
            </div>
            <div className="h-4 bg-white/10 rounded w-2/3" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-4/5" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-3/4" />
          </div>
        </div>

        {/* Flashcard */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-white/70">Flashcards generate</span>
            </div>
            <span className="text-xs text-white/40">{currentCard + 1} / {flashcards.length}</span>
          </div>

          {/* Card */}
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              onClick={() => setFlipped(!flipped)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full max-w-sm aspect-[4/3] cursor-pointer perspective-1000"
            >
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                className="relative w-full h-full preserve-3d"
              >
                {/* Front */}
                <div className="absolute inset-0 backface-hidden">
                  <div className="w-full h-full p-8 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex flex-col items-center justify-center">
                    <span className="text-xs text-cyan-400/60 uppercase tracking-wider mb-4">Domanda</span>
                    <h3 className="text-2xl font-bold text-white text-center">
                      {flashcards[currentCard].front}
                    </h3>
                    <p className="text-sm text-white/40 mt-4">Clicca per girare</p>
                  </div>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 backface-hidden"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  <div className="w-full h-full p-8 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex flex-col items-center justify-center">
                    <span className="text-xs text-emerald-400/60 uppercase tracking-wider mb-4">Risposta</span>
                    <p className="text-lg text-white/90 text-center">
                      {flashcards[currentCard].back}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setFlipped(false);
                setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length);
              }}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white/60 rotate-180" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setFlipped(!flipped)}
              className="px-6 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
            >
              {flipped ? 'Nascondi' : 'Mostra'} risposta
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setFlipped(false);
                setCurrentCard((prev) => (prev + 1) % flashcards.length);
              }}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white/60" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// AI TUTOR DEMO
// ============================================
const AITutorDemo = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Ciao! Sono il tuo tutor AI. Come posso aiutarti oggi con i tuoi studi?',
      timestamp: '10:30',
    },
    {
      id: 2,
      type: 'user',
      content: 'Non capisco la legge di Ohm, puoi spiegarmela?',
      timestamp: '10:31',
    },
    {
      id: 3,
      type: 'ai',
      content: 'Certo! La legge di Ohm descrive la relazione tra tensione (V), corrente (I) e resistenza (R) in un circuito elettrico.',
      timestamp: '10:31',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      type: 'user' as const,
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai' as const,
        content: 'La formula è V = I × R. Immagina l\'acqua che scorre in un tubo: la pressione è la tensione, la portata è la corrente, e lo strozzamento del tubo è la resistenza. Più è stretto il tubo (resistenza alta), meno acqua passa (corrente bassa) per la stessa pressione!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-[400px]">
      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-white/40" />
          <span className="text-xs text-white/40">Fisica I</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
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

              {/* Message bubble */}
              <div className={`p-4 rounded-2xl ${
                msg.type === 'user'
                  ? 'bg-violet-500 text-white rounded-br-md'
                  : 'bg-white/5 text-white/90 rounded-bl-md border border-white/10'
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <span className={`text-xs mt-2 block ${
                  msg.type === 'user' ? 'text-violet-200' : 'text-white/40'
                }`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 rounded-bl-md">
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 rounded-full bg-emerald-400"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.15 }}
                  className="w-2 h-2 rounded-full bg-emerald-400"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }}
                  className="w-2 h-2 rounded-full bg-emerald-400"
                />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Scrivi un messaggio..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="w-11 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-white/40">Suggerimenti:</span>
          {['Spiegami...', 'Crea esercizi', 'Riassumi'].map((suggestion) => (
            <motion.button
              key={suggestion}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInputValue(suggestion + ' ')}
              className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 hover:border-emerald-500/30 transition-all"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
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

  // Active tab config for reference
  TABS.find((t) => t.id === activeTab)!;

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ backgroundColor: '#0a0a1a' }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]" />

        {/* Grid Pattern */}
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

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader />

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8"
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
                className={`relative flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-violet-500/20 border border-violet-500/30'
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
                    className={`w-5 h-5 transition-colors ${
                      isActive ? `text-${tab.color}-400` : 'text-white/50'
                    }`}
                    style={{ color: isActive ? undefined : undefined }}
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

        {/* Demo Browser */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <BrowserChrome>
            <DemoContent activeTab={activeTab} />
          </BrowserChrome>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
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
