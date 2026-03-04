/**
 * 🚀 SILVI.AI - LANDING PAGE PROFESSIONALE
 * 
 * Design moderno, pulito e professionale con:
 * - Layout perfettamente centrato
 * - Animazioni sofisticate
 * - Tipografia curata
 * - Spaziature bilanciate
 * - Effetti moderni (glassmorphism, gradienti animati)
 * - Responsive impeccabile
 */

import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    GraduationCap, Sparkles, ArrowRight, Play, Menu, X, 
    CheckCircle2, Star, AlertCircle, ChevronDown,
    Clock, Timer, BarChart3, Flame,
    FolderKanban,
    FileQuestion, Upload,
    Bot, Monitor, Layout, Send, RotateCcw,
    Github, Twitter, Instagram, Linkedin
} from 'lucide-react';

// ============================================
// CONFIG & CONTEXT
// ============================================
const DEFAULT_APP_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

const LandingContext = createContext<{ useRouterLinks: boolean; appUrl: string }>({
    useRouterLinks: false,
    appUrl: DEFAULT_APP_URL,
});

function useLanding() {
    return useContext(LandingContext);
}

function SmartLink({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
    const { useRouterLinks, appUrl } = useLanding();
    const href = to.startsWith('http') ? to : `${appUrl}${to.startsWith('/') ? '' : '/'}${to}`;
    if (useRouterLinks) {
        return <Link to={to} className={className}>{children}</Link>;
    }
    return <a href={href} className={className}>{children}</a>;
}

// ============================================
// DATA
// ============================================
const STATS = [
    { value: "50K+", label: "Studenti" },
    { value: "2.5M+", label: "Ore Tracciate" },
    { value: "5M+", label: "Flashcards" },
    { value: "4.9", suffix: "/5", label: "Valutazione" }
];

const FEATURES = [
    {
        id: "time-tracking",
        icon: Clock,
        title: "Time Tracking",
        subtitle: "Traccia ogni secondo",
        description: "Timer intelligente che categorizza automaticamente il tempo per corso e progetto.",
        color: "#3b82f6",
        gradient: "from-blue-500 to-cyan-400",
    },
    {
        id: "projects",
        icon: FolderKanban,
        title: "Gestione Progetti",
        subtitle: "Organizza i corsi",
        description: "Board Kanban, task, milestone e scadenze per ogni corso universitario.",
        color: "#10b981",
        gradient: "from-emerald-500 to-teal-400",
    },
    {
        id: "pomodoro",
        icon: Timer,
        title: "Pomodoro",
        subtitle: "Sessioni di focus",
        description: "Timer Pomodoro integrato con statistiche e modalità deep work.",
        color: "#f43f5e",
        gradient: "from-rose-500 to-pink-400",
    },
    {
        id: "magic-generate",
        icon: Sparkles,
        title: "Magic Generate",
        subtitle: "Flashcards da PDF",
        description: "L'IA genera flashcards ottimizzate dai tuoi PDF in 30 secondi.",
        color: "#8b5cf6",
        gradient: "from-violet-500 to-purple-400",
    },
    {
        id: "exam-solver",
        icon: FileQuestion,
        title: "Exam Solver",
        subtitle: "Risolvi esami",
        description: "Carica esami passati e ottieni risposte accurate con spiegazioni.",
        color: "#f59e0b",
        gradient: "from-amber-500 to-orange-400",
    },
    {
        id: "cinema-mode",
        icon: Monitor,
        title: "Cinema Mode",
        subtitle: "Studio immersivo",
        description: "PDF e flashcards side-by-side per uno studio senza distrazioni.",
        color: "#06b6d4",
        gradient: "from-cyan-500 to-blue-400",
    },
    {
        id: "ai-tutor",
        icon: Bot,
        title: "AI Tutor",
        subtitle: "Professore 24/7",
        description: "Chiedi spiegazioni e ricevi risposte personalizzate dai tuoi materiali.",
        color: "#d946ef",
        gradient: "from-fuchsia-500 to-pink-400",
    },
    {
        id: "analytics",
        icon: BarChart3,
        title: "Analytics",
        subtitle: "Statistiche complete",
        description: "Heatmap, trend produttività e insight dettagliati sul tuo studio.",
        color: "#6366f1",
        gradient: "from-indigo-500 to-violet-400",
    }
];

const UNIVERSITIES = [
    "Università di Milano",
    "Sapienza Roma", 
    "Politecnico Torino",
    "Università Bologna",
    "Bocconi",
    "Università Padova"
];

const TESTIMONIALS = [
    {
        name: "Martina Rossi",
        role: "Medicina - 3° anno",
        uni: "UniMi",
        content: "Il time tracking mi ha fatto scoprire che perdevo tempo su argomenti non prioritari. Ho ottimizzato tutto e preso 30L ad Anatomia!",
        avatar: "MR",
        metric: "30L",
        metricLabel: "Anatomia"
    },
    {
        name: "Luca Bianchi",
        role: "Ingegneria - 2° anno",
        uni: "PoliTo",
        content: "Seguo 6 corsi senza perdere una scadenza. La gestione progetti è impeccabile e il Pomodoro mi aiuta a mantenere il focus.",
        avatar: "LB",
        metric: "6",
        metricLabel: "Corsi"
    },
    {
        name: "Giulia Verdi",
        role: "Giurisprudenza - 4° anno",
        uni: "Sapienza",
        content: "Magic Generate è incredibile. Ho preparato 3 esami in un mese. L'Exam Solver mi ha dato sicurezza nelle simulazioni.",
        avatar: "GV",
        metric: "3",
        metricLabel: "Esami"
    }
];

const PRICING = [
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
        features: [
            "Tutto in Free",
            "Progetti illimitati",
            "Flashcards illimitate",
            "Magic Generate",
            "Exam Solver",
            "AI Tutor 24/7",
            "Analytics avanzate"
        ],
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

const FAQS = [
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

// ============================================
// ANIMATIONS
// ============================================
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};



const stagger: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const scaleUp: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
};

// ============================================
// COMPONENTS
// ============================================

// Animated Gradient Background
const AnimatedBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[150px]" />
    </div>
);

