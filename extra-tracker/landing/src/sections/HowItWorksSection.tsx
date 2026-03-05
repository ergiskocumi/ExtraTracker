import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FolderKanban, Clock, Sparkles, BarChart3 } from "lucide-react";

const steps = [
  { icon: "FolderKanban", title: "Crea i tuoi progetti", desc: "Organizza i corsi universitari come progetti con task e scadenze." },
  { icon: "Clock", title: "Traccia il tuo tempo", desc: "Avvia il timer quando studi. Categorizza automaticamente per corso." },
  { icon: "Sparkles", title: "Genera con AI", desc: "Carica PDF e l'IA crea flashcards, risponde ad esami e ti aiuta con il tutor." },
  { icon: "BarChart3", title: "Monitora progressi", desc: "Analizza le statistiche e ottimizza il tuo studio con dati concreti." },
];

const iconMap: Record<string, React.ElementType> = {
  FolderKanban,
  Clock,
  Sparkles,
  BarChart3,
};

export function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="how-it-works"
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ backgroundColor: "#0a0a1a" }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 md:mb-24"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20 mb-6"
          >
            Come funziona
          </motion.span>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            <span className="block">Inizia in</span>
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-violet-300 bg-clip-text text-transparent">
              4 semplici passi
            </span>
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            ExtraTracker ti guida attraverso un flusso di lavoro ottimizzato per massimizzare la tua produttività universitaria.
          </motion.p>
        </motion.div>

        {/* Steps Grid */}
        <div className="relative">
          {/* Connecting Line - Desktop */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5">
            <svg
              className="w-full h-12"
              preserveAspectRatio="none"
              viewBox="0 0 1200 48"
              fill="none"
            >
              <motion.path
                d="M 100 24 Q 300 24 400 24 T 700 24 T 1000 24 T 1100 24"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeDasharray="8 8"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#7c3aed" stopOpacity="1" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {steps.map((step, index) => {
              const Icon = iconMap[step.icon];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.6,
                    delay: 0.3 + index * 0.15,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative group"
                >
                  {/* Step Card */}
                  <div className="relative h-full p-6 md:p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.04] hover:border-violet-500/20 hover:-translate-y-2">
                    {/* Large faded number */}
                    <span className="absolute top-4 right-4 text-6xl md:text-7xl font-bold text-white/[0.03] select-none pointer-events-none">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {/* Icon Container */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={isInView ? { scale: 1, opacity: 1 } : {}}
                      transition={{
                        duration: 0.5,
                        delay: 0.5 + index * 0.15,
                        ease: "backOut",
                      }}
                      className="relative mb-6"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center">
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3,
                            delay: index * 0.5,
                          }}
                        >
                          <Icon className="w-6 h-6 text-violet-400" />
                        </motion.div>
                      </div>

                      {/* Step number badge */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {index + 1}
                        </span>
                      </div>
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-violet-300 transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {step.desc}
                    </p>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/0 to-purple-500/0 group-hover:from-violet-500/5 group-hover:to-purple-500/5 transition-all duration-500 pointer-events-none" />
                  </div>

                  {/* Mobile connecting line */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden absolute left-1/2 -bottom-4 w-0.5 h-8 bg-gradient-to-b from-violet-500/50 to-transparent" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-16 md:mt-24 text-center"
        >
          <p className="text-slate-400 mb-6">
            Pronto a trasformare il tuo studio?
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow duration-300"
          >
            Inizia gratuitamente
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
