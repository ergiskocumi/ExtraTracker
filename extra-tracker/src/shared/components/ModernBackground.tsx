import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// Colori della palette moderna
const COLORS = {
  violet: '139, 92, 246',    // violet-500
  blue: '59, 130, 246',      // blue-500
  pink: '236, 72, 153',      // pink-500
  emerald: '16, 185, 129',   // emerald-500
  amber: '245, 158, 11',     // amber-500
};

// Orba fluttuante con blur
const FloatingOrb: React.FC<{
  color: string;
  size: number;
  x: string;
  y: string;
  duration: number;
  delay: number;
}> = ({ color, size, x, y, duration, delay }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: x,
      top: y,
      width: size,
      height: size,
      background: `radial-gradient(circle, rgba(${color}, 0.4) 0%, rgba(${color}, 0.1) 40%, transparent 70%)`,
      filter: 'blur(40px)',
    }}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.2, 1],
      x: [0, 30, 0, -20, 0],
      y: [0, -20, 10, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Linea luminosa che pulsa
const GlowingLine: React.FC<{
  top: string;
  left: string;
  width: string;
  rotation: number;
  delay: number;
}> = ({ top, left, width, rotation, delay }) => (
  <motion.div
    className="absolute h-px pointer-events-none"
    style={{
      top,
      left,
      width,
      transform: `rotate(${rotation}deg)`,
      background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.2), transparent)',
    }}
    initial={{ opacity: 0, scaleX: 0 }}
    animate={{
      opacity: [0, 0.5, 0.3, 0.5, 0],
      scaleX: [0, 1, 1, 1, 0],
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Griglia sottile animata
const AnimatedGrid: React.FC = () => (
  <div 
    className="absolute inset-0 pointer-events-none opacity-[0.015]"
    style={{
      backgroundImage: `
        linear-gradient(to right, rgba(139, 92, 246, 0.5) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(139, 92, 246, 0.5) 1px, transparent 1px)
      `,
      backgroundSize: '80px 80px',
    }}
  />
);

interface ModernBackgroundProps {
  intensity?: 'low' | 'medium' | 'high';
  animate?: boolean;
}

export const ModernBackground: React.FC<ModernBackgroundProps> = ({ 
  intensity = 'medium',
  animate = true 
}) => {
  const orbs = useMemo(() => {
    const configs = {
      low: [
        { color: COLORS.violet, size: 400, x: '10%', y: '10%', duration: 20, delay: 0 },
        { color: COLORS.blue, size: 350, x: '70%', y: '60%', duration: 25, delay: 2 },
      ],
      medium: [
        { color: COLORS.violet, size: 400, x: '10%', y: '10%', duration: 20, delay: 0 },
        { color: COLORS.blue, size: 350, x: '70%', y: '60%', duration: 25, delay: 2 },
        { color: COLORS.pink, size: 300, x: '80%', y: '20%', duration: 22, delay: 4 },
        { color: COLORS.emerald, size: 250, x: '20%', y: '70%', duration: 18, delay: 1 },
      ],
      high: [
        { color: COLORS.violet, size: 450, x: '5%', y: '5%', duration: 20, delay: 0 },
        { color: COLORS.blue, size: 400, x: '60%', y: '50%', duration: 25, delay: 2 },
        { color: COLORS.pink, size: 350, x: '80%', y: '15%', duration: 22, delay: 4 },
        { color: COLORS.emerald, size: 300, x: '15%', y: '65%', duration: 18, delay: 1 },
        { color: COLORS.amber, size: 280, x: '40%', y: '80%', duration: 24, delay: 3 },
        { color: COLORS.violet, size: 250, x: '75%', y: '75%', duration: 21, delay: 5 },
      ],
    };
    return configs[intensity];
  }, [intensity]);

  const lines = useMemo(() => [
    { top: '20%', left: '10%', width: '30%', rotation: 15, delay: 0 },
    { top: '40%', left: '60%', width: '25%', rotation: -10, delay: 3 },
    { top: '70%', left: '20%', width: '40%', rotation: 5, delay: 6 },
    { top: '30%', left: '40%', width: '20%', rotation: -20, delay: 2 },
  ], []);

  if (!animate) {
    return (
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-400 via-dark-500 to-dark-600" />
        <AnimatedGrid />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-400 via-dark-500 to-dark-600" />
      
      {/* Animated orbs */}
      {orbs.map((orb, i) => (
        <FloatingOrb key={`orb-${i}`} {...orb} />
      ))}
      
      {/* Glowing lines */}
      {lines.map((line, i) => (
        <GlowingLine key={`line-${i}`} {...line} />
      ))}
      
      {/* Subtle grid */}
      <AnimatedGrid />
      
      {/* Top vignette for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(0,0,0,0.3) 0%, transparent 60%)',
        }}
      />
    </div>
  );
};

export default ModernBackground;
