import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// Elementi decorativi tematici per il time tracking
const COLORS = {
  primary: '#8b5cf6',    // Violet-500
  secondary: '#f59e0b',  // Amber-500
  accent: '#10b981',     // Emerald-500
  muted: 'rgba(139, 92, 246, 0.15)',
};

// Componente per le linee temporali fluttuanti
const TimelineLine: React.FC<{
  top: string;
  delay: number;
  duration: number;
  width: string;
}> = ({ top, delay, duration, width }) => (
  <motion.div
    className="absolute h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent"
    style={{ 
      top, 
      width,
      left: '50%',
      x: '-50%',
    }}
    initial={{ opacity: 0, scaleX: 0 }}
    animate={{ 
      opacity: [0, 1, 1, 0],
      scaleX: [0, 1, 1, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      repeatDelay: Math.random() * 3,
    }}
  />
);

// Componente per i punti dati (come grafici)
const DataPoint: React.FC<{
  x: string;
  y: string;
  size: number;
  delay: number;
}> = ({ x, y, size, delay }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      left: x,
      top: y,
      width: size,
      height: size,
      background: `radial-gradient(circle, ${COLORS.primary}40 0%, transparent 70%)`,
    }}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ 
      scale: [0, 1.2, 1],
      opacity: [0, 0.6, 0.3],
    }}
    transition={{
      duration: 2,
      delay,
      repeat: Infinity,
      repeatDelay: Math.random() * 4 + 2,
    }}
  />
);

// Componente per gli archi circolari (come orologi/tracker)
const CircularArc: React.FC<{
  x: string;
  y: string;
  size: number;
  rotation: number;
  delay: number;
}> = ({ x, y, size, rotation, delay }) => (
  <motion.div
    className="absolute rounded-full border border-primary-500/20"
    style={{
      left: x,
      top: y,
      width: size,
      height: size,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    }}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ 
      opacity: [0.1, 0.3, 0.1],
      scale: [0.8, 1, 0.8],
      rotate: [rotation, rotation + 360],
    }}
    transition={{
      duration: 20,
      delay,
      repeat: Infinity,
      ease: "linear",
    }}
  />
);

// Componente per le barre di progresso fluttuanti
const ProgressBar: React.FC<{
  x: string;
  y: string;
  width: number;
  delay: number;
}> = ({ x, y, width, delay }) => (
  <motion.div
    className="time-tracking-progress-track absolute h-1 rounded-full overflow-hidden bg-theme-surface"
    style={{
      left: x,
      top: y,
      width,
    }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.5 }}
    transition={{ delay, duration: 1 }}
  >
    <motion.div
      className="h-full rounded-full bg-gradient-to-r from-primary-500/60 to-accent-500/60"
      initial={{ width: '0%' }}
      animate={{ width: ['0%', '70%', '100%', '0%'] }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 2,
      }}
    />
  </motion.div>
);

// Icona stilizzata astratta
const FloatingIcon: React.FC<{
  x: string;
  y: string;
  delay: number;
  children: React.ReactNode;
}> = ({ x, y, delay, children }) => (
  <motion.div
    className="time-tracking-icon absolute text-theme-muted"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ 
      opacity: [0.1, 0.2, 0.1],
      y: [0, -15, 0],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    {children}
  </motion.div>
);

export const TimeTrackingBackground: React.FC = () => {
  // Genera elementi casuali solo al mount
  const elements = useMemo(() => {
    const timelines = Array.from({ length: 6 }, (_, i) => ({
      top: `${15 + i * 15}%`,
      delay: i * 0.5,
      duration: 4 + Math.random() * 2,
      width: `${30 + Math.random() * 40}%`,
    }));

    const dataPoints = Array.from({ length: 12 }, (_, i) => ({
      x: `${10 + Math.random() * 80}%`,
      y: `${10 + Math.random() * 80}%`,
      size: 20 + Math.random() * 40,
      delay: Math.random() * 3,
    }));

    const arcs = Array.from({ length: 4 }, (_, i) => ({
      x: `${20 + i * 20}%`,
      y: `${20 + (i % 2) * 60}%`,
      size: 100 + Math.random() * 150,
      rotation: Math.random() * 360,
      delay: i * 0.8,
    }));

    const progressBars = Array.from({ length: 5 }, (_, i) => ({
      x: `${15 + i * 18}%`,
      y: `${25 + Math.random() * 50}%`,
      width: 60 + Math.random() * 80,
      delay: Math.random() * 2,
    }));

    return { timelines, dataPoints, arcs, progressBars };
  }, []);

  return (
    <div className="time-tracking-bg fixed inset-0 -z-10 overflow-hidden bg-theme-base">
      {/* Gradient base */}
      <div className="time-tracking-bg-gradient absolute inset-0" style={{ background: 'var(--gradient-bg)' }} />
      
      {/* Gradient accent */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, ${COLORS.primary}30, transparent),
            radial-gradient(ellipse 60% 40% at 100% 100%, ${COLORS.secondary}20, transparent),
            radial-gradient(ellipse 50% 50% at 0% 100%, ${COLORS.accent}15, transparent)
          `,
        }}
      />

      {/* Grid pattern sottile */}
      <div 
        className="time-tracking-grid absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border-default) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border-default) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Timeline lines */}
      {elements.timelines.map((t, i) => (
        <TimelineLine key={`timeline-${i}`} {...t} />
      ))}

      {/* Data points */}
      {elements.dataPoints.map((p, i) => (
        <DataPoint key={`point-${i}`} {...p} />
      ))}

      {/* Circular arcs */}
      {elements.arcs.map((a, i) => (
        <CircularArc key={`arc-${i}`} {...a} />
      ))}

      {/* Progress bars */}
      {elements.progressBars.map((p, i) => (
        <ProgressBar key={`progress-${i}`} {...p} />
      ))}

      {/* Floating Icons */}
      <FloatingIcon x="8%" y="20%" delay={0}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </FloatingIcon>

      <FloatingIcon x="85%" y="25%" delay={1}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </FloatingIcon>

      <FloatingIcon x="12%" y="75%" delay={2}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M3 3v18h18" />
          <path d="M18 9l-5 5-4-4-3 3" />
        </svg>
      </FloatingIcon>

      <FloatingIcon x="88%" y="70%" delay={1.5}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </FloatingIcon>

      {/* Glow orbs */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${COLORS.primary}40, transparent 70%)`,
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${COLORS.secondary}40, transparent 70%)`,
        }}
      />
    </div>
  );
};
