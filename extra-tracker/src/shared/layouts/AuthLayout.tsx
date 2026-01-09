import React from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatedBackground } from '../components/AnimatedBackground'; // Assicurati che il percorso sia giusto
import {BrandStory} from './BrandStory';

export const AuthLayout: React.FC = () => {
  return (
    // Rimuoviamo classi come 'bg-slate-50' o 'bg-white' da qui perché coprirebbero l'animazione
    <div className="relative min-h-screen w-full overflow-hidden font-sans text-slate-900 dark:text-white">
      
      {/* 1. Il Background Animato va qui, al livello più basso */}
      <AnimatedBackground />

      {/* 2. Il contenuto (Login/Register) va sopra. 
          'relative z-10' assicura che stia sopra lo sfondo. 
          Responsive per mobile
      */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-3 sm:p-4 py-6 sm:py-4">
        <Outlet />
      </div>

    {/* Story Layer (Galleggia sopra tutto) */}
      <BrandStory /> 
    
    </div>
  );
};