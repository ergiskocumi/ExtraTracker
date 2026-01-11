import React, { useMemo } from 'react';

// Configuriamo i colori del brand direttamente qui per coerenza con il logo
const COLORS = {
  grid: 'rgba(120, 120, 120, 0.02)', // Griglia poco visibile
  amber: '#F59E0B', // Amber-500 (User Intent)
  violet: '#7C3AED', // Violet-600 (AI Logic)
};

interface BeamProps {
  color: string;
  duration: number;
  delay: number;
  direction: 'horizontal' | 'vertical';
  position: number; // Top % o Left %
  length: number; // Lunghezza della scia
}

const CircuitBeam: React.FC<BeamProps> = ({ color, duration, delay, direction, position, length }) => {
  // ARCHITETTURA VISIVA:
  // Usiamo gradienti lineari per creare l'effetto "cometa" (testa luminosa, coda che svanisce).
  const style: React.CSSProperties = {
    position: 'absolute',
    background: direction === 'horizontal'
      ? `linear-gradient(90deg, transparent, ${color}, transparent)`
      : `linear-gradient(180deg, transparent, ${color}, transparent)`,
    opacity: 0.6,
    boxShadow: `0 0 8px ${color}`, // Effetto "Glow"
    borderRadius: '999px',
    
    // Dimensioni dinamiche in base alla direzione
    width: direction === 'horizontal' ? `${length}px` : '2px',
    height: direction === 'horizontal' ? '2px' : `${length}px`,
    
    // Posizionamento
    top: direction === 'horizontal' ? `${position}%` : '-100px', // Start off-screen
    left: direction === 'vertical' ? `${position}%` : '-100px',   // Start off-screen
    
    // Animazione (definisce il tempo e il ritardo infinito)
    animation: `travel-${direction} ${duration}s linear infinite`,
    animationDelay: `${delay}s`,
  };

  return <div style={style} className="pointer-events-none" />;
};

export const AnimatedBackground: React.FC = () => {
  // MEMOIZATION:
  // Generiamo le posizioni dei raggi una sola volta all'avvio dell'app.
  // Non vogliamo che la griglia cambi layout ad ogni re-render di React.
  const beams = useMemo(() => {
    const items: BeamProps[] = [];
    const count = 12; // Numero totale di impulsi simultanei (non troppi per non distrarre)

    for (let i = 0; i < count; i++) {
      items.push({
        // Alterniamo tra azioni umane (Amber) e AI (Viola)
        color: Math.random() > 0.5 ? COLORS.amber : COLORS.violet,
        // Durata casuale per evitare l'effetto "robotico" sincronizzato
        duration: 3 + Math.random() * 5, // Tra 3s e 8s
        delay: Math.random() * 5, // Ritardo iniziale
        direction: Math.random() > 0.5 ? 'horizontal' : 'vertical',
        // Posizioniamo su una griglia immaginaria (es. ogni 5%) per allinearci visivamente
        position: Math.floor(Math.random() * 20) * 5, 
        length: 100 + Math.random() * 150, // Lunghezza scia variabile
      });
    }
    return items;
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      
      {/* 1. LAYER GRIGLIA STATICA (CSS PURE) 
          Usiamo due gradienti lineari ripetuti per disegnare i quadretti.
          È molto più leggero di un SVG con 1000 linee <line>.
      */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${COLORS.grid} 1px, transparent 1px),
            linear-gradient(to bottom, ${COLORS.grid} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px', // Dimensione cella griglia
          // Maschera radiale per sfumare i bordi - griglia poco visibile
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 100%)',
          opacity: 0.4, // Opacità aggiuntiva per renderla poco visibile
        }}
      />

      {/* 2. LAYER IMPULSI (BEAMS) */}
      <div className="absolute inset-0">
        {beams.map((beam, idx) => (
          <CircuitBeam key={idx} {...beam} />
        ))}
      </div>

      {/* 3. STILI CSS INIETTATI (Per le animazioni keyframe) 
          In un progetto grande, questi andrebbero in index.css o tailwind.config.js,
          ma qui li teniamo incapsulati per facilità di "Learning by Doing".
      */}
      <style>{`
        @keyframes travel-horizontal {
          0% { transform: translateX(-200px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
        @keyframes travel-vertical {
          0% { transform: translateY(-200px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};