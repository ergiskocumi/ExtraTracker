import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Brand/Logo';
import { X, Sparkles, Layers, Fingerprint, ChevronRight } from 'lucide-react';

type StoryChapter = 'intro' | 'logo' | 'grid';

export const BrandStory: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chapter, setChapter] = useState<StoryChapter>('intro');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) setIsVisible(true);
    else setTimeout(() => setIsVisible(false), 500);
  }, [isOpen]);

  // Reset al capitolo iniziale quando si chiude
  useEffect(() => {
    if (!isOpen) setTimeout(() => setChapter('intro'), 500);
  }, [isOpen]);

  if (!isVisible && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-40 group flex items-center gap-2 sm:gap-3 pl-3 sm:pl-5 pr-2 sm:pr-3 py-2 sm:py-3 rounded-full bg-black/40 border border-white/10 backdrop-blur-2xl hover:bg-black/60 hover:scale-105 active:scale-95 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
      >
        <div className="flex flex-col items-start">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-semibold">The Story</span>
          <span className="text-xs sm:text-sm font-medium text-white tracking-wide">Behind Silvi AI</span>
        </div>
        <div className="bg-white/10 p-1.5 sm:p-2 rounded-full text-white group-hover:bg-white/20 transition-colors ml-1 sm:ml-2">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </button>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-8 transition-all duration-700 ${isOpen ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none pointer-events-none'}`}>
      
      {/* 1. CINEMATIC BACKDROP */}
      <div 
        className="absolute inset-0 bg-slate-950/80 transition-opacity duration-700"
        onClick={() => setIsOpen(false)}
      />

      {/* 2. THE STAGE (Container) - Full screen su mobile */}
      <div 
        className={`relative w-full h-full sm:h-[85vh] sm:max-w-6xl md:h-[650px] bg-[#080808] border-0 sm:border border-white/10 shadow-2xl rounded-none sm:rounded-[32px] overflow-hidden no-horizontal-scroll flex flex-col md:flex-row transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${isOpen ? 'scale-100 translate-y-0' : 'scale-90 translate-y-12'}`}
      >
        
        {/* Close Button - Più grande su mobile */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 sm:p-2 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-400 hover:text-white transition-all touch-manipulation"
        >
          <X className="w-6 h-6 sm:w-5 sm:h-5" />
        </button>

        {/* --- LEFT: NAVIGATION & CHAPTERS --- */}
        <div className="w-full md:w-80 flex-shrink-0 border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02] p-4 sm:p-6 md:p-8 flex flex-col no-horizontal-scroll">
          <div className="mb-6 sm:mb-8 md:mb-10">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
              <Logo size="sm" variant="icon-only" />
              <span>Philosophy</span>
            </h1>
          </div>

          <nav className="flex-1 space-y-1.5 sm:space-y-2 overflow-y-auto no-horizontal-scroll">
            <ChapterButton 
              active={chapter === 'intro'} 
              onClick={() => setChapter('intro')}
              icon={<Fingerprint className="w-4 h-4" />}
              title="La Visione"
              subtitle="Perché siamo qui"
            />
            <ChapterButton 
              active={chapter === 'logo'} 
              onClick={() => setChapter('logo')}
              icon={<Sparkles className="w-4 h-4" />}
              title="Il Simbolo"
              subtitle="Istinto e Intelligenza"
            />
            <ChapterButton 
              active={chapter === 'grid'} 
              onClick={() => setChapter('grid')}
              icon={<Layers className="w-4 h-4" />}
              title="L'Ecosistema"
              subtitle="Il tessuto digitale"
            />
          </nav>
        </div>

        {/* --- RIGHT: THE NARRATIVE CONTENT --- */}
        <div className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#050505] to-black">
          
          {/* CHAPTER 1: INTRO (MANIFESTO) */}
          <div className={`absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-16 flex flex-col justify-center overflow-y-auto transition-all duration-700 ${chapter === 'intro' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
            <div className="max-w-2xl mx-auto">
              <span className="inline-block px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] sm:text-xs font-medium mb-4 sm:mb-6">
                Capitolo I: La Genesi
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 sm:mb-8 leading-tight">
                L'ambizione umana è <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">caos</span>.<br/>
                L'intelligenza è <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">ordine</span>.
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-400 leading-relaxed mb-6 sm:mb-8 border-l-2 border-white/10 pl-4 sm:pl-6">
                Abbiamo creato Silvi AI per risolvere l'eterno conflitto dello studente e del creatore: avere troppe idee e troppo poco metodo. 
                <br/><br/>
                Non è solo un software. È un'architettura mentale. È il luogo dove la tua creatività biologica incontra la precisione sintetica.
              </p>
              <button onClick={() => setChapter('logo')} className="group flex items-center gap-2 text-white font-medium hover:gap-4 active:gap-3 transition-all touch-manipulation text-sm sm:text-base">
                Scopri il Simbolo <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </button>
            </div>
          </div>

          {/* CHAPTER 2: LOGO (THE SPARK) */}
          <div className={`absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col overflow-y-auto transition-all duration-700 ${chapter === 'logo' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
             <div className="flex-1 flex flex-col md:flex-row gap-6 sm:gap-8 md:gap-12 items-center justify-center min-h-0">
                
                {/* Visual Stage */}
                <div className="w-full md:w-1/2 aspect-square flex items-center justify-center relative flex-shrink-0">
                   <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-violet-600/10 rounded-full blur-[60px] sm:blur-[80px] animate-pulse-slow"></div>
                   <div className="transform scale-[2] sm:scale-[2.5] md:scale-[3]">
                      <Logo variant="icon-only" size="lg" />
                   </div>
                </div>

                {/* Narrative */}
                <div className="w-full md:w-1/2 space-y-6 sm:space-y-8">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">La Scintilla Sinaptica</h3>
                    <p className="text-sm sm:text-base text-slate-400">Due forze che convergono senza mai scontrarsi.</p>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <NarrativePoint color="bg-amber-500" title="L'Intento Umano (Ambra)">
                      Rappresenta te. È la fiamma dell'aspirazione, la curiosità grezza, l'istinto che dice "voglio imparare". Scende dall'alto perché è l'ispirazione.
                    </NarrativePoint>
                    
                    <NarrativePoint color="bg-violet-600" title="La Fondazione AI (Viola)">
                      Rappresenta Silvi. È la rete neurale, la struttura logica che sale dal basso per accogliere la tua idea e impedirle di cadere nel vuoto.
                    </NarrativePoint>

                    <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                        "E nel mezzo? Quella 'S' vuota al centro? Quello è lo spazio sacro del <strong>Flow</strong>. È dove tu e l'AI lavorate all'unisono."
                      </p>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* CHAPTER 3: GRID (THE ENVIRONMENT) */}
          <div className={`absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col overflow-y-auto transition-all duration-700 ${chapter === 'grid' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
             
             {/* Background Simulation inside the card */}
             <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:60px_60px]"></div>
                {/* Moving Beams simulated */}
                <div className="absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
                <div className="absolute top-0 left-[30%] h-full w-[1px] bg-gradient-to-b from-transparent via-violet-600 to-transparent opacity-50"></div>
             </div>

             <div className="relative z-10 max-w-2xl mx-auto sm:mx-0 mt-auto md:mt-0 md:ml-12 h-full flex flex-col justify-center">
                <span className="text-violet-400 font-mono text-[10px] sm:text-xs uppercase tracking-widest mb-3 sm:mb-4">L'Infrastruttura</span>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">Il Silenzio dietro il Rumore</h3>
                
                <p className="text-sm sm:text-base md:text-lg text-slate-400 leading-relaxed mb-6 sm:mb-8">
                  Hai notato la griglia sottile sullo sfondo? Non è decorazione. È una dichiarazione d'intenti.
                  <br/><br/>
                  Viviamo in un mondo digitale rumoroso, fatto di notifiche e caos (i famosi "blob" colorati). Silvi AI elimina tutto questo. 
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                    <div className="text-amber-500 font-bold mb-1 text-sm sm:text-base">Velocità della Luce</div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      I fasci di luce Ambra sono i tuoi pensieri che viaggiano senza ostacoli lungo autostrade ottimizzate.
                    </p>
                  </div>
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                    <div className="text-violet-500 font-bold mb-1 text-sm sm:text-base">Supporto Invisibile</div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      La griglia è sempre lì. Non la noti mentre lavori, ma sai che se cadi, c'è una struttura pronta a sostenerti.
                    </p>
                  </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const ChapterButton = ({ active, onClick, icon, title, subtitle }: any) => (
  <button 
    onClick={onClick}
    className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl text-left transition-all duration-300 flex items-center gap-3 sm:gap-4 group relative overflow-hidden touch-manipulation active:scale-[0.98] ${
      active 
        ? 'bg-white text-black shadow-lg scale-[1.02]' 
        : 'text-slate-400 hover:text-white hover:bg-white/5 active:bg-white/10'
    }`}
  >
    <div className={`relative z-10 p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${active ? 'bg-black/5 text-black' : 'bg-white/5 group-hover:bg-white/10'}`}>
      {icon}
    </div>
    <div className="relative z-10 min-w-0 flex-1">
      <div className="font-bold text-xs sm:text-sm tracking-tight truncate">{title}</div>
      <div className={`text-[10px] sm:text-[11px] ${active ? 'text-slate-600' : 'text-slate-500'} truncate`}>{subtitle}</div>
    </div>
  </button>
);

const NarrativePoint = ({ color, title, children }: any) => (
  <div className="flex gap-3 sm:gap-4 group">
    <div className="flex flex-col items-center flex-shrink-0">
      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${color} shadow-[0_0_10px_currentColor] group-hover:scale-125 transition-transform duration-500`}></div>
      <div className="w-[1px] h-full bg-white/10 my-2 group-hover:bg-white/20 transition-colors"></div>
    </div>
    <div className="pb-4 sm:pb-6 min-w-0 flex-1">
      <h4 className="text-white font-bold text-xs sm:text-sm mb-1.5 sm:mb-2 group-hover:text-amber-100 transition-colors">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
        {children}
      </p>
    </div>
  </div>
);