// Particle Network
const ParticleNetwork = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let particles: Array<{ x: number; y: number; vx: number; vy: number }> = [];
        let animationId: number;
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        const init = () => {
            particles = [];
            const count = Math.min(40, Math.floor(window.innerWidth / 40));
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3
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
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
                ctx.fill();
                
                particles.slice(i + 1).forEach(p2 => {
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(139, 92, 246, ${0.1 * (1 - dist / 150)})`;
                        ctx.stroke();
                    }
                });
            });
            
            animationId = requestAnimationFrame(draw);
        };
        
        resize();
        init();
        draw();
        
        window.addEventListener('resize', () => { resize(); init(); });
        return () => cancelAnimationFrame(animationId);
    }, []);
    
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-60" />;
};

// Animated Counter
const Counter = ({ value, suffix = "" }: { value: string; suffix?: string }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });
    const [display, setDisplay] = useState("0");
    
    useEffect(() => {
        if (!isInView) return;
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        const suffixText = value.replace(/[0-9.]/g, '');
        const startTime = Date.now();
        const duration = 2000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = num * ease;
            
            setDisplay(value.includes('.') ? current.toFixed(1) + suffixText : Math.floor(current) + suffixText);
            
            if (progress < 1) requestAnimationFrame(animate);
            else setDisplay(value);
        };
        animate();
    }, [isInView, value]);
    
    return <span ref={ref} className="tabular-nums">{display}{suffix}</span>;
};

// Header
const Header = () => {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
    };
    
    const navItems = [
        { label: 'Funzionalità', id: 'features' },
        { label: 'Come Funziona', id: 'how' },
        { label: 'Prezzi', id: 'pricing' },
        { label: 'FAQ', id: 'faq' },
    ];
    
    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                scrolled ? 'bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5' : ''
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    <motion.a 
                        href="#" 
                        className="flex items-center gap-2.5"
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                            Silvi.AI
                        </span>
                    </motion.a>
                    
                    <nav className="hidden lg:flex items-center gap-1">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollTo(item.id)}
                                className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    
                    <div className="flex items-center gap-3">
                        <SmartLink 
                            to="/login" 
                            className="hidden sm:block text-sm text-white/60 hover:text-white transition-colors px-3 py-2"
                        >
                            Accedi
                        </SmartLink>
                        <SmartLink
                            to="/register"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-sm font-medium text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                        >
                            Inizia Gratis
                        </SmartLink>
                        
                        <button 
                            className="lg:hidden p-2 text-white/60 hover:text-white"
                            onClick={() => setMenuOpen(!menuOpen)}
                        >
                            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
                
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden py-4 border-t border-white/10"
                        >
                            <nav className="flex flex-col gap-1">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollTo(item.id)}
                                        className="text-left text-sm text-white/60 hover:text-white py-3 px-4 rounded-lg hover:bg-white/5"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.header>
    );
};



// ============================================
// HERO SECTION
// ============================================
const HeroSection = () => {
    const { scrollY } = useScroll();
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);
    const y = useTransform(scrollY, [0, 400], [0, 100]);
    
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            <ParticleNetwork />
            
            <motion.div style={{ opacity, y }} className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
                <div className="text-center max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8"
                    >
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span className="text-sm text-violet-200">La produttività del futuro</span>
                    </motion.div>
                    
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-[1.1]"
                    >
                        <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                            Studia in modo
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                            Intelligente
                        </span>
                    </motion.h1>
                    
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg lg:text-xl text-white/50 max-w-2xl mx-auto mb-10"
                    >
                        L'app definitiva per studenti universitari. Time tracking, gestione progetti, 
                        AI che genera flashcards e risolve esami. Tutto in un'unica piattaforma.
                    </motion.p>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                    >
                        <SmartLink
                            to="/register"
                            className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                        >
                            Prova Gratis
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </SmartLink>
                        <button
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            className="flex items-center gap-2 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                                <Play className="w-4 h-4 text-violet-400 ml-0.5" />
                            </div>
                            Scopri di più
                        </button>
                    </motion.div>
                    
                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
                    >
                        {STATS.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-3xl lg:text-4xl font-bold text-white">
                                    <Counter value={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="text-sm text-white/40 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
                
                {/* Hero Visual */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="mt-16 relative max-w-5xl mx-auto"
                >
                    <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
                    
                    <div className="relative rounded-2xl bg-[#0f0f22] border border-white/10 overflow-hidden shadow-2xl">
                        {/* Browser Chrome */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a1a] border-b border-white/5">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-rose-500" />
                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            </div>
                            <div className="flex-1 text-center">
                                <span className="text-xs text-white/30">app.silvi.ai</span>
                            </div>
                            <div className="w-16" />
                        </div>
                        
                        {/* Dashboard Preview */}
                        <div className="p-6">
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                {[
                                    { label: 'Ore Oggi', value: '4.5h', color: 'blue' },
                                    { label: 'Task Done', value: '12', color: 'emerald' },
                                    { label: 'Focus', value: '92%', color: 'violet' }
                                ].map((stat) => (
                                    <div key={stat.label} className={`p-4 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20`}>
                                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                                        <div className="text-xs text-white/50">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-sm text-white/60 mb-3">Progresso Corsi</div>
                                    {['Anatomia', 'Fisica', 'Chimica'].map((course, i) => (
                                        <div key={course} className="flex items-center gap-3 mb-2 last:mb-0">
                                            <span className="text-xs text-white/50 w-20">{course}</span>
                                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: `${[75, 60, 45][i]}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Timer className="w-5 h-5 text-violet-400" />
                                        <span className="text-sm text-white">Studio in corso</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white font-mono">42:15</div>
                                    <div className="text-xs text-violet-300">Anatomia - Cap. 3</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Floating Badges */}
                    <motion.div 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-4 -right-4 px-4 py-2 rounded-xl bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30"
                    >
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm text-emerald-300">Task completato!</span>
                        </div>
                    </motion.div>
                    
                    <motion.div 
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute -bottom-4 -left-4 px-4 py-2 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/30"
                    >
                        <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-amber-400" />
                            <span className="text-sm text-amber-300">7 giorni streak</span>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </section>
    );
};

