import React from 'react';
import { Outlet } from 'react-router-dom';
import { TimeTrackingBackground } from '../components/TimeTrackingBackground';
import { BrandStory } from './BrandStory';

export const AuthLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans text-white">
      {/* Background tematico Time Tracking */}
      <TimeTrackingBackground />

      {/* Contenuto principale */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
        <Outlet />
      </div>

      {/* Story Layer */}
      <BrandStory />
    </div>
  );
};