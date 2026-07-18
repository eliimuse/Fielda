import React from "react";
import { Navigation, Eye, Heart } from "lucide-react";

export const AccessibilityInfrastructureGuides: React.FC = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-white/40 tracking-wider">
        Stadium Accessibility Infrastructure
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Step-Free Access */}
        <div className="p-4 rounded-sm border border-slate-200 dark:border-white/5 bg-[#fcfcfc] dark:bg-[#16161A] flex flex-col gap-3 items-start shadow-sm dark:shadow-none text-slate-900 dark:text-white">
          <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#9D50FF]">
            <Navigation size={16} />
          </div>
          <div className="space-y-1 sm:space-y-2">
            <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Step-Free Access
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-white/60 leading-relaxed">
              Elevators situating at Gate A and D feature Braille buttons,
              automatic leveling, and step-free floor layouts.
            </p>
          </div>
        </div>

        {/* Sensory Rooms */}
        <div className="p-4 rounded-sm border border-slate-200 dark:border-white/5 bg-[#fcfcfc] dark:bg-[#16161A] flex flex-col gap-3 items-start shadow-sm dark:shadow-none text-slate-900 dark:text-white">
          <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#9D50FF]">
            <Eye size={16} />
          </div>
          <div className="space-y-1 sm:space-y-2">
            <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Sensory Rooms
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-white/60 leading-relaxed">
              Quiet Rooms equipped with noise reduction, tactile panels, and
              dimmable LEDs. Accessible freely to all neurodivergent fans.
            </p>
          </div>
        </div>

        {/* Support Kits */}
        <div className="p-4 rounded-sm border border-slate-200 dark:border-white/5 bg-[#fcfcfc] dark:bg-[#16161A] flex flex-col gap-3 items-start shadow-sm dark:shadow-none text-slate-900 dark:text-white">
          <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#9D50FF]">
            <Heart size={16} />
          </div>
          <div className="space-y-1 sm:space-y-2">
            <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Support kits
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-white/60 leading-relaxed">
              Sensory kits containing noise-canceling earmuffs, fidget toys,
              and feeling meters are obtainable free at any information rail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
