import React, { memo } from 'react';
import { motion } from 'framer-motion';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'giant';
type LogoVariant = 'full' | 'icon-only' | 'with-version';

interface LogoProps {
  className?: string;
  size?: LogoSize;
  variant?: LogoVariant;
  monochrome?: boolean;
  animated?: boolean;
  version?: string;
}

const iconSizes: Record<LogoSize, string> = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
  '2xl': 'h-20 w-20',
  'giant': 'h-32 w-32',
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

const versionBadgeSizes: Record<LogoSize, string> = {
  xs: 'text-[6px] px-1 py-0',
  sm: 'text-[8px] px-1.5 py-0.5',
  md: 'text-[9px] px-2 py-0.5',
  lg: 'text-[10px] px-2 py-0.5',
  xl: 'text-xs px-2.5 py-1',
  '2xl': 'text-sm px-3 py-1',
  'giant': 'text-base px-4 py-1.5',
};

export const Logo: React.FC<LogoProps> = memo(({ 
  className = '', 
  size = 'md', 
  variant = 'full',
  monochrome = false,
  animated = true,
  version,
}) => {
  const appVersion = version || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '');

  return (
    <div className={`group flex items-center gap-3 font-sans ${className} select-none`}>
      {/* Logo Icon Container */}
      <motion.div
        className="relative"
        whileHover={animated ? { scale: 1.05, rotate: 5 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {/* Glow Effect */}
        <div 
          className={`absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${
            animated ? 'group-hover:animate-pulse' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--violet-500) 100%)',
          }}
        />

        <svg 
          className={`${iconSizes[size]} flex-shrink-0 relative z-10 transition-transform duration-500 ease-out ${
            animated ? 'group-hover:scale-110' : ''
          }`} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="amberSpark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            
            <linearGradient id="violetSpark" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>

            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary-400)" />
              <stop offset="50%" stopColor="var(--violet-500)" />
              <stop offset="100%" stopColor="var(--primary-600)" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <g filter={!monochrome ? "url(#glow)" : undefined}>
            {/* Upper Spark */}
            <motion.path 
              className={`transition-all duration-700 ${animated ? 'group-hover:translate-x-[-2px] group-hover:translate-y-[2px]' : ''}`}
              d="M50 5 C55 30 65 40 95 50 C65 60 55 65 50 55 C45 45 60 35 50 5 Z" 
              fill={monochrome ? 'currentColor' : 'url(#amberSpark)'}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* Lower Spark */}
            <motion.path 
              className={`transition-all duration-700 ${animated ? 'group-hover:translate-x-[2px] group-hover:translate-y-[-2px]' : ''}`}
              d="M50 95 C45 70 35 60 5 50 C35 40 45 35 50 45 C55 55 40 65 50 95 Z" 
              fill={monochrome ? 'currentColor' : 'url(#violetSpark)'}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </g>
        </svg>
      </motion.div>

      {/* Text Section */}
      {(variant === 'full' || variant === 'with-version') && (
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <span 
              className={`font-bold tracking-tight ${textSizes[size]}`}
              style={{ color: 'var(--text-primary)' }}
            >
              Silvi
              <span 
                className={monochrome ? '' : ''}
                style={{ color: 'var(--primary-500)' }}
              >
                AI
              </span>
            </span>

            {/* Version Badge */}
            {variant === 'with-version' && appVersion && (
              <motion.span
                className={`font-mono font-semibold rounded-full border ${versionBadgeSizes[size]}`}
                style={{
                  color: 'var(--text-muted)',
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                whileHover={{ 
                  scale: 1.05,
                  borderColor: 'var(--primary-500/30)',
                  color: 'var(--primary-500)',
                }}
              >
                v{appVersion}
              </motion.span>
            )}
          </div>

          {/* Tagline - solo per size più grandi */}
          {(size === 'xl' || size === '2xl' || size === 'giant') && (
            <motion.span
              className="text-xs font-medium tracking-wide"
              style={{ color: 'var(--text-muted)' }}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              Study smarter, not harder
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
});

Logo.displayName = 'Logo';

export default Logo;
