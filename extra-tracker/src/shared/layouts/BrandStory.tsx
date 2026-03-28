import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Logo } from '../components/Brand/Logo';
import { X, Sparkles, Layers, Fingerprint, ChevronRight, Quote } from 'lucide-react';

type StoryChapter = 'intro' | 'logo' | 'grid';
const CHAPTER_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

// Animation variants
const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.3, delay: 0.1 } }
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 40 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: 'spring',
      damping: 25,
      stiffness: 300,
      delay: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: 0.3 }
  }
};

const chapterVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { 
      duration: 0.5,
      ease: CHAPTER_EASE
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
    transition: { duration: 0.3 }
  })
};

const floatAnimation = {
  y: [-5, 5, -5],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut' as const
  }
};

export const BrandStory: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chapter, setChapter] = useState<StoryChapter>('intro');
  const [direction, setDirection] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleChapterChange = (newChapter: StoryChapter) => {
    const chapters: StoryChapter[] = ['intro', 'logo', 'grid'];
    const currentIndex = chapters.indexOf(chapter);
    const newIndex = chapters.indexOf(newChapter);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setChapter(newChapter);
  };

  if (!isVisible && !isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        className="fixed bottom-6 right-6 z-40 group"
      >
        <div className="relative flex items-center gap-3 pl-5 pr-3 py-3 rounded-full bg-dark-400/60 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/20 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative flex flex-col items-start">
            <span className="text-[10px] uppercase tracking-widest text-primary-400 font-semibold">The Story</span>
            <span className="text-sm font-medium text-white tracking-wide">Behind Silvi AI</span>
          </div>
          
          <motion.div 
            className="relative bg-primary-500/20 p-2 rounded-full text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all duration-300"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
        </div>
        
        {/* Ping animation */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-40"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
        </span>
      </motion.button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-8"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Cinematic Backdrop with gradient */}
          <motion.div 
            className="absolute inset-0 bg-dark-500/90"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-violet-500/5 pointer-events-none" />

          {/* Main Modal */}
          <motion.div 
            className="relative w-full h-full sm:h-[85vh] sm:max-w-6xl md:h-[680px] bg-dark-400 border-0 sm:border border-white/10 shadow-2xl rounded-none sm:rounded-[32px] overflow-hidden flex flex-col md:flex-row"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Ambient glow */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Close Button */}
            <motion.button 
              onClick={() => setIsOpen(false)}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* LEFT: Navigation Sidebar */}
            <div className="w-full md:w-80 flex-shrink-0 border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02] p-4 sm:p-6 md:p-8 flex flex-col relative overflow-hidden">
              {/* Decorative gradient line */}
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
              
              <div className="mb-6 sm:mb-8">
                <motion.h1 
                  className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Logo size="sm" variant="icon-only" />
                  <span>Philosophy</span>
                </motion.h1>
              </div>

              <nav className="flex-1 space-y-2">
                <ChapterButton 
                  active={chapter === 'intro'} 
                  onClick={() => handleChapterChange('intro')}
                  icon={<Fingerprint className="w-4 h-4" />}
                  title="La Visione"
                  subtitle="Perché siamo qui"
                  delay={0.1}
                />
                <ChapterButton 
                  active={chapter === 'logo'} 
                  onClick={() => handleChapterChange('logo')}
                  icon={<Sparkles className="w-4 h-4" />}
                  title="Il Simbolo"
                  subtitle="Istinto e Intelligenza"
                  delay={0.2}
                />
                <ChapterButton 
                  active={chapter === 'grid'} 
                  onClick={() => handleChapterChange('grid')}
                  icon={<Layers className="w-4 h-4" />}
                  title="L'Ecosistema"
                  subtitle="Il tessuto digitale"
                  delay={0.3}
                />
              </nav>

              {/* Progress indicator */}
              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex gap-2 justify-center">
                  {(['intro', 'logo', 'grid'] as StoryChapter[]).map((c, _i) => (
                    <motion.div
                      key={c}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        chapter === c ? 'w-6 bg-primary-500' : 'w-1.5 bg-white/20'
                      }`}
                      initial={false}
                      animate={{ scale: chapter === c ? 1 : 0.8 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Content Area */}
            <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-dark-400 via-dark-500 to-dark-600">
              {/* Animated background grid */}
              <div className="absolute inset-0 opacity-[0.02]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:60px_60px]" />
              </div>

              <AnimatePresence mode="wait" custom={direction}>
                {/* CHAPTER 1: INTRO */}
                {chapter === 'intro' && (
                  <motion.div
                    key="intro"
                    custom={direction}
                    variants={chapterVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-16 flex flex-col justify-center overflow-y-auto"
                  >
                    <div className="max-w-2xl mx-auto">
                      <motion.span 
                        className="inline-block px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        Capitolo I: La Genesi
                      </motion.span>
                      
                      <motion.h2 
                        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        L'ambizione umana è{' '}
                        <span className="relative inline-block">
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                            caos
                          </span>
                          <motion.span 
                            className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-amber-600"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.6, duration: 0.4 }}
                          />
                        </span>
                        .<br/>
                        L'intelligenza è{' '}
                        <span className="relative inline-block">
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">
                            ordine
                          </span>
                          <motion.span 
                            className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-violet-400 to-violet-600"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.8, duration: 0.4 }}
                          />
                        </span>
                        .
                      </motion.h2>
                      
                      <motion.div 
                        className="space-y-6 text-slate-400 leading-relaxed border-l-2 border-white/10 pl-6 mb-8"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <p className="text-base sm:text-lg">
                          Abbiamo creato Silvi AI per risolvere l'eterno conflitto dello studente e del creatore: avere troppe idee e troppo poco metodo.
                        </p>
                        <p className="text-base sm:text-lg">
                          Non è solo un software. È un'architettura mentale. È il luogo dove la tua creatività biologica incontra la precisione sintetica.
                        </p>
                      </motion.div>
                      
                      <motion.button 
                        onClick={() => handleChapterChange('logo')}
                        className="group flex items-center gap-2 text-white font-medium text-sm sm:text-base"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ x: 5 }}
                      >
                        <span className="relative">
                          Scopri il Simbolo
                          <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-white group-hover:w-full transition-all duration-300" />
                        </span>
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ChevronRight className="w-4 h-4 text-primary-400" />
                        </motion.span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* CHAPTER 2: LOGO */}
                {chapter === 'logo' && (
                  <motion.div
                    key="logo"
                    custom={direction}
                    variants={chapterVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col overflow-y-auto"
                  >
                    <div className="flex-1 flex flex-col md:flex-row gap-6 sm:gap-8 md:gap-12 items-center justify-center min-h-0">
                      {/* Visual Stage */}
                      <motion.div 
                        className="w-full md:w-1/2 aspect-square flex items-center justify-center relative flex-shrink-0"
                        animate={floatAnimation}
                      >
                        {/* Glowing background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-violet-500/20 to-transparent rounded-full blur-[80px] animate-pulse" />
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-violet-600/10 rounded-full blur-[60px]"
                          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        />
                        
                        {/* Logo with glow */}
                        <motion.div 
                          className="relative transform scale-[2] sm:scale-[2.5] md:scale-[3]"
                          whileHover={{ scale: 3.2, rotate: 5 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                        >
                          <div className="absolute inset-0 blur-xl bg-primary-500/50 rounded-full" />
                          <Logo variant="icon-only" size="lg" />
                        </motion.div>

                        {/* Orbiting particles */}
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-primary-400/60"
                            animate={{
                              rotate: 360,
                            }}
                            transition={{
                              duration: 8 + i * 2,
                              repeat: Infinity,
                              ease: "linear",
                              delay: i * 2
                            }}
                            style={{
                              originX: '50%',
                              originY: '50%',
                            }}
                          >
                            <div 
                              className="absolute w-full h-full rounded-full bg-primary-400"
                              style={{
                                transform: `translateX(${80 + i * 20}px)`,
                              }}
                            />
                          </motion.div>
                        ))}
                      </motion.div>

                      {/* Narrative */}
                      <div className="w-full md:w-1/2 space-y-6">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <span className="text-primary-400 font-mono text-xs uppercase tracking-widest mb-2 block">
                            Capitolo II
                          </span>
                          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">La Scintilla Sinaptica</h3>
                          <p className="text-sm sm:text-base text-slate-400">Due forze che convergono senza mai scontrarsi.</p>
                        </motion.div>

                        <div className="space-y-4">
                          <NarrativePoint color="bg-amber-500" title="L'Intento Umano (Ambra)" delay={0.3}>
                            Rappresenta te. È la fiamma dell'aspirazione, la curiosità grezza, l'istinto che dice "voglio imparare". Scende dall'alto perché è l'ispirazione.
                          </NarrativePoint>
                          
                          <NarrativePoint color="bg-violet-600" title="La Fondazione AI (Viola)" delay={0.4}>
                            Rappresenta Silvi. È la rete neurale, la struttura logica che sale dal basso per accogliere la tua idea e impedirle di cadere nel vuoto.
                          </NarrativePoint>
                        </div>

                        <motion.div 
                          className="p-4 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden group"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          whileHover={{ scale: 1.02, borderColor: 'rgba(139, 92, 246, 0.3)' }}
                        >
                          <Quote className="absolute top-2 left-2 w-6 h-6 text-white/10 group-hover:text-primary-500/20 transition-colors" />
                          <p className="text-sm text-slate-300 italic leading-relaxed relative z-10">
                            "E nel mezzo? Quella 'S' vuota al centro? Quello è lo spazio sacro del <strong className="text-primary-400">Flow</strong>. È dove tu e l'AI lavorate all'unisono."
                          </p>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* CHAPTER 3: GRID */}
                {chapter === 'grid' && (
                  <motion.div
                    key="grid"
                    custom={direction}
                    variants={chapterVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col overflow-y-auto"
                  >
                    {/* Animated Grid Background */}
                    <div className="absolute inset-0 overflow-hidden">
                      <motion.div 
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                        transition={{ duration: 1 }}
                      >
                        {/* Grid lines */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.3)_1px,transparent_1px)] bg-[size:50px_50px]" />
                      </motion.div>
                      
                      {/* Moving beams */}
                      <motion.div 
                        className="absolute top-[30%] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.div 
                        className="absolute top-[60%] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-500 to-transparent"
                        animate={{ x: ['100%', '-100%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
                      />
                      <motion.div 
                        className="absolute top-0 left-[40%] h-full w-[2px] bg-gradient-to-b from-transparent via-violet-500 to-transparent"
                        animate={{ y: ['-100%', '100%'] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "linear", delay: 0.5 }}
                      />
                    </div>

                    <div className="relative z-10 max-w-2xl mx-auto sm:mx-0 md:ml-12 h-full flex flex-col justify-center">
                      <motion.span 
                        className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        Capitolo III: L'Infrastruttura
                      </motion.span>
                      
                      <motion.h3 
                        className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        Il Silenzio dietro il Rumore
                      </motion.h3>
                      
                      <motion.p 
                        className="text-sm sm:text-base md:text-lg text-slate-400 leading-relaxed mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        Hai notato la griglia sottile sullo sfondo? Non è decorazione. È una dichiarazione d'intenti.
                        <br/><br/>
                        Viviamo in un mondo digitale rumoroso, fatto di notifiche e caos. Silvi AI elimina tutto questo.
                      </motion.p>

                      <motion.div 
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <motion.div 
                          className="p-5 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md relative overflow-hidden group"
                          whileHover={{ scale: 1.02, y: -5 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <motion.div 
                            className="text-amber-400 font-bold mb-2 flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                          >
                            <motion.div 
                              className="w-2 h-2 rounded-full bg-amber-400"
                              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            Velocità della Luce
                          </motion.div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            I fasci di luce Ambra sono i tuoi pensieri che viaggiano senza ostacoli lungo autostrade ottimizzate.
                          </p>
                        </motion.div>
                        
                        <motion.div 
                          className="p-5 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md relative overflow-hidden group"
                          whileHover={{ scale: 1.02, y: -5 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <motion.div 
                            className="text-violet-400 font-bold mb-2 flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                          >
                            <motion.div 
                              className="w-2 h-2 rounded-full bg-violet-400"
                              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            />
                            Supporto Invisibile
                          </motion.div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            La griglia è sempre lì. Non la noti mentre lavori, ma sai che se cadi, c'è una struttura pronta a sostenerti.
                          </p>
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- SUB COMPONENTS ---

const ChapterButton = ({ active, onClick, icon, title, subtitle, delay }: any) => (
  <motion.button 
    onClick={onClick}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02, x: 4 }}
    whileTap={{ scale: 0.98 }}
    className={`w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4 group relative overflow-hidden ${
      active 
        ? 'bg-white text-black shadow-lg' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {/* Active indicator */}
    {active && (
      <motion.div 
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full"
        layoutId="activeIndicator"
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    )}
    
    <div className={`relative z-10 p-2 rounded-lg transition-colors flex-shrink-0 ${
      active ? 'bg-black/5 text-black' : 'bg-white/5 group-hover:bg-white/10'
    }`}>
      {icon}
    </div>
    
    <div className="relative z-10 min-w-0 flex-1">
      <div className="font-bold text-sm tracking-tight truncate">{title}</div>
      <div className={`text-[11px] ${active ? 'text-slate-600' : 'text-slate-500'} truncate`}>
        {subtitle}
      </div>
    </div>
    
    {/* Hover arrow */}
    <motion.div
      className={`opacity-0 group-hover:opacity-100 transition-opacity ${active ? 'hidden' : ''}`}
      animate={{ x: active ? 0 : [0, 3, 0] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <ChevronRight className="w-4 h-4" />
    </motion.div>
  </motion.button>
);

const NarrativePoint = ({ color, title, children, delay }: any) => (
  <motion.div 
    className="flex gap-4 group"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
  >
    <div className="flex flex-col items-center flex-shrink-0">
      <motion.div 
        className={`w-3 h-3 rounded-full ${color} shadow-[0_0_12px_currentColor]`}
        whileHover={{ scale: 1.3 }}
        animate={{ 
          boxShadow: [
            '0 0 10px currentColor',
            '0 0 20px currentColor',
            '0 0 10px currentColor'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <div className="w-px h-full bg-gradient-to-b from-white/20 to-transparent my-2 group-hover:from-white/40 transition-colors" />
    </div>
    <div className="pb-6 min-w-0 flex-1">
      <h4 className="text-white font-bold text-sm mb-2 group-hover:text-primary-300 transition-colors">
        {title}
      </h4>
      <p className="text-sm text-slate-400 leading-relaxed">
        {children}
      </p>
    </div>
  </motion.div>
);
