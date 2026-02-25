/**
 * 🎓 LANDING PAGE - Silvi.AI
 * 
 * Sito marketing interattivo per studenti universitari.
 * Anteprime cliccabili delle funzionalità principali.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, Variants, AnimatePresence } from 'framer-motion';
import { 
    GraduationCap, Brain, BookOpen, Sparkles, 
    Play, Star, CheckCircle2, FileText,
    ArrowRight, Target, Award,
    Menu, X, AlertCircle, Globe,
    FileQuestion, Zap, School, Monitor, Upload,
    ChevronRight, Check, BrainCircuit,
    Layout, Maximize2, Send, Bot,
    Calendar, ArrowLeft, RotateCcw, Trophy,
    Flame
} from 'lucide-react';

// ============================================
// CONFIG
// ============================================
const APP_URL = "http://localhost:5173";

// ============================================
// DATA
// ============================================
const HERO_STATS = [
    { value: "50K+", label: "Studenti Universitari" },
    { value: "2M+", label: "Flashcards Create" },
    { value: "95%", label: "Tasso di Promozione" },
    { value: "4.9", suffix: "/5", label: "Valutazione" }
];

const HOW_IT_WORKS = [
    {
        step: "01",
        icon: FileText,
        title: "Carica i tuoi materiali",
        description: "Carica appunti, slide, PDF o libri di testo. Supportiamo ogni formato: PDF, Word, immagini, e persino foto di appunti scritti a mano."
    },
    {
        step: "02",
        icon: Sparkles,
        title: "L'IA crea le flashcards",
        description: "In pochi secondi, la nostra AI analizza il contenuto e genera flashcards ottimizzate con domande, risposte e spiegazioni dettagliate."
    },
    {
        step: "03",
        icon: Brain,
        title: "Studia con ripetizione spaziata",
        description: "Rivedi le flashcards secondo l'algoritmo ottimale. L'IA adatta i tempi in base alle tue prestazioni per una memorizzazione duratura."
    },
    {
        step: "04",
        icon: Award,
        title: "Passa l'esame",
        description: "Monitora i tuoi progressi, identifica le lacune e affronta l'esame con fiducia. I nostri utenti hanno un tasso di promozione del 95%!"
    }
];

// ============================================
// INTERACTIVE DEMO DATA
// ============================================
const DEMO_FEATURES = [
    {
        id: "magic-generate",
        icon: Sparkles,
        title: "Magic Generate",
        subtitle: "Flashcards da PDF in 30 secondi",
        description: "Carica un PDF e l'IA estrae automaticamente i concetti chiave, creando flashcards ottimizzate per lo studio.",
        color: "violet"
    },
    {
        id: "exam-solver",
        icon: FileQuestion,
        title: "Exam Solver",
        subtitle: "Rispondi a qualsiasi domanda d'esame",
        description: "Carica il PDF dell'esame e il materiale di studio. L'IA genera risposte accurate per ogni domanda.",
        color: "emerald"
    },
    {
        id: "cinema-mode",
        icon: Monitor,
        title: "Cinema Mode",
        subtitle: "Studia PDF e flashcard insieme",
        description: "Visualizza il PDF e le flashcards side-by-side. Evidenzia il testo e crea card istantaneamente.",
        color: "blue"
    },
    {
        id: "ai-tutor",
        icon: Bot,
        title: "AI Tutor",
        subtitle: "Il tuo professore privato 24/7",
        description: "Chiedi spiegazioni, esempi o approfondimenti. L'IA risponde in base ai tuoi materiali di studio.",
        color: "amber"
    },
    {
        id: "study-modes",
        icon: Target,
        title: "4 Modalità Studio",
        subtitle: "Adatta il metodo alle tue esigenze",
        description: "Quiz adattivo, Ripetizione Spaziata, Time Attack e Simulazione Esame. Scegli la modalità giusta per te.",
        color: "rose"
    }
];

const STUDENT_TESTIMONIALS = [
    {
        name: "Martina Rossi",
        role: "Studentessa Medicina - 3° anno",
        content: "Ho passato Anatomia con 30L! Le flashcards generate dall'IA dai miei appunti mi hanno fatto risparmiare settimane di lavoro.",
        avatar: "MR",
        improvement: "+12 punti"
    },
    {
        name: "Luca Bianchi",
        role: "Studente Ingegneria - 2° anno",
        content: "Finalmente un'app che capisce le esigenze degli studenti. La gestione corsi mi aiuta a non perdere scadenze.",
        avatar: "LB",
        improvement: "+25% produttività"
    },
    {
        name: "Giulia Verdi",
        role: "Studentessa Giurisprudenza - 4° anno",
        content: "Ho preparato 3 esami in un mese usando Silvi.AI. L'AI che crea domande d'esame è incredibile!",
        avatar: "GV",
        improvement: "3 esami superati"
    }
];

const PRICING_STUDENT = [
    {
        name: "Free",
        description: "Per iniziare a studiare",
        price: "0",
        features: [
            "Fino a 100 flashcards",
            "3 corsi",
            "Timer Pomodoro",
            "Statistiche base",
            "App mobile"
        ],
        gradient: "from-white/10 to-white/5",
        popular: false
    },
    {
        name: "Student Pro",
        description: "Per studenti seri",
        price: "4.99",
        originalPrice: "9.99",
        badge: "-50% Studenti",
        features: [
            "Flashcards illimitate",
            "Corsi illimitati",
            "Generazione AI da PDF",
            "Spaced Repetition avanzato",
            "Quiz e simulazioni esame",
            "Tutor AI 24/7",
            "Export PDF/Anki",
            "Modalità Cinema"
        ],
        gradient: "from-violet-500 to-purple-600",
        popular: true
    },
    {
        name: "Study Group",
        description: "Per gruppi di studio",
        price: "9.99",
        features: [
            "Tutto in Pro",
            "Fino a 5 utenti",
            "Deck condivisi",
            "Classifiche gruppo",
            "Admin dashboard",
            "Supporto prioritario"
        ],
        gradient: "from-emerald-500 to-teal-600",
        popular: false
    }
];

// ============================================
// ANIMATIONS
// ============================================
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
};

// ============================================
// COMPONENTS
// ============================================

const ParticleBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number }> = [];
        let animationId: number;
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        const createParticles = () => {
            particles = [];
            const count = Math.min(50, Math.floor(window.innerWidth / 30));
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 1
                });
            }
        };
        
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
                ctx.fill();
                
                particles.slice(i + 1).forEach(p2 => {
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 * (1 - dist / 100)})`;
                        ctx.stroke();
                    }
                });
            });
            animationId = requestAnimationFrame(draw);
        };
        
        resize();
        createParticles();
        draw();
        
        const handleResize = () => { resize(); createParticles(); };
        window.addEventListener('resize', handleResize);
        return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', handleResize); };
    }, []);
    
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />;
};

const AnimatedCounter = ({ value, suffix = "" }: { value: string; suffix?: string }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });
    const [displayValue, setDisplayValue] = useState("0");
    
    useEffect(() => {
        if (!isInView) return;
        const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
        const suffixText = value.replace(/[0-9.]/g, '');
        const duration = 2000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = numericValue * easeOut;
            
            if (value.includes('.')) {
                setDisplayValue(current.toFixed(1) + suffixText);
            } else {
                setDisplayValue(Math.floor(current) + suffixText);
            }
            
            if (progress < 1) requestAnimationFrame(animate);
            else setDisplayValue(value);
        };
        animate();
    }, [isInView, value]);
    
    return <span ref={ref} className="tabular-nums">{displayValue}{suffix}</span>;
};

const GradientOrb = ({ className, colors = "from-violet-500/30 to-purple-500/30" }: { className?: string; colors?: string }) => (
    <div className={`absolute rounded-full blur-3xl bg-gradient-to-br ${colors} ${className}`} />
);

const Header = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setMobileMenuOpen(false);
    };
    
    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`landing-header fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled ? 'bg-dark-500/90 backdrop-blur-xl border-b border-white/5' : ''
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.02 }}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Silvi.AI
                        </span>
                    </motion.div>
                    
                    <nav className="hidden md:flex items-center gap-8">
                        {[
                            { label: 'Come Funziona', id: 'come-funziona' },
                            { label: 'Funzionalità', id: 'funzionalita' },
                            { label: 'Prezzi', id: 'prezzi' },
                        ].map((item) => (
                            <motion.button
                                key={item.id}
                                onClick={() => scrollToSection(item.id)}
                                className="landing-nav-link text-sm text-white/60 hover:text-white transition-colors"
                                whileHover={{ y: -2 }}
                            >
                                {item.label}
                            </motion.button>
                        ))}
                    </nav>
                    
                    <div className="flex items-center gap-3">
                        <a href={`${APP_URL}/login`} className="landing-nav-link hidden sm:block text-sm text-white/60 hover:text-white transition-colors">
                            Accedi
                        </a>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <a
                                href={`${APP_URL}/register`}
                                className="landing-primary-btn px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-sm font-medium text-white hover:shadow-glow transition-shadow"
                            >
                                Inizia Gratis
                            </a>
                        </motion.div>
                        
                        <button 
                            className="landing-icon-btn md:hidden p-2 text-white/60 hover:text-white"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
                
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="landing-mobile-panel md:hidden py-4 border-t border-white/10"
                    >
                        <nav className="flex flex-col gap-4">
                            {[
                                { label: 'Come Funziona', id: 'come-funziona' },
                                { label: 'Funzionalità', id: 'funzionalita' },
                                { label: 'Prezzi', id: 'prezzi' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className="landing-nav-link text-left text-sm text-white/60 hover:text-white transition-colors py-2"
                                >
                                    {item.label}
                                </button>
                            ))}
                            <a href={`${APP_URL}/login`} className="landing-nav-link text-sm text-white/60 hover:text-white transition-colors py-2">
                                Accedi
                            </a>
                        </nav>
                    </motion.div>
                )}
            </div>
        </motion.header>
    );
};

const HeroSection = () => {
    const { scrollY } = useScroll();
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);
    
    return (
        <section className="landing-section landing-section--hero relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
            <ParticleBackground />
            <GradientOrb className="top-20 left-10 w-96 h-96" />
            <GradientOrb className="bottom-20 right-10 w-80 h-80" colors="from-emerald-500/20 to-teal-500/20" />
            <GradientOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]" colors="from-violet-500/10 to-purple-500/10" />
            
            <div 
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />
            
            <motion.div style={{ opacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8"
                    >
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span className="text-sm text-violet-200">Per Studenti Universitari</span>
                    </motion.div>
                    
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                    >
                        <span className="bg-gradient-to-r from-white via-violet-200 to-purple-200 bg-clip-text text-transparent">
                            Studia in Modo
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
                            Intelligente
                        </span>
                    </motion.h1>
                    
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10"
                    >
                        L'IA che trasforma i tuoi appunti in flashcards, risolve i tuoi esami 
                        e ottimizza il tuo studio con la ripetizione spaziata.
                    </motion.p>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                    >
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <a
                                href={`${APP_URL}/register`}
                                className="landing-primary-btn group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:shadow-glow transition-all"
                            >
                                Prova Gratis - Nessuna Carta
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </motion.div>
                        
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => document.getElementById('funzionalita')?.scrollIntoView({ behavior: 'smooth' })}
                            className="landing-secondary-btn flex items-center gap-2 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                                <Play className="w-4 h-4 text-violet-400 ml-0.5" />
                            </div>
                            Scopri le Funzionalità
                        </motion.button>
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
                    >
                        {HERO_STATS.map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                className="text-center"
                            >
                                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="text-sm text-white/50 mt-1">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
};

const HowItWorksSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <section id="come-funziona" className="landing-section landing-section--how relative py-32 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={staggerContainer}
                    className="text-center mb-20"
                >
                    <motion.span variants={fadeInUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        Come Funziona
                    </motion.span>
                    <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Dal PDF alla laurea
                        </span>
                    </motion.h2>
                    <motion.p variants={fadeInUp} className="text-lg text-white/60 max-w-2xl mx-auto">
                        Quattro semplici passaggi per trasformare il tuo modo di studiare.
                    </motion.p>
                </motion.div>
                
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={staggerContainer}
                    className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
                >
                    {HOW_IT_WORKS.map((step, index) => (
                        <motion.div
                            key={step.step}
                            variants={fadeInUp}
                            className="relative"
                        >
                            {index < HOW_IT_WORKS.length - 1 && (
                                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-violet-500/50 to-transparent" />
                            )}
                            
                            <div className="landing-surface-card relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-violet-500/30 transition-all">
                                <div className="text-5xl font-bold text-white/10 mb-4">{step.step}</div>
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
                                    <step.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                                <p className="text-sm text-white/50">{step.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

// ============================================
// INTERACTIVE DEMO COMPONENT
// ============================================

const InteractiveDemo = () => {
    const [activeTab, setActiveTab] = useState("magic-generate");
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    const activeFeature = DEMO_FEATURES.find(f => f.id === activeTab) || DEMO_FEATURES[0];
    
    return (
        <section id="funzionalita" className="landing-section landing-section--features relative py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-violet-950/10 via-transparent to-transparent" />
            
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={staggerContainer}
                    className="text-center mb-12"
                >
                    <motion.span variants={fadeInUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        Provalo in Anteprima
                    </motion.span>
                    <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Scopri le superpoteri
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                            di Silvi.AI
                        </span>
                    </motion.h2>
                    <motion.p variants={fadeInUp} className="text-lg text-white/60 max-w-2xl mx-auto">
                        Clicca sulle funzionalità per vedere in azione come l'AI trasforma il tuo studio.
                    </motion.p>
                </motion.div>
                
                {/* Feature Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-3 mb-12"
                >
                    {DEMO_FEATURES.map((feature) => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveTab(feature.id)}
                            className={`landing-feature-tab flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                                activeTab === feature.id
                                    ? 'landing-feature-tab--active bg-violet-500/20 border border-violet-500/50 text-white'
                                    : 'bg-white/5 border border-transparent text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <feature.icon className={`w-5 h-5 ${activeTab === feature.id ? 'text-violet-400' : ''}`} />
                            <span className="text-sm font-medium hidden sm:inline">{feature.title}</span>
                        </button>
                    ))}
                </motion.div>
                
                {/* Demo Content */}
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    {/* Left: Description */}
                    <motion.div
                        key={activeFeature.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${activeFeature.color}-500/10 border border-${activeFeature.color}-500/20`}>
                            <activeFeature.icon className={`w-4 h-4 text-${activeFeature.color}-400`} />
                            <span className={`text-sm text-${activeFeature.color}-300`}>{activeFeature.subtitle}</span>
                        </div>
                        
                        <h3 className="text-3xl font-bold text-white">{activeFeature.title}</h3>
                        <p className="text-lg text-white/60 leading-relaxed">{activeFeature.description}</p>
                        
                        <div className="flex flex-wrap gap-3">
                            <a
                                href={`${APP_URL}/register`}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:shadow-glow transition-all"
                            >
                                Provalo Gratis
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    </motion.div>
                    
                    {/* Right: Interactive Preview */}
                    <motion.div
                        key={`preview-${activeFeature.id}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="relative"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-2xl opacity-50" />
                        
                        <div className="landing-preview-shell relative rounded-2xl bg-dark-400 border border-white/10 overflow-hidden shadow-2xl">
                            {/* Browser Chrome */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-dark-500 border-b border-white/5">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                </div>
                                <div className="flex-1 text-center">
                                    <span className="text-xs text-white/40">app.silvi.ai</span>
                                </div>
                                <div className="w-16" />
                            </div>
                            
                            {/* Demo Content based on active feature */}
                            <div className="p-4 h-[400px] overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {activeTab === "magic-generate" && <MagicGenerateDemo key="magic" />}
                                    {activeTab === "exam-solver" && <ExamSolverDemo key="exam" />}
                                    {activeTab === "cinema-mode" && <CinemaModeDemo key="cinema" />}
                                    {activeTab === "ai-tutor" && <AITutorDemo key="tutor" />}
                                    {activeTab === "study-modes" && <StudyModesDemo key="study" />}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

// ============================================
// DEMO COMPONENTS
// ============================================

const MagicGenerateDemo = () => {
    const [step, setStep] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generated, setGenerated] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            if (step === 0) {
                setStep(1);
                setIsGenerating(true);
            } else if (step === 1 && isGenerating) {
                setTimeout(() => {
                    setIsGenerating(false);
                    setGenerated(true);
                }, 2500);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [step, isGenerating]);
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <span className="text-sm font-medium text-white">Magic Generate</span>
                </div>
                <button 
                    onClick={() => { setStep(0); setIsGenerating(false); setGenerated(false); }}
                    className="text-xs text-white/40 hover:text-white flex items-center gap-1"
                >
                    <RotateCcw className="w-3 h-3" />
                    Replay
                </button>
            </div>
            
            {!generated ? (
                <>
                    {/* Upload Area */}
                    <motion.div
                        animate={step >= 1 ? { scale: 0.95, opacity: 0.5 } : {}}
                        className="flex-1 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-4 p-6 cursor-pointer hover:border-violet-500/30 transition-colors"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-violet-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-medium mb-1">Carica un PDF</p>
                            <p className="text-xs text-white/40">Anatomia_Umana_Cap3.pdf</p>
                        </div>
                    </motion.div>
                    
                    {/* Generating State */}
                    {isGenerating && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                                <span className="text-sm text-violet-200">Analisi del documento...</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 2, ease: "easeInOut" }}
                                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                                />
                            </div>
                            <div className="mt-2 space-y-1">
                                {['Estrazione concetti chiave', 'Generazione domande', 'Ottimizzazione contenuto'].map((item, i) => (
                                    <motion.div
                                        key={item}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.5 }}
                                        className="flex items-center gap-2 text-xs text-white/50"
                                    >
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        {item}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </>
            ) : (
                /* Results */
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-white/60">24 flashcards generate</span>
                        <button className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium">
                            Inizia Studio
                        </button>
                    </div>
                    
                    <div className="space-y-3 overflow-y-auto max-h-[280px]">
                        {[
                            { q: "Qual è la funzione principale del sistema linfatico?", a: "Difesa dell'organismo, trasporto dei lipidi..." },
                            { q: "Dove si trovano i linfonodi più importanti?", a: "Collo, ascelle, inguine, mesenterio..." },
                            { q: "Cos'è la linfa?", a: "Fluido bianco-avorio derivato dal plasma sanguigno..." }
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-3 rounded-lg bg-white/5 border border-white/10"
                            >
                                <p className="text-sm text-white font-medium mb-1">{card.q}</p>
                                <p className="text-xs text-white/50">{card.a}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

const ExamSolverDemo = () => {
    const [step, setStep] = useState(0);
    const [processing, setProcessing] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            if (step === 0) setStep(1);
            else if (step === 1) {
                setProcessing(true);
                setTimeout(() => setStep(2), 2000);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [step]);
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
        >
            {/* Progress Steps */}
            <div className="flex items-center gap-2 mb-4 text-xs">
                {['Upload', 'Configura', 'Risultati'].map((s, i) => (
                    <div key={s} className={`flex items-center gap-1 ${i <= step ? 'text-violet-400' : 'text-white/30'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            i <= step ? 'bg-violet-500/20' : 'bg-white/5'
                        }`}>
                            {i < step ? <Check className="w-3 h-3" /> : i + 1}
                        </div>
                        <span>{s}</span>
                        {i < 2 && <ChevronRight className="w-3 h-3 mx-1" />}
                    </div>
                ))}
            </div>
            
            {step === 0 && (
                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex-1 border-2 border-dashed border-emerald-500/30 rounded-xl flex flex-col items-center justify-center gap-2 bg-emerald-500/5">
                        <FileQuestion className="w-8 h-8 text-emerald-400" />
                        <span className="text-sm text-white/60">Esame_PDF caricato</span>
                    </div>
                    <div className="flex-1 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2">
                        <BookOpen className="w-8 h-8 text-white/30" />
                        <span className="text-sm text-white/40">Carica materiale di studio</span>
                    </div>
                </div>
            )}
            
            {step === 1 && (
                <div className="flex-1 flex flex-col">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm text-emerald-200">Materiale caricato</span>
                        </div>
                        <p className="text-xs text-white/50">Appunti_Anatomia.pdf (45 pagine)</p>
                    </div>
                    
                    {processing && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                                <BrainCircuit className="w-5 h-5 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-sm text-white/60">L'IA sta analizzando le domande...</p>
                        </div>
                    )}
                </div>
            )}
            
            {step === 2 && (
                <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-emerald-400">8 domande trovate</span>
                        <span className="text-xs text-white/40">Generazione completata</span>
                    </div>
                    
                    <div className="space-y-2 overflow-y-auto max-h-[300px]">
                        {[
                            { q: "Descrivi il percorso della linfa dal tessuto all'ansa subclavia", status: "done" },
                            { q: "Quali sono le differenze tra linfonodi primari e secondari?", status: "done" },
                            { q: "Spiega il ruolo delle cellule dendritiche nel sistema linfatico", status: "done" },
                            { q: "Cosa sono i chiliferi e dove si trovano?", status: "generating" }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-3 rounded-lg bg-white/5 border border-white/10"
                            >
                                <div className="flex items-start gap-2">
                                    {item.status === "done" ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <p className="text-xs text-white/80 mb-1">{item.q}</p>
                                        {item.status === "done" && (
                                            <p className="text-[10px] text-white/40 line-clamp-2">
                                                La linfa dal tessuto interstiziale viene raccolta dai capillari linfatici...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
            
            <button 
                onClick={() => { setStep(0); setProcessing(false); }}
                className="mt-3 text-xs text-white/40 hover:text-white flex items-center gap-1 justify-center"
            >
                <RotateCcw className="w-3 h-3" />
                Riprova Demo
            </button>
        </motion.div>
    );
};

const CinemaModeDemo = () => {
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedText, setSelectedText] = useState<string | null>(null);
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex gap-3"
        >
            {/* PDF Panel */}
            <div className="flex-1 rounded-lg bg-dark-500/50 p-3 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/40">Anatomia.pdf - Pagina 42</span>
                    <div className="flex gap-1">
                        <button className="p-1 rounded hover:bg-white/5"><Layout className="w-3 h-3 text-white/40" /></button>
                        <button className="p-1 rounded hover:bg-white/5"><Maximize2 className="w-3 h-3 text-white/40" /></button>
                    </div>
                </div>
                <div className="space-y-2 text-[10px] text-white/60 leading-relaxed">
                    <p><span 
                        className="bg-blue-500/20 cursor-pointer hover:bg-blue-500/30 transition-colors"
                        onClick={() => setSelectedText("Sistema Linfatico")}
                    >Il sistema linfatico</span> è un sistema di vasi e organi che serve a drenare il liquido...</p>
                    <p>I <span className="bg-white/10">linfonodi</span> sono piccole strutture ovali disposte lungo il percorso dei vasi linfatici...</p>
                    <p>La <span 
                        className="bg-blue-500/20 cursor-pointer hover:bg-blue-500/30 transition-colors"
                        onClick={() => setSelectedText("Linfa")}
                    >linfa</span> è un fluido bianco-avorio simile al plasma ma più diluito...</p>
                </div>
                
                {selectedText && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-2 rounded bg-blue-500/10 border border-blue-500/20"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-blue-300">"{selectedText}" selezionato</span>
                            <button 
                                onClick={() => setSelectedText(null)}
                                className="px-2 py-0.5 rounded bg-blue-500 text-white text-[10px]"
                            >
                                Crea Card
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
            
            {/* Flashcard Panel */}
            <div className="w-40 rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-violet-300">Flashcard 12/45</span>
                </div>
                
                <div 
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="flex-1 rounded-lg bg-dark-500 p-3 cursor-pointer hover:bg-dark-600 transition-colors flex flex-col justify-center"
                >
                    <p className="text-xs text-white text-center mb-2">
                        Qual è la funzione principale dei linfonodi?
                    </p>
                    
                    {showAnswer ? (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] text-white/60 text-center"
                        >
                            Filtrare la linfa e attivare la risposta immunitaria
                        </motion.p>
                    ) : (
                        <p className="text-[10px] text-violet-400 text-center">Clicca per la risposta</p>
                    )}
                </div>
                
                <div className="mt-2 grid grid-cols-4 gap-1">
                    {['Again', 'Hard', 'Good', 'Easy'].map((label, i) => (
                        <button 
                            key={label}
                            className={`py-1 rounded text-[8px] ${
                                i === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'
                            }`}
                        >
                            {label[0]}
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const AITutorDemo = () => {
    const [messages, setMessages] = useState([
        { role: 'user', content: 'Non capisco la differenza tra linfa e plasma' },
        { role: 'ai', content: 'Ottima domanda! Ecco le differenze principali:\n\n🩸 **Plasma**: liquido del sangue, ricco di proteine (albumina, globuline), contiene fibrinogeno per la coagulazione.\n\n💧 **Linfa**: derivata dal plasma MA più diluita, contiene meno proteine, NO fibrinogeno, contiene linfociti.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    const handleSend = () => {
        if (!input.trim()) return;
        setMessages([...messages, { role: 'user', content: input }]);
        setInput('');
        setIsTyping(true);
        
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: 'Pensa al plasma come al "brodo concentrato" e alla linfa come alla "zuppa diluita". Entrambi contengono nutrienti, ma in concentrazioni diverse! Vuoi un esempio pratico?' 
            }]);
        }, 1500);
    };
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className="text-sm font-medium text-white">Silvi AI Tutor</p>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-emerald-400">Online</span>
                    </div>
                </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[85%] p-2.5 rounded-xl text-xs ${
                            msg.role === 'user' 
                                ? 'bg-violet-500 text-white' 
                                : 'bg-white/5 text-white/80 border border-white/10'
                        }`}>
                            {msg.content.split('\n').map((line, j) => (
                                <p key={j} className={line.startsWith('🩸') || line.startsWith('💧') ? 'mt-1' : ''}>
                                    {line}
                                </p>
                            ))}
                        </div>
                    </motion.div>
                ))}
                
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>
            
            {/* Input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Chiedi qualcosa..."
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
                />
                <button 
                    onClick={handleSend}
                    className="px-3 py-2 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};

const StudyModesDemo = () => {
    const [activeMode, setActiveMode] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    
    const modes = [
        { id: 'quiz', name: 'Quiz', icon: Target, color: 'violet', desc: 'Domande a risposta multipla' },
        { id: 'srs', name: 'Spaced Repetition', icon: Calendar, color: 'emerald', desc: 'Ripetizione ottimale' },
        { id: 'time', name: 'Time Attack', icon: Flame, color: 'amber', desc: '10 minuti di fuoco' },
        { id: 'exam', name: 'Simulazione', icon: School, color: 'rose', desc: 'Esame completo' }
    ];
    
    useEffect(() => {
        if (activeMode) {
            const timer = setTimeout(() => setShowResult(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [activeMode]);
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
        >
            {!activeMode ? (
                <>
                    <p className="text-sm text-white/60 mb-4">Scegli la modalità di studio:</p>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                        {modes.map((mode) => (
                            <motion.button
                                key={mode.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setActiveMode(mode.id)}
                                className={`p-4 rounded-xl bg-${mode.color}-500/10 border border-${mode.color}-500/20 hover:border-${mode.color}-500/40 transition-all flex flex-col items-center justify-center gap-2`}
                            >
                                <mode.icon className={`w-8 h-8 text-${mode.color}-400`} />
                                <span className="text-sm font-medium text-white">{mode.name}</span>
                                <span className="text-[10px] text-white/50 text-center">{mode.desc}</span>
                            </motion.button>
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col">
                    <button 
                        onClick={() => { setActiveMode(null); setShowResult(false); }}
                        className="flex items-center gap-1 text-xs text-white/40 hover:text-white mb-3"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Torna indietro
                    </button>
                    
                    {!showResult ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            {activeMode === 'quiz' && (
                                <>
                                    <div className="w-full max-w-xs mb-6">
                                        <div className="flex justify-between text-xs text-white/40 mb-2">
                                            <span>Domanda 3/20</span>
                                            <span>Smart Mix attivo</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full w-[15%] bg-violet-500" />
                                        </div>
                                    </div>
                                    
                                    <div className="w-full max-w-xs p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                                        <p className="text-sm text-white text-center mb-4">
                                            Quali cellule sono responsabili della produzione di anticorpi?
                                        </p>
                                        
                                        <div className="space-y-2">
                                            {['Linfociti T helper', 'Linfociti B', 'Macrofagi', 'Neutrofili'].map((opt, i) => (
                                                <button 
                                                    key={opt}
                                                    className={`w-full p-2.5 rounded-lg text-left text-xs transition-colors ${
                                                        i === 1 ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-white/5 text-white/70 hover:bg-white/10'
                                                    }`}
                                                >
                                                    {String.fromCharCode(65 + i)}. {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs text-amber-400">
                                        <Zap className="w-4 h-4" />
                                        <span>Smart Mix: 50% difficili, 30% nuove, 20% ripasso</span>
                                    </div>
                                </>
                            )}
                            
                            {activeMode === 'srs' && (
                                <>
                                    <div className="text-center mb-6">
                                        <p className="text-xs text-emerald-400 mb-1">Prossima revisione tra 2.4 giorni</p>
                                        <p className="text-2xl font-bold text-white">Scheda #42</p>
                                    </div>
                                    
                                    <div className="w-64 h-40 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center p-4 mb-6">
                                        <p className="text-sm text-white text-center">
                                            Descrivi il percorso della linfa attraverso i vasi linfatici
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-4 gap-2 w-64">
                                        {[
                                            { label: 'Again', time: '< 1m', color: 'rose' },
                                            { label: 'Hard', time: '2.4d', color: 'amber' },
                                            { label: 'Good', time: '5.1d', color: 'emerald' },
                                            { label: 'Easy', time: '12d', color: 'blue' }
                                        ].map((btn) => (
                                            <div key={btn.label} className="text-center">
                                                <button className={`w-full py-2 rounded-lg bg-${btn.color}-500/20 text-${btn.color}-400 text-xs font-medium hover:bg-${btn.color}-500/30 transition-colors`}>
                                                    {btn.label[0]}
                                                </button>
                                                <p className="text-[9px] text-white/30 mt-1">{btn.time}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            
                            {activeMode === 'time' && (
                                <>
                                    <div className="relative mb-6">
                                        <svg className="w-32 h-32 -rotate-90">
                                            <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                                            <circle cx="64" cy="64" r="58" stroke="#f59e0b" strokeWidth="8" fill="none" 
                                                strokeDasharray="364" strokeDashoffset="91" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold text-white">7:30</span>
                                            <span className="text-xs text-white/50">rimanenti</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-white">12</p>
                                            <p className="text-[10px] text-white/40">card viste</p>
                                        </div>
                                        <div className="w-px h-8 bg-white/10" />
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-emerald-400">85%</p>
                                            <p className="text-[10px] text-white/40">accuratezza</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                                        <Flame className="w-4 h-4 text-amber-400" />
                                        <span className="text-xs text-amber-300">🔥 Streak: 5 sessioni</span>
                                    </div>
                                </>
                            )}
                            
                            {activeMode === 'exam' && (
                                <>
                                    <div className="w-full max-w-xs mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <School className="w-4 h-4 text-rose-400" />
                                            <span className="text-sm text-white">Simulazione Esame</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full w-[35%] bg-rose-500" />
                                        </div>
                                        <p className="text-xs text-white/40 mt-1">7/20 domande completate</p>
                                    </div>
                                    
                                    <div className="w-full max-w-xs p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs text-white/40">Domanda 8</span>
                                            <span className="text-xs text-rose-400">12:45 rimanenti</span>
                                        </div>
                                        <p className="text-sm text-white mb-4">
                                            Spiega il meccanismo di formazione del tessuto linfoide secondario...
                                        </p>
                                        <textarea 
                                            className="w-full h-24 p-3 rounded-lg bg-dark-500 border border-white/10 text-xs text-white resize-none focus:outline-none focus:border-rose-500/50"
                                            placeholder="Scrivi la tua risposta..."
                                            defaultValue="Il tessuto linfoide secondario si forma in risposta a stimoli antigenici..."
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 flex flex-col items-center justify-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                                <Trophy className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">Sessione Completata!</h4>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-white">24</p>
                                    <p className="text-xs text-white/40">card studiate</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-emerald-400">92%</p>
                                    <p className="text-xs text-white/40">precisione</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-violet-400">+450</p>
                                    <p className="text-xs text-white/40">XP guadagnati</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

// ============================================
// OTHER SECTIONS
// ============================================

const TestimonialsSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <section className="landing-section landing-section--testimonials relative py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
            
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={staggerContainer}
                    className="text-center mb-16"
                >
                    <motion.span variants={fadeInUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        Storie di Successo
                    </motion.span>
                    <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Studenti che ce l'hanno fatta
                        </span>
                    </motion.h2>
                </motion.div>
                
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={staggerContainer}
                    className="grid md:grid-cols-3 gap-6"
                >
                    {STUDENT_TESTIMONIALS.map((testimonial) => (
                        <motion.div
                            key={testimonial.name}
                            variants={fadeInUp}
                            whileHover={{ y: -5 }}
                            className="landing-surface-card relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10"
                        >
                            <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
                                {testimonial.improvement}
                            </div>
                            
                            <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                                ))}
                            </div>
                            
                            <p className="text-white/70 mb-6 leading-relaxed">
                                "{testimonial.content}"
                            </p>
                            
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                    {testimonial.avatar}
                                </div>
                                <div>
                                    <div className="font-semibold text-white">{testimonial.name}</div>
                                    <div className="text-sm text-white/50">{testimonial.role}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

const PricingSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <section id="prezzi" className="landing-section landing-section--pricing relative py-32 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={staggerContainer}
                    className="text-center mb-16"
                >
                    <motion.span variants={fadeInUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        Prezzi
                    </motion.span>
                    <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Investi nel tuo futuro
                        </span>
                    </motion.h2>
                    <motion.p variants={fadeInUp} className="text-white/60">
                        Prezzi speciali per studenti. Un caffè al giorno per cambiare il tuo percorso universitario.
                    </motion.p>
                </motion.div>
                
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={staggerContainer}
                    className="grid md:grid-cols-3 gap-6 lg:gap-8"
                >
                    {PRICING_STUDENT.map((plan) => (
                        <motion.div
                            key={plan.name}
                            variants={fadeInUp}
                            whileHover={{ y: -10 }}
                            className={`landing-pricing-card relative p-8 rounded-2xl ${plan.popular ? 'ring-2 ring-violet-500' : ''}`}
                        >
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${plan.gradient} opacity-10`} />
                            <div className="landing-pricing-card-surface absolute inset-0 rounded-2xl bg-dark-400/50 backdrop-blur-sm border border-white/10" />
                            
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <div className="px-4 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-sm font-medium text-white">
                                        Più Popolare
                                    </div>
                                </div>
                            )}
                            
                            {plan.badge && (
                                <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                    {plan.badge}
                                </div>
                            )}
                            
                            <div className="relative">
                                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                                <p className="text-sm text-white/50 mb-6">{plan.description}</p>
                                
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-4xl font-bold text-white">€{plan.price}</span>
                                    {plan.price !== "0" && (
                                        <>
                                            <span className="text-white/50">/mese</span>
                                            {plan.originalPrice && (
                                                <span className="text-sm text-white/30 line-through">€{plan.originalPrice}</span>
                                            )}
                                        </>
                                    )}
                                </div>
                                
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-sm text-white/70">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                
                                <a
                                    href={`${APP_URL}/register`}
                                    className={`landing-pricing-cta w-full block text-center py-3 rounded-xl font-semibold transition-all ${
                                        plan.popular
                                            ? 'landing-primary-btn bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-glow'
                                            : 'landing-secondary-btn bg-white/10 text-white hover:bg-white/20'
                                    }`}
                                >
                                    {plan.price === "0" ? "Inizia Gratis" : "Scegli Pro"}
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center"
                >
                    <p className="text-sm text-white/50 flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        50% di sconto Student Pro con email .edu o documento universitario
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

const CTASection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <section className="landing-section landing-section--cta relative py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-violet-950/20" />
            <GradientOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]" colors="from-violet-500/20 to-purple-500/10" />
            
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="landing-cta-panel relative p-12 md:p-16 rounded-3xl overflow-hidden text-center"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-purple-600/20" />
                    <div className="absolute inset-0 backdrop-blur-xl bg-dark-400/50 border border-white/10" />
                    
                    <div className="relative">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={isInView ? { scale: 1 } : {}}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-8"
                        >
                            <GraduationCap className="w-10 h-10 text-white" />
                        </motion.div>
                        
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                Pronto a superare
                            </span>
                            <br />
                            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                                i tuoi esami?
                            </span>
                        </h2>
                        
                        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
                            Unisciti a 50.000+ studenti che usano Silvi.AI ogni giorno. 
                            Magic Generate, Exam Solver, Cinema Mode e tanto altro ti aspettano.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <a
                                    href={`${APP_URL}/register`}
                                    className="landing-primary-btn inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:shadow-glow transition-all"
                                >
                                    Inizia Gratis Oggi
                                    <ArrowRight className="w-5 h-5" />
                                </a>
                            </motion.div>
                            
                            <motion.a
                                href={`${APP_URL}/login`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="landing-secondary-btn inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                            >
                                Ho già un account
                            </motion.a>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-white/40 text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Nessuna carta richiesta
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Cancella quando vuoi
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                95% tasso di promozione
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

const Footer = () => (
    <footer className="landing-footer relative py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
                <div className="md:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">Silvi.AI</span>
                    </div>
                    <p className="text-sm text-white/50 mb-6">
                        L'AI che rivoluziona il modo di studiare all'università.
                    </p>
                    <div className="flex gap-4">
                        {['twitter', 'instagram', 'linkedin'].map((social) => (
                            <a
                                key={social}
                                href="#"
                                className="landing-icon-btn w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Globe className="w-5 h-5" />
                            </a>
                        ))}
                    </div>
                </div>
                
                {[
                    { title: "Prodotto", links: ["Magic Generate", "Exam Solver", "Cinema Mode", "Prezzi"] },
                    { title: "Risorse", links: ["Guide", "Blog", "Tutorial", "FAQ"] },
                    { title: "Supporto", links: ["Help Center", "Contatti", "Status", "Feedback"] }
                ].map((section) => (
                    <div key={section.title}>
                        <h4 className="font-semibold text-white mb-4">{section.title}</h4>
                        <ul className="space-y-3">
                            {section.links.map((link) => (
                                <li key={link}>
                                    <a href="#" className="landing-nav-link text-sm text-white/50 hover:text-white transition-colors">
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-sm text-white/40">
                    © 2025 Silvi.AI. Tutti i diritti riservati.
                </p>
                <div className="flex items-center gap-6">
                    <a href="#" className="landing-nav-link text-sm text-white/40 hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="landing-nav-link text-sm text-white/40 hover:text-white transition-colors">Terms</a>
                    <a href="#" className="landing-nav-link text-sm text-white/40 hover:text-white transition-colors">Cookie</a>
                </div>
            </div>
        </div>
    </footer>
);

// ============================================
// MAIN
// ============================================
export default function LandingPage() {
    return (
        <div className="landing-root min-h-screen bg-dark-500 text-white overflow-x-hidden">
            <Header />
            <main>
                <HeroSection />
                <HowItWorksSection />
                <InteractiveDemo />
                <TestimonialsSection />
                <PricingSection />
                <CTASection />
            </main>
            <Footer />
        </div>
    );
}
