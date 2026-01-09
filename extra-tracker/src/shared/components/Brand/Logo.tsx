import React from 'react';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'giant';
type LogoVariant = 'full' | 'icon-only';

interface LogoProps {
  className?: string;
  size?: LogoSize;
  variant?: LogoVariant;
  monochrome?: boolean;
  animated?: boolean; // Nuova prop per abilitare le animazioni
}

const iconSizes: Record<LogoSize, string> = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
  '2xl': 'h-20 w-20',
  'giant': 'h-32 w-32', // Per landing pages
};

const textSizes: Record<LogoSize, string> = {
  xs: 'text-xs',
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl',
  '2xl': 'text-5xl',
  'giant': 'text-7xl',
};

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  variant = 'full',
  monochrome = false,
  animated = true
}) => {
  return (
    // "group" permette di controllare l'animazione dell'icona quando si passa il mouse sull'intero contenitore
    <div className={`group flex items-center gap-3 font-sans ${className} select-none`}>
      
      <svg 
        className={`${iconSizes[size]} flex-shrink-0 transition-transform duration-500 ease-out ${animated ? 'group-hover:scale-110 group-hover:rotate-3' : ''}`} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* GRADIENTS */}
          <linearGradient id="amberSpark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          
          <linearGradient id="violetSpark" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          {/* ADVANCED SVG FILTER: "Inner Glow" / "Bloom"
             Questo filtro crea un effetto di luce diffusa attorno alla forma,
             facendola sembrare energia pura invece che un disegno vettoriale piatto.
          */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* SHAPE GROUP
            Raggruppiamo le path per applicare stili comuni se necessario.
        */}
        <g filter={!monochrome ? "url(#glow)" : undefined}>
          {/* Top Spark (Human Intent - Amber) */}
          <path 
            className={`transition-all duration-700 ${animated ? 'group-hover:translate-x-[-2px] group-hover:translate-y-[2px]' : ''}`}
            d="M50 5 C55 30 65 40 95 50 C65 60 55 65 50 55 C45 45 60 35 50 5 Z" 
            fill={monochrome ? 'currentColor' : 'url(#amberSpark)'}
          />

          {/* Bottom Spark (AI Foundation - Violet) */}
          <path 
            className={`transition-all duration-700 ${animated ? 'group-hover:translate-x-[2px] group-hover:translate-y-[-2px]' : ''}`}
            d="M50 95 C45 70 35 60 5 50 C35 40 45 35 50 45 C55 55 40 65 50 95 Z" 
            fill={monochrome ? 'currentColor' : 'url(#violetSpark)'}
          />
        </g>
      </svg>

      {variant === 'full' && (
        <span className={`font-bold tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}>
          Silvi<span className={monochrome ? '' : "text-violet-600 dark:text-violet-400"}>AI</span>
        </span>
      )}
    </div>
  );
};