// ============================================
// TRUSTED BY SECTION
// ============================================
const TrustedBySection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <section className="py-16 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="text-center"
                >
                    <motion.p variants={fadeUp} className="text-sm text-white/40 mb-8">
                        Utilizzato da studenti di tutta Italia
                    </motion.p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                        {UNIVERSITIES.map((uni) => (
                            <motion.div
                                key={uni}
                                variants={fadeUp}
                                
                                className="text-white/30 text-sm font-medium hover:text-white/50 transition-colors"
                            >
                                {uni}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

// ============================================
// FEATURES SECTION
// ============================================
const FeaturesSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <section id="features" className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="text-center mb-16"
                >
                    <motion.span variants={fadeUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        Funzionalità
                    </motion.span>
                    <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                        <span className="text-white">Tutto ciò che serve per</span>
                        <br />
                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            superare l'università
                        </span>
                    </motion.h2>
                    <motion.p variants={fadeUp} className="text-lg text-white/50 max-w-2xl mx-auto">
                        Una suite completa di strumenti progettati per le esigenze degli studenti universitari.
                    </motion.p>
                </motion.div>
                
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {FEATURES.map((feature) => (
                        <motion.div
                            key={feature.id}
                            variants={fadeUp}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                        >
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                            
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            
                            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-violet-300 transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-violet-400 mb-3">{feature.subtitle}</p>
                            <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

// ============================================
// HOW IT WORKS SECTION
// ============================================
const HowItWorksSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    const steps = [
        { icon: FolderKanban, title: "Crea i tuoi progetti", desc: "Organizza i corsi universitari come progetti con task e scadenze." },
        { icon: Clock, title: "Traccia il tuo tempo", desc: "Avvia il timer quando studi. Categorizza automaticamente per corso." },
        { icon: Sparkles, title: "Genera con AI", desc: "Carica PDF e l'IA crea flashcards, risponde ad esami e ti aiuta con il tutor." },
        { icon: BarChart3, title: "Monitora progressi", desc: "Analizza le statistiche e ottimizza il tuo studio con dati concreti." }
    ];
    
    return (
        <section id="how" className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="text-center mb-16"
                >
                    <motion.span variants={fadeUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        Come Funziona
                    </motion.span>
                    <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                        <span className="text-white">Dal caos alla laurea</span>
                        <br />
                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            in 4 passaggi
                        </span>
                    </motion.h2>
                </motion.div>
                
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
                >
                    {steps.map((step, stepIndex) => (
                        <motion.div key={stepIndex} variants={fadeUp} className="relative text-center">
                            {stepIndex < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-violet-500/50 to-transparent" />
                            )}
                            
                            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
                                <step.icon className="w-10 h-10 text-white" />
                            </div>
                            
                            <div className="text-5xl font-bold text-white/5 absolute top-0 left-1/2 -translate-x-1/2">0{stepIndex + 1}</div>
                            
                            <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                            <p className="text-sm text-white/50">{step.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};



// ============================================
// INTERACTIVE DEMO SECTION
// ============================================
const DemoSection = () => {
    const [active, setActive] = useState("magic-generate");
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    const feature = FEATURES.find(f => f.id === active) || FEATURES[3];
    
    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="text-center mb-12"
                >
                    <motion.span variants={fadeUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        Prova in Anteprima
                    </motion.span>
                    <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                        <span className="text-white">Scopri le superpoteri</span>
                        <br />
                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            di Silvi.AI
                        </span>
                    </motion.h2>
                </motion.div>
                
                {/* Tabs */}
                <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2 mb-12">
                    {FEATURES.slice(3, 7).map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setActive(f.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                                active === f.id
                                    ? 'bg-violet-500/20 border border-violet-500/50 text-white'
                                    : 'bg-white/5 border border-transparent text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <f.icon className={`w-5 h-5 ${active === f.id ? 'text-violet-400' : ''}`} />
                            <span className="text-sm font-medium hidden sm:block">{f.title}</span>
                        </button>
                    ))}
                </motion.div>
                
                {/* Demo Content */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        key={feature.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-center lg:text-left"
                    >
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4`}>
                            <feature.icon className="w-4 h-4 text-violet-400" />
                            <span className="text-sm text-violet-300">{feature.subtitle}</span>
                        </div>
                        
                        <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">{feature.title}</h3>
                        <p className="text-lg text-white/50 mb-6">{feature.description}</p>
                        
                        <SmartLink
                            to="/register"
                            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${feature.gradient} text-white font-medium hover:shadow-lg transition-all`}
                        >
                            Provalo Gratis
                            <ArrowRight className="w-4 h-4" />
                        </SmartLink>
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
                        
                        <div className="relative rounded-2xl bg-[#0f0f22] border border-white/10 overflow-hidden shadow-2xl">
                            <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a1a] border-b border-white/5">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                </div>
                                <div className="flex-1 text-center">
                                    <span className="text-xs text-white/30">app.silvi.ai/{feature.id}</span>
                                </div>
                            </div>
                            
                            <div className="p-6 h-[350px]">
                                {active === 'magic-generate' && <MagicDemo />}
                                {active === 'exam-solver' && <ExamDemo />}
                                {active === 'cinema-mode' && <CinemaDemo />}
                                {active === 'ai-tutor' && <TutorDemo />}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

// Demo Sub-components
const MagicDemo = () => {
    const [step, setStep] = useState(0);
    
    useEffect(() => {
        const timer = setTimeout(() => step < 2 && setStep(step + 1), 1500);
        return () => clearTimeout(timer);
    }, [step]);
    
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white">Magic Generate</span>
                <button onClick={() => setStep(0)} className="text-xs text-white/40 hover:text-white">
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>
            
            {step === 0 && (
                <div className="flex-1 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-violet-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-white font-medium">Carica un PDF</p>
                        <p className="text-xs text-white/40">Anatomia_Cap3.pdf</p>
                    </div>
                </div>
            )}
            
            {step === 1 && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                        <Sparkles className="w-5 h-5 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm text-white/60 mt-4">Analisi in corso...</p>
                </div>
            )}
            
            {step === 2 && (
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/60">24 flashcards generate</span>
                        <span className="text-xs text-emerald-400">Completato</span>
                    </div>
                    {[
                        { q: "Funzione sistema linfatico?", a: "Difesa organismo..." },
                        { q: "Dove sono i linfonodi?", a: "Collo, ascelle..." }
                    ].map((card, cardIdx) => (
                        <div key={cardIdx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-sm text-white">{card.q}</p>
                            <p className="text-xs text-white/40">{card.a}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ExamDemo = () => (
    <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white">Exam Solver</span>
            <span className="text-xs text-amber-400">8 domande</span>
        </div>
        
        <div className="flex-1 space-y-3 overflow-auto">
            {[
                { q: "Descrivi il percorso della linfa...", done: true },
                { q: "Differenze linfonodi primari/secondari?", done: true },
                { q: "Ruolo cellule dendritiche?", done: false }
            ].map((item, itemIdx) => (
                <div key={itemIdx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-2">
                        {item.done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                        ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-amber-500/30 mt-0.5" />
                        )}
                        <div>
                            <p className="text-sm text-white/80">{item.q}</p>
                            {item.done && (
                                <p className="text-xs text-white/40 mt-1">Risposta generata con spiegazione...</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const CinemaDemo = () => (
    <div className="h-full flex gap-3">
        <div className="flex-1 rounded-lg bg-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">Anatomia.pdf</span>
                <Layout className="w-3 h-3 text-white/40" />
            </div>
            <div className="text-[10px] text-white/60 space-y-1">
                <p><span className="bg-cyan-500/20 px-1 rounded">Sistema linfatico</span> è un sistema di vasi...</p>
                <p>I <span className="bg-white/10 px-1 rounded">linfonodi</span> sono piccole strutture...</p>
            </div>
        </div>
        
        <div className="w-32 rounded-lg bg-violet-500/5 border border-violet-500/20 p-3">
            <div className="text-[10px] text-violet-300 mb-2">Card 12/45</div>
            <div className="p-2 rounded bg-white/5 text-center">
                <p className="text-xs text-white">Funzione linfonodi?</p>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
                {['A', 'H', 'G', 'E'].map((l, buttonIdx) => (
                    <button key={l} className={`py-1 rounded text-[8px] ${buttonIdx === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                        {l}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const TutorDemo = () => (
    <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
                <p className="text-sm font-medium text-white">AI Tutor</p>
                <span className="text-[10px] text-emerald-400">Online</span>
            </div>
        </div>
        
        <div className="flex-1 space-y-3 mb-3">
            <div className="flex justify-end">
                <div className="bg-violet-500 text-white px-3 py-2 rounded-xl text-xs max-w-[80%]">
                    Non capisco la differenza tra linfa e plasma
                </div>
            </div>
            <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs text-white/80 max-w-[80%]">
                    <p>Ottima domanda! 🩸 <strong>Plasma</strong>: liquido del sangue, ricco di proteine.</p>
                    <p className="mt-1">💧 <strong>Linfa</strong>: derivata dal plasma ma più diluita.</p>
                </div>
            </div>
        </div>
        
        <div className="flex gap-2">
            <input type="text" placeholder="Chiedi qualcosa..." className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30" />
            <button className="px-3 py-2 rounded-lg bg-violet-500 text-white">
                <Send className="w-4 h-4" />
            </button>
        </div>
    </div>
);

// ============================================
// TESTIMONIALS SECTION
// ============================================
const TestimonialsSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="text-center mb-16"
                >
                    <motion.span variants={fadeUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        Testimonianze
                    </motion.span>
                    <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                        <span className="text-white">Studenti che ce l'hanno</span>
                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent"> fatta</span>
                    </motion.h2>
                </motion.div>
                
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="grid md:grid-cols-3 gap-8"
                >
                    {TESTIMONIALS.map((t) => (
                        <motion.div
                            key={t.name}
                            variants={fadeUp}
                            className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all"
                        >
                            <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold border border-emerald-500/30">
                                {t.metric} <span className="text-xs opacity-70">{t.metricLabel}</span>
                            </div>
                            
                            <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, starIdx) => (
                                    <Star key={starIdx} className="w-4 h-4 text-amber-400 fill-amber-400" />
                                ))}
                            </div>
                            
                            <p className="text-white/70 mb-6 leading-relaxed">"{t.content}"</p>
                            
                            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                    {t.avatar}
                                </div>
                                <div>
                                    <div className="font-medium text-white">{t.name}</div>
                                    <div className="text-sm text-white/50">{t.role}</div>
                                    <div className="text-xs text-violet-400">{t.uni}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

// ============================================
// PRICING SECTION
// ============================================
const PricingSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <section id="pricing" className="py-24 lg:py-32">
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="text-center mb-16"
                >
                    <motion.span variants={fadeUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        Prezzi
                    </motion.span>
                    <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                        <span className="text-white">Investi nel tuo</span>
                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent"> futuro</span>
                    </motion.h2>
                    <motion.p variants={fadeUp} className="text-lg text-white/50">
                        Meno di un caffè al giorno per cambiare il tuo percorso universitario.
                    </motion.p>
                </motion.div>
                
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="grid md:grid-cols-3 gap-8"
                >
                    {PRICING.map((plan) => (
                        <motion.div
                            key={plan.name}
                            variants={scaleUp}
                            whileHover={{ y: -8 }}
                            className={`relative p-6 rounded-2xl ${plan.popular ? 'ring-2 ring-violet-500' : ''} bg-white/[0.03] border border-white/10`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-sm font-medium text-white">
                                    Più Popolare
                                </div>
                            )}
                            
                            {plan.badge && (
                                <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs">
                                    {plan.badge}
                                </div>
                            )}
                            
                            <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                            <p className="text-sm text-white/50 mb-6">{plan.desc}</p>
                            
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-4xl font-bold text-white">€{plan.price}</span>
                                <span className="text-white/50">{plan.period}</span>
                                {plan.original && (
                                    <span className="text-sm text-white/30 line-through">€{plan.original}</span>
                                )}
                            </div>
                            
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((f, fIdx) => (
                                    <li key={fIdx} className="flex items-start gap-3 text-sm text-white/70">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            
                            <SmartLink
                                to="/register"
                                className={`block w-full text-center py-3 rounded-xl font-medium transition-all ${
                                    plan.popular
                                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                            >
                                {plan.cta}
                            </SmartLink>
                        </motion.div>
                    ))}
                </motion.div>
                
                <motion.p 
                    variants={fadeUp}
                    className="mt-8 text-center text-sm text-white/50 flex items-center justify-center gap-2"
                >
                    <AlertCircle className="w-4 h-4" />
                    50% di sconto con email .edu o documento universitario
                </motion.p>
            </div>
        </section>
    );
};



// ============================================
// FAQ SECTION
// ============================================
const FAQSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const [open, setOpen] = useState<number | null>(0);
    
    return (
        <section id="faq" className="py-24 lg:py-32">
            <div className="max-w-3xl mx-auto px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="text-center mb-16"
                >
                    <motion.span variants={fadeUp} className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                        FAQ
                    </motion.span>
                    <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                        Domande Frequenti
                    </motion.h2>
                </motion.div>
                
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={stagger}
                    className="space-y-4"
                >
                    {FAQS.map((faq, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden"
                        >
                            <button
                                onClick={() => setOpen(open === index ? null : index)}
                                className="w-full flex items-center justify-between p-5 text-left"
                            >
                                <span className="text-white font-medium pr-4">{faq.q}</span>
                                <motion.div
                                    animate={{ rotate: open === index ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown className="w-5 h-5 text-white/50" />
                                </motion.div>
                            </button>
                            
                            <AnimatePresence>
                                {open === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="px-5 pb-5">
                                            <p className="text-white/60 leading-relaxed">{faq.a}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

// ============================================
// CTA SECTION
// ============================================
const CTASection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="relative p-12 lg:p-16 rounded-3xl text-center overflow-hidden"
                >
                    {/* Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-purple-600/20" />
                    <div className="absolute inset-0 backdrop-blur-xl bg-[#0a0a1a]/50 border border-white/10 rounded-3xl" />
                    
                    <div className="relative">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={isInView ? { scale: 1 } : {}}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-8 shadow-lg shadow-violet-500/25"
                        >
                            <GraduationCap className="w-10 h-10 text-white" />
                        </motion.div>
                        
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">
                            <span className="text-white">Pronto a superare</span>
                            <br />
                            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                                i tuoi esami?
                            </span>
                        </h2>
                        
                        <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
                            Unisciti a 50.000+ studenti che usano Silvi.AI ogni giorno. 
                            Inizia gratis, nessuna carta richiesta.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                            <SmartLink
                                to="/register"
                                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                            >
                                Inizia Gratis Oggi
                                <ArrowRight className="w-5 h-5" />
                            </SmartLink>
                            <SmartLink
                                to="/login"
                                className="px-8 py-4 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            >
                                Ho già un account
                            </SmartLink>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Nessuna carta
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Cancella quando vuoi
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                95% promozioni
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

// ============================================
// FOOTER
// ============================================
const Footer = () => (
    <footer className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-5 gap-12 mb-12">
                {/* Brand */}
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">Silvi.AI</span>
                    </div>
                    <p className="text-sm text-white/50 mb-6 max-w-sm">
                        L'app definitiva per studenti universitari. Time tracking, gestione progetti e AI per superare gli esami.
                    </p>
                    <div className="flex gap-3">
                        {[Twitter, Instagram, Linkedin, Github].map((SocialIcon, sIdx) => (
                            <a
                                key={sIdx}
                                href="#"
                                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <SocialIcon className="w-5 h-5" />
                            </a>
                        ))}
                    </div>
                </div>
                
                {/* Links */}
                {[
                    { title: "Prodotto", links: ["Time Tracking", "Gestione Progetti", "Pomodoro", "Magic Generate", "Exam Solver", "Prezzi"] },
                    { title: "Risorse", links: ["Blog", "Tutorial", "Guide", "FAQ", "API"] },
                    { title: "Supporto", links: ["Help Center", "Contatti", "Status", "Feedback"] }
                ].map((section) => (
                    <div key={section.title}>
                        <h4 className="font-semibold text-white mb-4">{section.title}</h4>
                        <ul className="space-y-3">
                            {section.links.map((link) => (
                                <li key={link}>
                                    <a href="#" className="text-sm text-white/50 hover:text-white transition-colors">
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            
            {/* Bottom */}
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-sm text-white/40">
                    © 2025 Silvi.AI. Tutti i diritti riservati.
                </p>
                <div className="flex items-center gap-6">
                    <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">Terms</a>
                    <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">Cookie</a>
                </div>
            </div>
        </div>
    </footer>
);

// ============================================
// MAIN EXPORT
// ============================================
export interface LandingPageProps {
    useRouterLinks?: boolean;
    appUrl?: string;
}

export default function LandingPage({ useRouterLinks = false, appUrl = DEFAULT_APP_URL }: LandingPageProps = {}) {
    return (
        <LandingContext.Provider value={{ useRouterLinks, appUrl }}>
            <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden">
                <AnimatedBackground />
                <Header />
                <main className="relative z-10">
                    <HeroSection />
                    <TrustedBySection />
                    <FeaturesSection />
                    <HowItWorksSection />
                    <DemoSection />
                    <TestimonialsSection />
                    <PricingSection />
                    <FAQSection />
                    <CTASection />
                </main>
                <Footer />
            </div>
        </LandingContext.Provider>
    );
}
