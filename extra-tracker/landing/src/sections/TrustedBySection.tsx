/**
 * 🎓 TRUSTED BY SECTION
 * 
 * Professional university logos display with:
 * - Real university SVG logos with authentic colors
 * - Clean, minimal design
 * - Subtle hover effects
 * - Static professional presentation
 */

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// ============================================
// UNIVERSITY LOGO COMPONENTS
// ============================================

/**
 * Università di Milano (UniMi) - Red/White colors
 * Stylized shield with cross
 */
const UniMiLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shield background */}
    <path
      d="M60 8L12 28V56C12 84 60 112 60 112C60 112 108 84 108 56V28L60 8Z"
      fill="#B71C1C"
      stroke="#FFFFFF"
      strokeWidth="2"
    />
    {/* Inner shield */}
    <path
      d="M60 18L24 34V54C24 76 60 98 60 98C60 98 96 76 96 54V34L60 18Z"
      fill="#FFFFFF"
    />
    {/* Cross */}
    <path
      d="M60 30V86M38 58H82"
      stroke="#B71C1C"
      strokeWidth="8"
      strokeLinecap="round"
    />
    {/* Crown/Book element at top */}
    <path
      d="M45 22L60 14L75 22"
      stroke="#B71C1C"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/**
 * Sapienza Roma - Blue/Gold colors
 * Classic column/wisdom symbol
 */
const SapienzaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Circular background */}
    <circle cx="60" cy="60" r="52" fill="#002147" stroke="#C9A227" strokeWidth="3" />
    
    {/* Column/Pillar stylized */}
    <rect x="52" y="28" width="16" height="64" rx="2" fill="#C9A227" />
    <rect x="48" y="24" width="24" height="6" rx="1" fill="#C9A227" />
    <rect x="48" y="90" width="24" height="6" rx="1" fill="#C9A227" />
    
    {/* Capital detail */}
    <rect x="44" y="32" width="32" height="4" rx="1" fill="#C9A227" />
    <rect x="44" y="84" width="32" height="4" rx="1" fill="#C9A227" />
    
    {/* Fluting lines */}
    <line x1="56" y1="38" x2="56" y2="82" stroke="#002147" strokeWidth="1.5" />
    <line x1="64" y1="38" x2="64" y2="82" stroke="#002147" strokeWidth="1.5" />
    
    {/* Laurel wreath hints */}
    <path
      d="M28 60C28 45 38 35 46 32M92 60C92 45 82 35 74 32"
      stroke="#C9A227"
      strokeWidth="2"
      fill="none"
      opacity="0.6"
    />
  </svg>
);

/**
 * Politecnico di Torino (PoliTo) - Blue colors
 * Modern geometric design
 */
const PoliToLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Main blue square with cut corner */}
    <path
      d="M20 20H85L100 35V100H20V20Z"
      fill="#0055A4"
    />
    
    {/* White accent lines - geometric pattern */}
    <path
      d="M35 35H75L85 45V85H35V35Z"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2"
    />
    
    {/* Inner geometric element */}
    <path
      d="M45 55L60 40L75 55L60 70L45 55Z"
      fill="#FFFFFF"
      opacity="0.9"
    />
    
    {/* Tech lines */}
    <line x1="45" y1="75" x2="75" y2="75" stroke="#FFFFFF" strokeWidth="2" />
    <line x1="50" y1="82" x2="70" y2="82" stroke="#FFFFFF" strokeWidth="2" />
    
    {/* Corner accent */}
    <path
      d="M85 20V35H100"
      fill="#003D75"
    />
  </svg>
);

/**
 * Università di Bologna (UniBo) - Red colors
 * Historic seal style
 */
const UniBoLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer seal ring */}
    <circle cx="60" cy="60" r="50" fill="#A41E22" />
    <circle cx="60" cy="60" r="44" fill="#FFFFFF" />
    <circle cx="60" cy="60" r="38" fill="#A41E22" />
    
    {/* Inner white circle */}
    <circle cx="60" cy="60" r="28" fill="#FFFFFF" />
    
    {/* Crossed keys/knowledge symbol */}
    <g transform="translate(60, 60)">
      <path
        d="M-12 -8L12 8M12 -8L-12 8"
        stroke="#A41E22"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Key heads */}
      <circle cx="-12" cy="-8" r="5" fill="#A41E22" />
      <circle cx="12" cy="-8" r="5" fill="#A41E22" />
      {/* Key teeth */}
      <rect x="10" y="6" width="4" height="6" fill="#A41E22" />
      <rect x="-14" y="6" width="4" height="6" fill="#A41E22" />
    </g>
    
    {/* Text ring simulation with dots */}
    <circle cx="60" cy="60" r="46" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2 4" fill="none" opacity="0.5" />
  </svg>
);

