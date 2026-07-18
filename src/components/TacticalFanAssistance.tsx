import React from "react";
import { Card } from "./SharedPrimitives";

interface TacticalFanAssistanceProps {
  className?: string;
  triggerAccessibilityDispatch: (
    type: "wheelchair" | "sensory_kit" | "guiding_companion"
  ) => void;
}

export const TacticalFanAssistance: React.FC<TacticalFanAssistanceProps> = ({
  className = "",
  triggerAccessibilityDispatch,
}) => {
  return (
    <Card module="unitypath" className={`space-y-4 ${className}`}>
      <div className="border-b border-white/5 pb-2">
        <h3 className="text-xs font-mono font-bold uppercase text-white/40">
          Tactical Fan Assistance
        </h3>
        <h4 className="text-sm font-display font-black uppercase tracking-wider text-white mt-1">
          Request Live Volunteer Dispatch
        </h4>
      </div>
      <p className="text-[11px] text-white/60 leading-relaxed">
        Arriving at Azteca/MetLife and need an in-person companion helper,
        sensory bag, or wheelchair routing helper? Tap an assistance card to
        deploy help.
      </p>
      <div className="space-y-3 pt-2">
        <button
          onClick={() => triggerAccessibilityDispatch("wheelchair")}
          className="w-full text-left p-3.5 rounded-sm border border-white/5 hover:border-[#9D50FF]/40 bg-[#111114] hover:bg-[#16161A] active:scale-95 transition-all flex items-center justify-between min-h-[44px] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">♿</span>
            <div className="text-left">
              <span className="block text-xs font-display font-bold uppercase text-white">
                Wheelchair Assistance
              </span>
              <span className="text-[10px] font-mono text-white/40 uppercase">
                Deploy step-free helper
              </span>
            </div>
          </div>
          <span className="text-[#9D50FF] text-xs font-bold">➔</span>
        </button>
        <button
          onClick={() => triggerAccessibilityDispatch("guiding_companion")}
          className="w-full text-left p-3.5 rounded-sm border border-white/5 hover:border-[#9D50FF]/40 bg-[#111114] hover:bg-[#16161A] active:scale-95 transition-all flex items-center justify-between min-h-[44px] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🤝</span>
            <div className="text-left">
              <span className="block text-xs font-display font-bold uppercase text-white">
                Guiding Companion
              </span>
              <span className="text-[10px] font-mono text-white/40 uppercase">
                Sight / sensory navigation helper
              </span>
            </div>
          </div>
          <span className="text-[#9D50FF] text-xs font-bold">➔</span>
        </button>
      </div>
    </Card>
  );
};
