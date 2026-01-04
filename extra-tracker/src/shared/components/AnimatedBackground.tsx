/**
 * 🎨 ANIMATED BACKGROUND - Background premium animato
 * 
 * Background sofisticato con:
 * - Particelle fluttuanti animate
 * - Onde gradient animate
 * - Mesh gradient dinamico
 * - Effetti di profondità e movimento
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

export const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnimatedBackground.tsx:28',message:'AnimatedBackground mounted',data:{isVisible:!document.hidden},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // #region agent log
    const visibilityChangeCountRef = { count: 0 };
    const handleVisibilityChange = () => {
      visibilityChangeCountRef.count++;
      fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnimatedBackground.tsx:35',message:'Page visibility changed',data:{isVisible:!document.hidden,changeCount:visibilityChangeCountRef.count},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // #endregion

    // Imposta dimensioni canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Crea particelle
    const particleCount = 50;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    // Funzione di animazione
    const animate = () => {
      // Pausa animazione quando la pagina non è visibile
      if (document.hidden) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const frameStart = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // #region agent log
      const particleCount = particlesRef.current.length;
      let connectionChecks = 0;
      let connectionsDrawn = 0;
      // #endregion

      // Aggiorna e disegna particelle
      particlesRef.current.forEach((particle, i) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Disegna particella
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 58, 237, ${particle.opacity})`;
        ctx.fill();

        // Connessioni tra particelle vicine - OTTIMIZZATO: evita controlli duplicati
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const other = particlesRef.current[j];
          connectionChecks++;
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distanceSquared = dx * dx + dy * dy; // Evita sqrt fino a quando necessario

          if (distanceSquared < 22500) { // 150^2 = 22500
            connectionsDrawn++;
            const distance = Math.sqrt(distanceSquared);
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(124, 58, 237, ${0.1 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      // #region agent log
      const frameTime = performance.now() - frameStart;
      if (frameTime > 16) { // Log solo se frame > 16ms (60fps)
        fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnimatedBackground.tsx:93',message:'Slow frame detected',data:{frameTime:Math.round(frameTime),particleCount,connectionChecks,connectionsDrawn},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      }
      // #endregion

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      // #region agent log
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnimatedBackground.tsx:102',message:'AnimatedBackground unmounted',data:{visibilityChanges:visibilityChangeCountRef.count},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Canvas per particelle */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Gradient mesh animato */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              'radial-gradient(ellipse at 20% 0%, rgba(124, 58, 237, 0.25) 0%, transparent 50%)',
              'radial-gradient(ellipse at 80% 20%, rgba(124, 58, 237, 0.25) 0%, transparent 50%)',
              'radial-gradient(ellipse at 20% 0%, rgba(124, 58, 237, 0.25) 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0"
        />
        <motion.div
          animate={{
            background: [
              'radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)',
              'radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)',
              'radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0"
        />
        <motion.div
          animate={{
            background: [
              'radial-gradient(ellipse at 50% 50%, rgba(167, 139, 250, 0.15) 0%, transparent 60%)',
              'radial-gradient(ellipse at 30% 70%, rgba(167, 139, 250, 0.15) 0%, transparent 60%)',
              'radial-gradient(ellipse at 50% 50%, rgba(167, 139, 250, 0.15) 0%, transparent 60%)',
            ],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0"
        />
      </div>

      {/* Onde animate */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: ['-50%', '0%', '-50%'],
            y: ['-50%', '0%', '-50%'],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 50%, transparent 100%)',
          }}
        />
        <motion.div
          animate={{
            x: ['0%', '-50%', '0%'],
            y: ['0%', '-50%', '0%'],
            scale: [1.2, 1, 1.2],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-1/2 -right-1/2 w-[200%] h-[200%] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 100%)',
          }}
        />
      </div>

      {/* Pattern griglia sottile migliorato */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124, 58, 237, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 58, 237, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Overlay per profondità */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark-500/50" />
    </div>
  );
};