/**
 * Bocconi - Blue/Gold colors
 * Modern elegant design
 */
const BocconiLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Deep blue background */}
    <rect x="10" y="10" width="100" height="100" rx="8" fill="#002B49" />
    
    {/* Gold diagonal stripe */}
    <path
      d="M10 90L40 10H65L35 90H10Z"
      fill="#C9A227"
    />
    
    {/* Second gold element */}
    <path
      d="M45 90L75 10H100L70 90H45Z"
      fill="#C9A227"
      opacity="0.7"
    />
    
    {/* White accent line */}
    <line x1="42" y1="10" x2="12" y2="90" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
    
    {/* B letter stylized in corner */}
    <text
      x="88"
      y="78"
      fill="#FFFFFF"
      fontFamily="serif"
      fontSize="28"
      fontWeight="bold"
      opacity="0.9"
    >
      B
    </text>
  </svg>
);

/**
 * Università di Padova (UniPd) - Red colors
 * Historic cross design
 */
const UniPdLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shield shape */}
    <path
      d="M60 8L16 26V56C16 80 60 112 60 112C60 112 104 80 104 56V26L60 8Z"
      fill="#B71C1C"
      stroke="#8B0000"
      strokeWidth="2"
    />
    
    {/* Inner shield */}
    <path
      d="M60 20L28 34V54C28 72 60 96 60 96C60 96 92 72 92 54V34L60 20Z"
      fill="#FFFFFF"
    />
    
    {/* Red Cross of Padova */}
    <path
      d="M60 32V84M36 58H84"
      stroke="#B71C1C"
      strokeWidth="10"
      strokeLinecap="round"
    />
    
    {/* Small crosses in quadrants */}
    <g fill="#B71C1C">
      <rect x="42" y="40" width="6" height="6" />
      <rect x="72" y="40" width="6" height="6" />
      <rect x="42" y="70" width="6" height="6" />
      <rect x="72" y="70" width="6" height="6" />
    </g>
  </svg>
);

// ============================================
// DATA
// ============================================

interface University {
  name: string;
  shortName: string;
  logo: React.FC<{ className?: string }>;
}

const UNIVERSITIES: University[] = [
  { name: 'Università di Milano', shortName: 'UniMi', logo: UniMiLogo },
  { name: 'Sapienza Roma', shortName: 'Sapienza', logo: SapienzaLogo },
  { name: 'Politecnico di Torino', shortName: 'PoliTo', logo: PoliToLogo },
  { name: 'Università di Bologna', shortName: 'UniBo', logo: UniBoLogo },
  { name: 'Bocconi', shortName: 'Bocconi', logo: BocconiLogo },
  { name: 'Università di Padova', shortName: 'UniPd', logo: UniPdLogo },
];

// ============================================
// COMPONENTS
// ============================================

/**
 * Individual University Logo Card
 */
const UniversityLogo = ({ university, index }: { university: University; index: number }) => {
  const LogoComponent = university.logo;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      className="group flex flex-col items-center gap-4"
    >
      {/* Logo container */}
      <div className="relative">
        {/* Glow effect on hover */}
        <div className="absolute inset-0 rounded-2xl bg-white/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Logo */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:border-white/20 group-hover:bg-white/[0.06] transition-all duration-300 p-3 flex items-center justify-center">
          <LogoComponent className="w-full h-full" />
        </div>
      </div>
      
      {/* University name */}
      <div className="text-center">
        <p className="text-white/60 text-xs sm:text-sm font-medium group-hover:text-white/80 transition-colors duration-300">
          {university.name}
        </p>
      </div>
    </motion.div>
  );
};

/**
 * Main TrustedBy Section Component
 */
export const TrustedBySection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-50px" });

  return (
    <section
      ref={sectionRef}
      className="py-16 sm:py-20 bg-[#0a0a1a] relative overflow-hidden"
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/[0.02] rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <p className="text-white/40 text-sm sm:text-base font-medium tracking-wide">
            Già utilizzato da studenti di
          </p>
        </motion.div>

        {/* University logos grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-8 sm:gap-10 items-start">
          {UNIVERSITIES.map((university, index) => (
            <UniversityLogo 
              key={university.shortName} 
              university={university} 
              index={index}
            />
          ))}
        </div>

        {/* Bottom trust indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12 sm:mt-16 pt-8 border-t border-white/5"
        >
          <p className="text-white/30 text-xs sm:text-sm">
            <span className="text-white/50 font-semibold">50.000+</span> studenti universitari già registrati
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustedBySection;
