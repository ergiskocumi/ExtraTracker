/**
 * 🎯 TESTIMONIALS SECTION
 * 
 * Modern testimonials section with:
 * - Glassmorphism card design
 * - Animated text reveal with gradient
 * - Staggered card animations
 * - Hover lift and glow effects
 * - Floating metric badges
 */

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

// ============================================
// DATA
// ============================================
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

// ============================================
// ANIMATIONS
// ============================================
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2
        }
    }
};

const headerVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1]
        }
    }
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1]
        }
    }
};

const metricFloatVariants: Variants = {
    initial: { y: 0 },
    animate: {
        y: [-3, 3, -3],
        transition: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

// ============================================
// COMPONENTS
// ============================================

/**
 * Star Rating Component
 * Displays 5 amber stars at the top of each card
 */
const StarRating = () => (
    <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
            <Star
                key={i}
                className="w-4 h-4 fill-amber-400 text-amber-400"
            />
        ))}
    </div>
);

/**
 * Avatar Component
 * Displays initials with gradient background
 */
const Avatar = ({ initials, index }: { initials: string; index: number }) => {
    const gradients = [
        "from-violet-500 to-purple-600",
        "from-emerald-500 to-teal-600",
        "from-amber-500 to-orange-600"
    ];

    return (
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center shadow-lg`}>
            <span className="text-sm font-bold text-white">{initials}</span>
        </div>
    );
};

/**
 * Metric Badge Component
 * Floating badge showing achievement metric
 */
const MetricBadge = ({ metric, label }: { metric: string; label: string }) => (
    <motion.div
        variants={metricFloatVariants}
        initial="initial"
        animate="animate"
        className="absolute -top-3 -right-3 px-3 py-1.5 rounded-lg bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
    >
        <div className="text-center">
            <span className="text-lg font-bold text-emerald-400">{metric}</span>
            <span className="block text-[10px] text-emerald-300/80 uppercase tracking-wider">{label}</span>
        </div>
    </motion.div>
);

/**
 * Testimonial Card Component
 * Individual testimonial with glassmorphism effect
 */
const TestimonialCard = ({
    testimonial,
    index
}: {
    testimonial: typeof TESTIMONIALS[0];
    index: number;
}) => (
    <motion.div
        variants={cardVariants}
        whileHover={{
            y: -8,
            scale: 1.02,
            transition: { duration: 0.3, ease: "easeOut" }
        }}
        className="group relative"
    >
        {/* Glow effect on hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/0 via-violet-500/0 to-purple-500/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 group-hover:from-violet-500/20 group-hover:via-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-500" />

        {/* Card */}
        <div className="relative h-full p-6 md:p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 shadow-card hover:shadow-glow-sm">
            {/* Metric Badge */}
            <MetricBadge metric={testimonial.metric} label={testimonial.metricLabel} />

            {/* Star Rating */}
            <div className="mb-5">
                <StarRating />
            </div>

            {/* Quote Icon */}
            <Quote className="w-8 h-8 text-violet-500/20 mb-4" />

            {/* Content */}
            <p className="text-white/80 leading-relaxed mb-8 text-sm">
                "{testimonial.content}"
            </p>

            {/* Author Info */}
            <div className="flex items-center gap-4 pt-5 border-t border-white/5">
                <Avatar initials={testimonial.avatar} index={index} />
                <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm truncate">
                        {testimonial.name}
                    </h4>
                    <p className="text-white/40 text-xs truncate">
                        {testimonial.role}
                    </p>
                    <p className="text-violet-400/80 text-xs">
                        {testimonial.uni}
                    </p>
                </div>
            </div>
        </div>
    </motion.div>
);

/**
 * Section Header Component
 * Animated title with gradient text
 */
const SectionHeader = () => (
    <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="text-center mb-16 md:mb-20"
    >
        <motion.span
            variants={headerVariants}
            className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block"
        >
            Testimonianze
        </motion.span>

        <motion.h2
            variants={headerVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
        >
            <span className="text-white">Cosa dicono gli studenti che l'hanno </span>
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                provata
            </span>
        </motion.h2>

        <motion.p
            variants={headerVariants}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
        >
            Storie reali di studenti che hanno trasformato il loro modo di studiare con Silvi.AI
        </motion.p>
    </motion.div>
);

/**
 * Main Testimonials Section Component
 */
export const TestimonialsSection = () => {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

    return (
        <section
            ref={sectionRef}
            className="py-24 lg:py-32 bg-[#0a0a1a] relative overflow-hidden"
        >
            {/* Background decorations */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <SectionHeader />

                {/* Testimonials Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
                >
                    {TESTIMONIALS.map((testimonial, index) => (
                        <TestimonialCard
                            key={testimonial.name}
                            testimonial={testimonial}
                            index={index}
                        />
                    ))}
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="text-center mt-16 md:mt-20"
                >
                    <p className="text-white/40 text-sm">
                        Unisciti a <span className="text-white font-semibold">50.000+ studenti</span> che usano Silvi.AI ogni giorno
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
