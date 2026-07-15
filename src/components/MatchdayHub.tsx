import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, Button, Badge, Modal } from "./SharedPrimitives";
import {
  Eye,
  HelpCircle,
  Navigation,
  ShieldCheck,
  Heart,
  MapPin,
  Smile,
  Sparkles,
  Shield,
  Globe,
  HeartHandshake,
  Radio,
  Accessibility,
  VolumeX,
  Volume1,
  Volume2,
  Contrast,
} from "lucide-react";
import { AnimatedBackground } from "./AnimatedBackground";

export const MatchdayHub: React.FC<{
  setActiveScreen: (scr: string) => void;
}> = ({ setActiveScreen }) => {
  const [activeMatches, setActiveMatches] = useState([
    {
      id: "m1",
      round: "Semi-finals",
      teamA: "France",
      flagA: "🇫🇷",
      teamB: "Spain",
      flagB: "🇪🇸",
      stadium: "MetLife Stadium",
      city: "East Rutherford, NJ",
      time: "12:30 AM",
      date: "Wed, Jul 15",
      status: "scheduled",
    },
    {
      id: "m2",
      round: "Semi-finals",
      teamA: "England",
      flagA: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      teamB: "Argentina",
      flagB: "🇦🇷",
      stadium: "Mercedes-Benz Stadium",
      city: "Atlanta, GA",
      time: "12:30 AM",
      date: "Thu, Jul 16",
      status: "scheduled",
    },
  ]);
  const [profile, setProfile] = useState<any>(supabase.auth.getProfile());
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Emergency SOS state
  const [stadiumId, setStadiumId] = useState(
    () => localStorage.getItem("selectedStadiumId") || "stadium-1",
  );
  const [stadiumZones, setStadiumZones] = useState<any[]>([]);
  const [activeSosId, setActiveSosId] = useState<string | null>(() =>
    localStorage.getItem("active_sos_id"),
  );
  const [activeSosIncident, setActiveSosIncident] = useState<any | null>(null);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState("Local Fire Alert");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");

  // Sync current stadium ID
  useEffect(() => {
    const handleStorageChange = () => {
      const curStadium =
        localStorage.getItem("selectedStadiumId") || "stadium-1";
      setStadiumId(curStadium);
    };
    window.addEventListener("storage", handleStorageChange);
    // Poll to keep in sync in same window
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Fetch zones for current stadium
  useEffect(() => {
    const loadZones = async () => {
      const { data } = await supabase.from("zones").select("*");
      if (data) {
        const filtered = data.filter(
          (z: any) =>
            z.stadium_id === stadiumId &&
            !["Gate A", "Gate D"].includes(z.name),
        );
        setStadiumZones(filtered);
        if (filtered.length > 0 && !selectedZoneId) {
          setSelectedZoneId(filtered[0].id);
        }
      }
    };
    loadZones();
    const sub = supabase.subscribe("zones", loadZones);
    return () => sub.unsubscribe();
  }, [stadiumId]);

  // Track the active SOS incident
  useEffect(() => {
    const checkActiveSos = async () => {
      const currentSosId = localStorage.getItem("active_sos_id");
      if (!currentSosId) {
        setActiveSosId(null);
        setActiveSosIncident(null);
        return;
      }
      const { data } = await supabase.from("incidents").select("*");
      if (data) {
        const found = data.find(
          (i: any) => i.id === currentSosId && i.status !== "resolved",
        );
        if (found) {
          setActiveSosId(currentSosId);
          setActiveSosIncident(found);
        } else {
          localStorage.removeItem("active_sos_id");
          setActiveSosId(null);
          setActiveSosIncident(null);
        }
      }
    };

    checkActiveSos();
    const sub = supabase.subscribe("incidents", checkActiveSos);
    return () => sub.unsubscribe();
  }, [activeSosId]);

  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem("accessibility-high-contrast") === "true";
  });
  const [ttsVolume, setTtsVolume] = useState(() => {
    const vol = localStorage.getItem("accessibility-tts-volume");
    return vol !== null ? parseFloat(vol) : 1.0;
  });
  const [simplifiedNav, setSimplifiedNav] = useState(() => {
    return localStorage.getItem("accessibility-simplified-nav") === "true";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle("simplified-nav", simplifiedNav);
  }, [simplifiedNav]);

  const speakFeedback = (text: string, vol: number) => {
    if ("speechSynthesis" in window && vol > 0) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = vol;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleToggleHighContrast = () => {
    const newVal = !highContrast;
    setHighContrast(newVal);
    localStorage.setItem(
      "accessibility-high-contrast",
      newVal ? "true" : "false",
    );
    speakFeedback(
      newVal ? "High contrast mode active" : "Standard mode active",
      ttsVolume,
    );
  };

  const handleChangeTtsVolume = (vol: number) => {
    setTtsVolume(vol);
    localStorage.setItem("accessibility-tts-volume", vol.toString());
    const feedbackText =
      vol === 0
        ? "Speech muted"
        : vol === 0.5
          ? "Speech volume fifty percent"
          : "Speech volume maximum";
    speakFeedback(feedbackText, vol === 0 ? 0.5 : vol);
  };

  const handleToggleSimplifiedNav = () => {
    const newVal = !simplifiedNav;
    setSimplifiedNav(newVal);
    localStorage.setItem(
      "accessibility-simplified-nav",
      newVal ? "true" : "false",
    );
    speakFeedback(
      newVal ? "Simplified layout active" : "Standard layout active",
      ttsVolume,
    );
  };

  useEffect(() => {
    setProfile(supabase.auth.getProfile());
    const sub = supabase.subscribe("auth", () => {
      setProfile(supabase.auth.getProfile());
    });
    return () => sub.unsubscribe();
  }, []);

  const triggerAccessibilityDispatch = async (
    type: "wheelchair" | "sensory_kit" | "guiding_companion" | "volunteer" | "sos",
  ) => {
    const fanId = profile?.id || "anonymous-fan";
    await supabase.from("accessibility_requests").insert({
      fan_id: fanId,
      request_type: type,
      zone_id: "zone-1a", // main entrance default
      status: "pending",
      created_at: new Date().toISOString(),
    });

    // Also dispatch notification to operations channel so they see it live!
    const label =
      type === "wheelchair"
        ? "Wheelchair Assistance"
        : type === "sensory_kit"
          ? "Sensory Kit Request"
          : type === "volunteer"
            ? "Volunteer Dispatch"
            : type === "sos"
              ? "Emergency SOS Trigger"
              : "Guiding Companion Dispatch";
    await supabase.from("comms_messages").insert({
      channel: "operations",
      original_text: `[Accessibility request]: Fan requires assistance at Gate A entrance. Service required: ${label}.`,
      original_lang: "en",
      translated_text: `[Solicitud de accesibilidad]: El aficionado requiere asistencia en la entrada de la Puerta A. Servicio requerido: ${label}.`,
      sender: "Unity Path Fan Companion",
    });

    setRequestSubmitted(true);
    setTimeout(() => setRequestSubmitted(false), 5000);
  };

  const handleSubmitSos = async () => {
    if (!selectedZoneId) return;

    // Insert an accessibility request entry first
    const fanId = profile?.id || "anonymous-fan";
    await supabase.from("accessibility_requests").insert({
      fan_id: fanId,
      request_type: "sos",
      zone_id: selectedZoneId || "zone-1a",
      status: "pending",
      created_at: new Date().toISOString(),
    });

    const { data } = await supabase.from("incidents").insert({
      stadium_id: stadiumId,
      zone_id: selectedZoneId,
      title: emergencyType,
      severity: "critical",
      status: "reported",
      description:
        additionalDetails ||
        `Emergency reported: ${emergencyType}. Immediate response required.`,
      created_at: new Date().toISOString(),
    });

    const zoneObj = stadiumZones.find((z) => z.id === selectedZoneId);
    await supabase.from("comms_messages").insert({
      channel: "operations",
      original_text: `🚨 [CRITICAL SOS]: Emergency ${emergencyType} reported at ${zoneObj?.name || "Sector"}!`,
      original_lang: "en",
      translated_text: `🚨 [SOS CRÍTICO]: ¡Emergencia ${emergencyType} reportada en ${zoneObj?.name || "Sector"}!`,
      sender: "Emergency SOS Broadcast",
    });

    // Check newly inserted incident ID to track its status in real time
    const incs = await supabase.from("incidents").select();
    if (incs.data) {
      const sorted = incs.data
        .filter(
          (i: any) =>
            i.stadium_id === stadiumId &&
            i.title === emergencyType &&
            i.severity === "critical",
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      if (sorted.length > 0) {
        localStorage.setItem("active_sos_id", sorted[0].id);
        setActiveSosId(sorted[0].id);
      }
    }

    setIsSosModalOpen(false);
    setAdditionalDetails("");
  };

  if (simplifiedNav) {
    return (
      <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto text-white relative">
        <AnimatedBackground module="unitypath" />

        <div className="relative z-10 space-y-8">
          {/* Quick Actions Panel at the very top */}
          <div className="bg-[#111114] border-2 border-[#9D50FF] p-6 rounded-sm flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <Accessibility size={32} className="text-[#9D50FF]" />
              <div>
                <h2 className="text-2xl font-display font-black uppercase tracking-wider text-white">
                  Simplified View Active
                </h2>
                <p className="text-sm text-white/80">
                  Large buttons and high-contrast styling designed for ease of
                  use
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleToggleHighContrast}
                className={`px-4 py-3 border-2 text-sm font-display font-bold uppercase tracking-wider transition-all flex items-center gap-2 min-h-[44px] cursor-pointer ${
                  highContrast
                    ? "bg-white text-black border-white"
                    : "bg-black text-white border-white hover:bg-white/10 keep-white"
                }`}
              >
                <Eye size={16} />
                Contrast: {highContrast ? "HIGH" : "STANDARD"}
              </button>

              {/* TTS volume step-controller inside simple view */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/20 p-1 rounded-sm min-h-[44px]">
                <span className="text-xs font-mono uppercase text-white/70 px-2">
                  Voice:
                </span>
                <button
                  onClick={() => handleChangeTtsVolume(0)}
                  className={`px-3 py-2 text-xs font-display font-bold rounded-sm uppercase cursor-pointer ${
                    ttsVolume === 0
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  MUTE
                </button>
                <button
                  onClick={() => handleChangeTtsVolume(0.5)}
                  className={`px-3 py-2 text-xs font-display font-bold rounded-sm uppercase cursor-pointer ${
                    ttsVolume === 0.5
                      ? "bg-[#9D50FF]/20 text-[#c084fc] border border-[#9D50FF]/30"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  50%
                </button>
                <button
                  onClick={() => handleChangeTtsVolume(1.0)}
                  className={`px-3 py-2 text-xs font-display font-bold rounded-sm uppercase cursor-pointer ${
                    ttsVolume === 1.0
                      ? "bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/30"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  100%
                </button>
              </div>

              <button
                onClick={handleToggleSimplifiedNav}
                className="px-4 py-3 border-2 border-white bg-[#9D50FF] hover:bg-[#833ae0] text-white text-sm font-display font-bold uppercase tracking-wider transition-all flex items-center gap-2 min-h-[44px] cursor-pointer"
              >
                <Navigation size={16} className="rotate-45" />
                Switch back to standard view
              </button>
            </div>
          </div>

          {/* Welcome Block */}
          <div className="p-6 bg-[#16161A] border border-white/10 space-y-2">
            <h1 className="text-3xl font-display font-black tracking-tight uppercase text-white">
              Unity Path Assist Menu
            </h1>
            <p className="text-sm text-white/70 leading-relaxed font-semibold">
              Choose any of the large options below to get direct assistance,
              navigate the stadium, or chat with our AI guide.
            </p>
          </div>

          {/* Big Touch Targets */}
          <div className="space-y-4">
            {/* AI Assistant */}
            <button
              onClick={() => setActiveScreen("assistant")}
              className="w-full text-left p-6 border-2 border-[#9D50FF] hover:bg-[#9D50FF]/10 active:scale-95 transition-all flex items-center justify-between min-h-[60px] cursor-pointer bg-[#111114]"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">💬</span>
                <div>
                  <span className="block text-lg font-display font-bold uppercase text-white">
                    Talk to AI Assistant
                  </span>
                  <span className="text-xs text-white/60">
                    Ask questions using voice or text in multiple languages
                  </span>
                </div>
              </div>
              <span className="text-2xl text-[#9D50FF] font-bold">➔</span>
            </button>

            {/* Mobility Guide */}
            <button
              onClick={() => setActiveScreen("navigator")}
              className="w-full text-left p-6 border-2 border-[#00F0FF] hover:bg-[#00F0FF]/10 active:scale-95 transition-all flex items-center justify-between min-h-[60px] cursor-pointer bg-[#111114]"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">♿</span>
                <div>
                  <span className="block text-lg font-display font-bold uppercase text-white">
                    Step-Free Mobility Guide
                  </span>
                  <span className="text-xs text-white/60">
                    Find elevators, lifts, ramp entryways, and step-free
                    restrooms
                  </span>
                </div>
              </div>
              <span className="text-2xl text-[#00F0FF] font-bold">➔</span>
            </button>

            {/* Sensory Map */}
            <button
              onClick={() => setActiveScreen("sensory")}
              className="w-full text-left p-6 border-2 border-[#CCFF00] hover:bg-[#CCFF00]/10 active:scale-95 transition-all flex items-center justify-between min-h-[60px] cursor-pointer bg-[#111114]"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">👁️</span>
                <div>
                  <span className="block text-lg font-display font-bold uppercase text-white">
                    Sensory Guide & Quiet Rooms
                  </span>
                  <span className="text-xs text-white/60">
                    Locate calm areas, noise relief zones, and sensory kits
                  </span>
                </div>
              </div>
              <span className="text-2xl text-[#CCFF00] font-bold">➔</span>
            </button>

            {/* Live Marshal Request */}
            <div className="border border-amber-500 bg-amber-500/10 p-5 space-y-4">
              <div>
                <h3 className="text-lg font-display font-bold uppercase text-amber-400">
                  Need Immediate In-Person Help?
                </h3>
                <p className="text-xs text-white/80 leading-relaxed font-semibold mt-1">
                  Tap below to send stadium marshals directly to your location
                  with wheelchairs or guide assistance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => triggerAccessibilityDispatch("wheelchair")}
                  className="p-4 bg-[#111114] border-2 border-white/20 hover:bg-white/10 text-white font-bold text-sm uppercase flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
                >
                  ♿ Request Wheelchair Help
                </button>
                <button
                  onClick={() => triggerAccessibilityDispatch("volunteer")}
                  className="p-4 bg-[#111114] border-2 border-white/20 hover:bg-white/10 text-white font-bold text-sm uppercase flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
                >
                  🙋 Request Volunteer Dispatch
                </button>
                <button
                  onClick={() =>
                    triggerAccessibilityDispatch("guiding_companion")
                  }
                  className="p-4 bg-[#111114] border-2 border-white/20 hover:bg-white/10 text-white font-bold text-sm uppercase flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
                >
                  🤝 Request Guide Companion
                </button>
              </div>

              {requestSubmitted && (
                <div className="bg-[#CCFF00]/20 border border-[#CCFF00] text-[#CCFF00] p-3 text-center text-xs font-semibold uppercase">
                  ✅ Request received
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderTacticalFanAssistance = (className: string = "") => (
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
          onClick={() => triggerAccessibilityDispatch("volunteer")}
          className="w-full text-left p-3.5 rounded-sm border border-white/5 hover:border-[#9D50FF]/40 bg-[#111114] hover:bg-[#16161A] active:scale-95 transition-all flex items-center justify-between min-h-[44px] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🙋</span>
            <div className="text-left">
              <span className="block text-xs font-display font-bold uppercase text-white">
                Request Volunteer Dispatch
              </span>
              <span className="text-[10px] font-mono text-white/40 uppercase">
                General assistance in-person volunteer
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto text-white relative">
      <AnimatedBackground module="unitypath" />

      <div className="relative z-10 space-y-6">
        {/* Accessibility Quick-Actions Bar Overlay */}
        <div className="bg-[#f5f8f6] dark:bg-[#050f0c]/90 border border-[#d8e2dc] dark:border-[#1b2b21] p-4 rounded-sm flex flex-row flex-wrap items-center gap-4 md:gap-6 shadow-xl backdrop-blur-md">
          {/* ACCESSIBILITY: Label */}
          <span className="text-[#5e6d60] dark:text-[#7d8b7c] font-display font-bold tracking-widest text-xs uppercase select-none">
            Accessibility:
          </span>

          <div className="flex flex-wrap items-center gap-3">
            {/* High Contrast Toggle */}
            <button
              onClick={handleToggleHighContrast}
              className={`px-4 py-2 rounded-full text-xs font-display font-bold uppercase tracking-wider border transition-all flex items-center gap-2 min-h-[38px] cursor-pointer ${
                highContrast
                  ? "bg-slate-900 text-white border-slate-900 shadow-[0_0_8px_rgba(0,0,0,0.15)] dark:bg-white dark:text-black dark:border-white dark:shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                  : "bg-white dark:bg-transparent border-[#cdd6cf] dark:border-[#2b3a2e] text-slate-700 dark:text-slate-300 hover:border-[#9D50FF] dark:hover:border-[#CCFF00]/50 hover:text-[#9D50FF] dark:hover:text-white"
              }`}
            >
              <Contrast
                size={14}
                className={
                  highContrast
                    ? "text-white dark:text-black"
                    : "text-[#9D50FF] dark:text-[#CCFF00]"
                }
              />
              <span>High Contrast</span>
            </button>

            {/* Voice Readout Toggle */}
            <button
              onClick={() => handleChangeTtsVolume(ttsVolume > 0 ? 0 : 1.0)}
              className={`px-4 py-2 rounded-full text-xs font-display font-bold uppercase tracking-wider border transition-all flex items-center gap-2 min-h-[38px] cursor-pointer ${
                ttsVolume > 0
                  ? "bg-[#9D50FF]/10 border-[#9D50FF] text-[#9D50FF] shadow-[0_0_8px_rgba(157,80,255,0.15)] dark:bg-[#CCFF00]/10 dark:border-[#CCFF00] dark:text-[#CCFF00] dark:shadow-[0_0_8px_rgba(204,255,0,0.2)]"
                  : "bg-white dark:bg-transparent border-[#cdd6cf] dark:border-[#2b3a2e] text-slate-700 dark:text-slate-300 hover:border-[#9D50FF] dark:hover:border-[#CCFF00]/50 hover:text-[#9D50FF] dark:hover:text-white"
              }`}
            >
              <Volume2
                size={14}
                className={
                  ttsVolume > 0
                    ? "text-[#9D50FF] dark:text-[#CCFF00]"
                    : "text-slate-500 dark:text-slate-400"
                }
              />
              <span>Voice Readout</span>
            </button>

            {/* Accessible Routes Only Toggle */}
            <button
              onClick={handleToggleSimplifiedNav}
              className={`px-4 py-2 rounded-full text-xs font-display font-bold uppercase tracking-wider border transition-all flex items-center gap-2 min-h-[38px] cursor-pointer ${
                simplifiedNav
                  ? "bg-[#9D50FF]/10 border-[#9D50FF] text-[#9D50FF] shadow-[0_0_8px_rgba(157,80,255,0.15)] dark:bg-[#CCFF00]/10 dark:border-[#CCFF00] dark:text-[#CCFF00] dark:shadow-[0_0_8px_rgba(204,255,0,0.2)]"
                  : "bg-white dark:bg-transparent border-[#cdd6cf] dark:border-[#2b3a2e] text-slate-700 dark:text-slate-300 hover:border-[#9D50FF] dark:hover:border-[#CCFF00]/50 hover:text-[#9D50FF] dark:hover:text-white"
              }`}
            >
              <Accessibility
                size={14}
                className={
                  simplifiedNav
                    ? "text-[#9D50FF] dark:text-[#CCFF00]"
                    : "text-slate-500 dark:text-slate-400"
                }
              />
              <span>Accessible Routes Only</span>
            </button>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="rounded-sm p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-[#111114] dark:to-[#1a102f] text-slate-900 dark:text-white border border-[#9D50FF]/30 dark:border-[#9D50FF]/20 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 relative z-10">
            <Badge
              variant="ai"
              className="bg-[#9D50FF]/10 dark:bg-[#9D50FF]/20 text-[#9D50FF] dark:text-[#c084fc] border-transparent"
            >
              FIFA World Cup 2026
            </Badge>
            <h2 className="text-2xl font-display font-black tracking-tight uppercase">
              Welcome to Unity Path
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/60 font-mono uppercase tracking-wider">
              A highly inclusive sensory & accessibility guide • MetLife &
              Azteca
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2 rounded-sm backdrop-blur-sm relative z-10 shadow-sm dark:shadow-none">
            <Smile className="text-[#5A8F00] dark:text-[#CCFF00]" size={24} />
            <div className="text-left text-[11px]">
              <span className="block font-bold">Inclusion Support Active</span>
              <span className="text-slate-500 dark:text-white/60">
                Companion marshal crews standby
              </span>
            </div>
          </div>
        </div>

        {requestSubmitted && (
          <div className="bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-[#CCFF00] p-3 rounded-sm flex items-center gap-3 text-xs font-semibold uppercase">
            <ShieldCheck size={16} className="text-[#CCFF00]" />
            Request received
          </div>
        )}

        {activeSosIncident && (
          <Card className="border-2 border-red-500 bg-red-950/45 p-5 space-y-4 rounded-sm animate-pulse shadow-2xl relative overflow-hidden z-20">
            <div className="absolute top-0 right-0 p-1.5 bg-red-600 text-white text-[9px] font-mono uppercase tracking-widest font-black">
              Active Emergency SOS State
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <h3 className="text-base font-display font-black uppercase text-white tracking-wide">
                  Tactical SOS Alert Received
                </h3>
                <p className="text-xs text-red-200/60 uppercase font-mono">
                  Type: {activeSosIncident.title} | Sector:{" "}
                  {stadiumZones.find((z) => z.id === activeSosIncident.zone_id)
                    ?.name || "Specified Sector"}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-sm bg-black/40 border border-white/5 space-y-2">
              <p className="text-xs font-semibold text-white">
                Status Coordinates:
              </p>

              {activeSosIncident.title.toLowerCase().includes("fire") ||
              activeSosIncident.title.toLowerCase().includes("stampede") ? (
                <div className="space-y-3">
                  <p className="text-xs text-red-300 leading-relaxed font-medium">
                    ⚠️ EVACUATION MANDATE: A fire or stampede has been reported.
                    Guided evacuation routes have been generated. Follow glowing
                    concourse arrows to nearest safe egress portals immediately.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="solid"
                      onClick={() => setActiveScreen("navigator")}
                      className="!bg-[#CCFF00] text-black hover:!bg-[#b8e600] font-bold py-2 px-4 uppercase text-xs cursor-pointer"
                    >
                      🗺️ Show Evacuation Route
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await supabase
                          .from("incidents")
                          .update({ status: "resolved" })
                          .eq("id", activeSosIncident.id);
                        localStorage.removeItem("active_sos_id");
                        setActiveSosId(null);
                        setActiveSosIncident(null);
                      }}
                      className="border-white/20 text-white/60 hover:text-white hover:bg-white/10 text-xs py-2 px-3 cursor-pointer"
                    >
                      Cancel SOS
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSosIncident.status === "reported" ? (
                    <p className="text-xs text-amber-300 leading-relaxed animate-pulse font-medium">
                      ⏳ A{" "}
                      {activeSosIncident.title
                        .toLowerCase()
                        .includes("cardiac") ||
                      activeSosIncident.title
                        .toLowerCase()
                        .includes("medical") ||
                      activeSosIncident.title.toLowerCase().includes("trauma")
                        ? "First Responder"
                        : "Crowd Marshal"}{" "}
                      will be dispatched shortly to your location. Stay calm and
                      stand by at{" "}
                      {stadiumZones.find(
                        (z) => z.id === activeSosIncident.zone_id,
                      )?.name || "your location"}
                      .
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-emerald-300 leading-relaxed font-black">
                        ✓ DISPATCH SUCCESSFUL:
                      </p>
                      <p className="text-xs text-white leading-relaxed">
                        {activeSosIncident.assigned_role ||
                          (activeSosIncident.title
                            .toLowerCase()
                            .includes("cardiac") ||
                          activeSosIncident.title
                            .toLowerCase()
                            .includes("medical") ||
                          activeSosIncident.title
                            .toLowerCase()
                            .includes("trauma")
                            ? "First Responder"
                            : "Crowd Marshal")}{" "}
                        dispatched successfully to{" "}
                        {stadiumZones.find(
                          (z) => z.id === activeSosIncident.zone_id,
                        )?.name || "your location"}
                        .
                      </p>
                      {activeSosIncident.assigned_reason && (
                        <p className="text-[10px] text-white/50 font-mono italic">
                          Reason: {activeSosIncident.assigned_reason}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await supabase
                          .from("incidents")
                          .update({ status: "resolved" })
                          .eq("id", activeSosIncident.id);
                        localStorage.removeItem("active_sos_id");
                        setActiveSosId(null);
                        setActiveSosIncident(null);
                      }}
                      className="border-white/20 text-white/60 hover:text-white hover:bg-white/10 text-xs py-2 px-3 cursor-pointer"
                    >
                      Cancel SOS
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Main Grid: Matches + Quick Support Triggers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Columns (Matches & Stadium Features) */}
          <div className="md:col-span-2 flex flex-col h-full space-y-5">
            {/* Active Matches */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-white/40 tracking-wider">
                Upcoming Fixtures
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeMatches.map((m) => (
                  <Card
                    key={m.id}
                    module="unitypath"
                    className="!p-0 overflow-hidden bg-white dark:bg-[#16161a] hover:bg-slate-50/80 dark:hover:bg-white/[0.02] border border-slate-200 dark:border-white/5 transition-all hover:border-slate-300 dark:hover:border-white/10 flex items-stretch h-[120px]"
                  >
                    {/* Left Side: Teams & Round & Stadium info */}
                    <div className="flex-1 p-3.5 flex flex-col justify-between overflow-hidden">
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7D50FF] dark:text-slate-500">
                          {m.round}
                        </span>

                        <div className="space-y-1">
                          {/* Team A */}
                          <div className="flex items-center gap-2">
                            <span
                              className="text-base select-none leading-none"
                              role="img"
                              aria-label={m.teamA}
                            >
                              {m.flagA}
                            </span>
                            <span className="text-sm font-display font-semibold text-slate-800 dark:text-white truncate">
                              {m.teamA}
                            </span>
                          </div>

                          {/* Team B */}
                          <div className="flex items-center gap-2">
                            <span
                              className="text-base select-none leading-none"
                              role="img"
                              aria-label={m.teamB}
                            >
                              {m.flagB}
                            </span>
                            <span className="text-sm font-display font-semibold text-slate-800 dark:text-white truncate">
                              {m.teamB}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider Line */}
                    <div className="w-[1px] bg-slate-200 dark:bg-white/5 my-3" />

                    {/* Right Side: Date, Time & Action Button */}
                    <button
                      onClick={() => setActiveScreen("assistant")}
                      className="w-24 flex-shrink-0 flex flex-col items-center justify-center p-2 group/match cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.02] transition-colors"
                      title="Enter Assist Companion for this match"
                    >
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-white/70 group-hover/match:text-[#9D50FF] dark:group-hover/match:text-[#CCFF00] transition-colors text-center leading-tight">
                        {m.date}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 mt-0.5 group-hover/match:text-[#9D50FF]/70 dark:group-hover/match:text-[#CCFF00]/70 transition-colors">
                        {m.time}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 mt-2 border border-slate-300 dark:border-slate-700/50 rounded px-1.5 py-0.5 group-hover/match:bg-[#9D50FF]/10 dark:group-hover/match:bg-[#CCFF00]/10 group-hover/match:text-[#9D50FF] dark:group-hover/match:text-[#CCFF00] group-hover/match:border-[#9D50FF]/30 dark:group-hover/match:border-[#CCFF00]/30 transition-all">
                        Assist
                      </span>
                    </button>
                  </Card>
                ))}
              </div>
            </div>

            {/* Accessible Infrastructure Quick guides */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-white/40 tracking-wider">
                Stadium Accessibility Infrastructure
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-sm border border-white/5 bg-[#16161A] flex flex-col gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#9D50FF]">
                    <Navigation size={16} />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">
                      Step-Free Access
                    </h4>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Elevators situating at Gate A and D feature Braille
                      buttons, automatic leveling, and step-free floor layouts.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-sm border border-white/5 bg-[#16161A] flex flex-col gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#9D50FF]">
                    <Eye size={16} />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">
                      Sensory Rooms
                    </h4>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Quiet Rooms equipped with noise reduction, tactile panels,
                      and dimmable LEDs. Accessible freely to all neurodivergent
                      fans.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-sm border border-white/5 bg-[#16161A] flex flex-col gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#9D50FF]">
                    <Heart size={16} />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">
                      Support kits
                    </h4>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Sensory kits containing noise-canceling earmuffs, fidget
                      toys, and feeling meters are obtainable free at any
                      information rail.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {renderTacticalFanAssistance(
              "hidden md:block lg:hidden mt-4 md:w-[609px] lg:w-full",
            )}

            {/* Sensory Advisory Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-auto md:w-[608px] lg:w-full">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400">
                  <span className="text-lg">⚠️</span>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
                    Sensory Advisory active
                  </h4>
                </div>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Main seating sections expect high-volume pyrotechnics and
                  strobe displays at today's USA kickoff. Neurodivergent fans
                  are advised to visit Quiet Room 202 or seek assistance to
                  obtain protective earmuffs.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button
                  variant="outline"
                  module="unitypath"
                  onClick={() => triggerAccessibilityDispatch("sensory_kit")}
                  className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 text-[11px] py-1 px-3"
                >
                  Request Sensory Kit
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Instant Volunteer Request (AAA 44px tap targets) */}
          <div className="space-y-4">
            <Card className="border-2 border-red-500/40 bg-red-950/20 p-4 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping m-3" />
              <div className="flex items-center gap-2 text-red-400">
                <span className="text-xl">🚨</span>
                <h3 className="text-xs font-display font-bold uppercase tracking-wider">
                  Emergency SOS Trigger
                </h3>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Experiencing a critical fire, medical, stampede, or missing
                child situation? Send an SOS signal directly to Operations
                Control.
              </p>
              <Button
                variant="solid"
                onClick={() => setIsSosModalOpen(true)}
                className="w-full !bg-red-600 hover:!bg-red-500 text-white font-bold py-2 px-4 uppercase text-xs cursor-pointer min-h-[44px]"
              >
                🔴 Trigger SOS Alert
              </Button>
            </Card>

            {renderTacticalFanAssistance("block md:hidden lg:block")}
          </div>
        </div>

        {/* Core Features */}
        <div className="space-y-3 pt-6 border-t border-white/5">
          <h3 className="text-xs font-mono font-bold uppercase text-white/40 tracking-wider">
            Core Features
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="p-4 rounded-sm border border-white/5 bg-[#16161A] space-y-2 hover:border-[#9D50FF]/20 transition-all duration-300">
              <div className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#9D50FF]">
                <Sparkles size={16} />
              </div>
              <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">
                Generative AI Platform
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Speak with our helpful AI assistant for instant guidance on
                stadium navigation, event scheduling, and sensory amenities in
                your preferred language.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-4 rounded-sm border border-white/5 bg-[#16161A] space-y-2 hover:border-[#00F0FF]/20 transition-all duration-300">
              <div className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#00F0FF]">
                <Navigation size={16} className="rotate-45" />
              </div>
              <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">
                Smart 3D Navigation
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Discover step-free routes, find elevator access points, and plan
                optimal entryways tailored for wheelchairs, strollers, or
                sensory ease.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-4 rounded-sm border border-white/5 bg-[#16161A] space-y-2 hover:border-amber-500/20 transition-all duration-300">
              <div className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-amber-500">
                <Shield size={16} />
              </div>
              <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">
                Incident Response AI
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Stay updated with real-time crowd safety notifications, gate
                load statuses, and guided routes for standard or priority
                evacuations.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-4 rounded-sm border border-white/5 bg-[#16161A] space-y-2 hover:border-[#9D50FF]/20 transition-all duration-300">
              <div className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#9D50FF]">
                <Globe size={16} />
              </div>
              <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">
                Multilingual Translator
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Access voice-to-text transcriptions and audio translations in
                over 10 languages to ensure matchday announcements are clear for
                everyone.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-4 rounded-sm border border-white/5 bg-[#16161A] space-y-2 hover:border-emerald-400/20 transition-all duration-300">
              <div className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                <HeartHandshake size={16} />
              </div>
              <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">
                Accessibility AI
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Empower your visit with screen-reader friendly layouts, visual
                high-contrast guides, and immediate connection to in-person
                marshal support.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-4 rounded-sm border border-white/5 bg-[#16161A] space-y-2 hover:border-[#CCFF00]/20 transition-all duration-300">
              <div className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#CCFF00]">
                <Radio size={16} />
              </div>
              <h4 className="text-xs font-display font-black uppercase tracking-wider text-white">
                NASA Ops Dashboard
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Enable operations staff with live telemetry, sensor monitoring,
                and incident reporting to ensure a safe, inclusive environment.
              </p>
            </div>
          </div>
        </div>

        <Modal
          isOpen={isSosModalOpen}
          onClose={() => setIsSosModalOpen(false)}
          title="🔴 Tactical Emergency SOS"
        >
          <div className="space-y-4 text-white">
            <p className="text-xs text-white/60">
              Please provide details of the active emergency. Operations Control
              and AI dispatch will receive this signal instantly.
            </p>

            <div>
              <label className="block text-[10px] font-mono uppercase text-white/40 mb-1 tracking-wider">
                Emergency Type
              </label>
              <select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                className="w-full bg-[#16161A] border border-white/10 text-xs text-white rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
              >
                <option value="Local Fire Alert">🔥 Local Fire Alert</option>
                <option value="Crowd Congestion (Stampede Hazard)">
                  🏃 Crowd Congestion (Stampede Hazard)
                </option>
                <option value="Cardiac/Trauma Incident">
                  🩺 Cardiac/Trauma Incident
                </option>
                <option value="Amber Alert / Missing Child">
                  👧 Amber Alert / Missing Child
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-white/40 mb-1 tracking-wider">
                Location / Sector
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full bg-[#16161A] border border-white/10 text-xs text-white rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
              >
                {stadiumZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-white/40 mb-1 tracking-wider">
                Additional Description / Details
              </label>
              <textarea
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="e.g. Smoke visible at second landing escalators, need assistance..."
                rows={3}
                className="w-full bg-[#16161A] border border-white/10 text-xs text-white rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
              />
            </div>

            <Button
              variant="solid"
              onClick={handleSubmitSos}
              className="w-full !bg-red-600 hover:!bg-red-500 text-white font-bold py-3 uppercase tracking-wider text-xs cursor-pointer min-h-[44px]"
            >
              🔴 Send Emergency SOS
            </Button>
          </div>
        </Modal>

        {/* Floating Toast Notification */}
        {requestSubmitted && (
          <div className="fixed bottom-6 right-6 z-50 bg-black/95 border-2 border-[#CCFF00] text-[#CCFF00] px-6 py-4 rounded-sm shadow-2xl flex items-center gap-3 animate-bounce">
            <ShieldCheck size={20} className="text-[#CCFF00] animate-pulse" />
            <div className="text-left">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/55">
                Status Update
              </span>
              <span className="block text-sm font-display font-black uppercase tracking-tight">
                Request received
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
