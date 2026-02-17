import React from 'react';
import { Outlet } from 'react-router-dom';
import { TimeTrackingBackground } from '../components/TimeTrackingBackground';
import { BrandStory } from './BrandStory';

export const AuthLayout: React.FC = () => {
  return (
    <div className="auth-layout relative min-h-screen w-full overflow-hidden font-sans text-theme-primary">
      {/* Skip Navigation Link for Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>
      
      {/* Background tematico Time Tracking */}
      <TimeTrackingBackground />

      {/* Contenuto principale */}
      <main id="main-content" className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
        <Outlet />
      </main>

      {/* Story Layer */}
      <BrandStory />
    </div>
  );
};
