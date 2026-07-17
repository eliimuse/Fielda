import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, MessageSquare, Users, Map, 
  Home, HelpCircle, Eye, Navigation, 
  Menu, X, LogIn, LogOut, User, RefreshCw, Layers, Globe,
  Clock, Wind, Sun, Moon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button, Badge, ThemeModule, Modal } from './SharedPrimitives';
import { Profile, UserRole } from '../types';

interface NavShellProps {
  currentModule: ThemeModule;
  setModule: (mod: ThemeModule) => void;
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  children: React.ReactNode;
  metrics?: { visitors: number, waitTime: number, aqi: number, temp: number };
}

export const NavShell: React.FC<NavShellProps> = ({
  currentModule,
  setModule,
  activeScreen,
  setActiveScreen,
  children,
  metrics
}) => {
  const [profile, setProfile] = useState<Profile | null>(supabase.auth.getProfile());

  const visitors = metrics?.visitors || 42389;
  const waitTime = metrics?.waitTime || 11;
  const aqi = metrics?.aqi || 34;
  const temp = metrics?.temp || 75;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<UserRole>('organizer');
  const [authIsSignUp, setAuthIsSignUp] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Global theme state - Default to Dark Mode for Command Center
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === null ? true : saved === 'dark';
  });

  // Sync theme class with html/body
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // Sync auth state
  useEffect(() => {
    const sub = supabase.subscribe('auth', () => {
      setProfile(supabase.auth.getProfile());
    });
    return () => sub.unsubscribe();
  }, []);

  // Sync Google Translate script on Mount
  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,es,fr,de,ja,pt,ar,zh,it,ko,ru,hi',
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          },
          'google_translate_element'
        );
      };
    }
  }, []);

  // Sync route safety on profile role change
  useEffect(() => {
    if (profile?.role === 'fan' && currentModule === 'operationsIntelligence') {
      // Force change to Fan Experience if they are logged in as fan
      setModule('unitypath');
      setActiveScreen('matchday');
    }
  }, [profile, currentModule]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authIsSignUp) {
      await supabase.auth.signUp({
        email: authEmail || `${authName.toLowerCase().replace(/\s+/g, '')}@fielda.org`,
        options: {
          data: {
            full_name: authName || 'Guest User',
            role: authRole,
            language_pref: 'en'
          }
        }
      });
    } else {
      await supabase.auth.signInWithPassword({
        email: authEmail || (authRole === 'organizer' ? 'org@fielda.org' : authRole === 'staff' ? 'staff@fielda.org' : 'fan@fielda.org')
      });
    }
    setIsAuthModalOpen(false);
    setAuthEmail('');
    setAuthName('');
    setShowProfileDropdown(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('fielda_current_module');
    localStorage.removeItem('fielda_active_screen');
    setShowProfileDropdown(false);
    // Refresh to update state
    window.location.reload();
  };

  const handleQuickRoleSwitch = async (role: UserRole) => {
    const email = role === 'organizer' ? 'org@fielda.org' : role === 'staff' ? 'staff@fielda.org' : 'fan@fielda.org';
    const name = role === 'organizer' ? 'Dev Organizer' : role === 'staff' ? 'Dev Staff Member' : 'Dev Fan Guest';
    
    // Simulate auth sign up or sign in
    const res = await supabase.auth.signInWithPassword({ email });
    if (!res.data.user) {
      await supabase.auth.signUp({
        email,
        options: {
          data: {
            full_name: name,
            role,
            language_pref: 'en'
          }
        }
      });
    }
    
    const activeProf = supabase.auth.getProfile();
    setProfile(activeProf);

    // Route safety check immediately
    if (role === 'fan') {
      setModule('unitypath');
      setActiveScreen('matchday');
      localStorage.setItem('fielda_current_module', 'unitypath');
      localStorage.setItem('fielda_active_screen', 'matchday');
    } else {
      setModule('operationsIntelligence');
      setActiveScreen('command');
      localStorage.setItem('fielda_current_module', 'operationsIntelligence');
      localStorage.setItem('fielda_active_screen', 'command');
    }

    setShowProfileDropdown(false);
    
    // Force a location reload to cleanly sync state and avoid any local cache issues
    window.location.reload();
  };

  const isOps = currentModule === 'operationsIntelligence';

  // Navigation Items
  const opsNavItems = [
    { id: 'command', label: 'Command Center', icon: ShieldAlert },
    { id: 'comms', label: 'Comms & Translation', icon: MessageSquare },
    { id: 'copilot', label: 'Deployment Co-pilot', icon: Users },
    { id: 'map', label: 'Spatial Map', icon: Map },
    { id: 'admin', label: 'Data Console', icon: Layers } // Gated to organizer/staff
  ];

  const fanNavItems = [
    { id: 'matchday', label: 'Matchday Hub', icon: Home },
    { id: 'assistant', label: 'AI Assistant', icon: HelpCircle },
    { id: 'sensory', label: 'Sensory Map', icon: Eye },
    { id: 'navigator', label: 'Mobility Nav', icon: Navigation }
  ];

  const currentNavItems = isOps ? opsNavItems : fanNavItems;

  return (
    <div id="fielda-shell" className={`h-[100dvh] overflow-hidden flex flex-col md:flex-row font-sans transition-colors duration-300 ${
      isDark ? 'bg-[#0A0A0B] text-white dark' : 'bg-[#F3F4F6] text-slate-900 light'
    }`}>
      
      {/* LEFT SIDEBAR (Desktop >= 768px, 80px wide) */}
      <aside className={`hidden md:flex flex-col items-center justify-start gap-10 py-6 w-20 flex-shrink-0 border-r z-20 transition-all duration-300 ${
        isDark 
          ? 'border-white/10 bg-[#111114] shadow-[2px_0_10px_rgba(0,0,0,0.7)]' 
          : 'border-slate-200 bg-white shadow-[2px_0_10px_rgba(0,0,0,0.05)]'
      }`}>
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 flex items-center justify-center select-none relative group cursor-pointer" title="Fielda Hub">
            <img 
              id="fielda-brand-logo-desktop"
              src="/logo.png" 
              alt="Fielda" 
              className="w-full h-full object-contain rounded-md transition-transform duration-300 group-hover:scale-110" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src.includes('/logo.png')) {
                  img.src = '/logo.svg';
                } else if (img.src.includes('/logo.svg')) {
                  img.src = '/assets/logo.png';
                } else {
                  // Fallback: hide the broken image icon and reveal the styled fallback div
                  img.style.display = 'none';
                  const fallback = document.getElementById('fielda-logo-fallback-desktop');
                  if (fallback) {
                    fallback.classList.remove('hidden');
                    fallback.classList.add('flex');
                  }
                }
              }}
            />
            {/* Styled Fallback element if image is not found/loaded yet */}
            <div 
              id="fielda-logo-fallback-desktop"
              className="hidden w-full h-full items-center justify-center bg-gradient-to-tr from-[#9D50FF] to-[#CCFF00] rounded-lg text-black font-black text-xl select-none"
            >
              F
            </div>
          </div>
          <span className={`text-[10px] font-display uppercase tracking-widest font-bold ${
            isDark ? 'text-white/50' : 'text-slate-500'
          }`}>Fielda</span>
        </div>

        {/* Sidebar Nav Icons */}
        <nav className="flex flex-col gap-5">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            
            // Gating: Hide Data Console for fan role
            if (item.id === 'admin' && profile?.role === 'fan') return null;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveScreen(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-12 h-12 rounded-sm flex items-center justify-center transition-all cursor-pointer relative group min-h-[44px] border ${
                  isActive 
                    ? isOps 
                      ? isDark 
                        ? 'bg-white/5 border-white/10 text-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.15)]' 
                        : 'bg-slate-100 border-slate-300 text-slate-900 shadow-[0_0_10px_rgba(0,0,0,0.05)]'
                      : isDark 
                        ? 'bg-white/5 border-white/10 text-[#9D50FF] shadow-[0_0_10px_rgba(157,80,255,0.15)]' 
                        : 'bg-slate-100 border-slate-300 text-[#9D50FF] shadow-[0_0_10px_rgba(157,80,255,0.05)]'
                    : isDark 
                      ? 'border-transparent text-white/40 hover:text-white hover:bg-white/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title={item.label}
              >
                <Icon size={20} />
                
                {/* Tooltip */}
                <div className={`absolute left-16 px-2.5 py-1.5 rounded-sm text-[11px] font-display font-semibold tracking-wide uppercase whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 shadow-xl border ${
                  isDark 
                    ? 'bg-[#111114] text-white border-white/10' 
                    : 'bg-white text-slate-800 border-slate-200'
                }`}>
                  {item.label}
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* TOP HEADER & MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        
        {/* TOP HEADER */}
        <header className={`h-16 flex-shrink-0 px-4 md:px-6 flex items-center justify-between border-b z-40 transition-colors duration-300 ${
          isDark 
            ? 'border-white/10 bg-[#0A0A0B] text-white' 
            : 'border-slate-200 bg-white text-slate-800'
        }`}>
          {/* Mobile Menu & Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded min-h-[44px] min-w-[44px] cursor-pointer ${
                isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Mobile Brand Logo */}
              <div className="w-8 h-8 flex items-center justify-center select-none relative md:hidden">
                <img 
                  id="fielda-brand-logo-mobile"
                  src="/logo.png" 
                  alt="Fielda" 
                  className="w-full h-full object-contain rounded-md" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src.includes('/logo.png')) {
                      img.src = '/logo.svg';
                    } else if (img.src.includes('/logo.svg')) {
                      img.src = '/assets/logo.png';
                    } else {
                      img.style.display = 'none';
                      const fallback = document.getElementById('fielda-logo-fallback-mobile');
                      if (fallback) {
                        fallback.classList.remove('hidden');
                        fallback.classList.add('flex');
                      }
                    }
                  }}
                />
                <div 
                  id="fielda-logo-fallback-mobile"
                  className="hidden w-full h-full items-center justify-center bg-gradient-to-tr from-[#9D50FF] to-[#CCFF00] rounded-md text-black font-black text-xs select-none"
                >
                  F
                </div>
              </div>
              <h1 className="text-base md:text-lg font-bold tracking-tight uppercase flex items-center gap-2">
                <span className={
                  isOps 
                    ? isDark ? 'text-[#CCFF00]' : 'text-[#5A8F00] font-black' 
                    : 'text-[#9D50FF]'
                }>{isOps ? "Operations" : "Unity Path"}</span>
              </h1>
            </div>
          </div>

          {/* Real-time Stadium Metrics (Fluctuating) */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 text-xs font-mono">
            {/* Visitors */}
            <div className={`flex items-center gap-1.5 border rounded-lg py-1.5 px-3 transition-colors ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={isDark ? "text-white/70" : "text-slate-500"}>Visitors:</span>
              <span className={`font-bold tracking-tight ${isDark ? 'text-[#00F0FF]' : 'text-sky-600'}`}>{visitors.toLocaleString()}</span>
            </div>
            
            {/* Wait Time */}
            <div className={`flex items-center gap-1.5 border rounded-lg py-1.5 px-3 transition-colors ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={isDark ? "text-white/70" : "text-slate-500"}>Wait Time:</span>
              <span className={`font-bold tracking-tight ${isDark ? 'text-[#00F0FF]' : 'text-sky-600'}`}>{waitTime} min</span>
            </div>
            
            {/* Air Quality */}
            <div className={`flex items-center gap-1.5 border rounded-lg py-1.5 px-3 transition-colors ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <Wind size={13} className="text-emerald-400 dark:text-emerald-400 text-emerald-600" />
              <span className={isDark ? "text-white/70" : "text-slate-500"}>Air:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{aqi < 50 ? 'Good' : 'Moderate'}</span>
            </div>
            
            {/* Weather */}
            <div className={`flex items-center gap-1.5 border rounded-lg py-1.5 px-3 transition-colors ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <Sun size={13} className="text-amber-300 dark:text-amber-300 text-amber-500" />
              <span className={isDark ? "text-white/70" : "text-slate-500"}>Weather:</span>
              <span className="font-bold text-amber-600 dark:text-amber-500 tracking-tight">{temp}°F</span>
            </div>
          </div>
          
          {/* Hidden Google Translate element to prevent initialization script errors */}
          <div style={{ display: 'none' }} id="google_translate_element" />

          {/* User Profile & Quick Login */}
          <div className="flex items-center gap-3 relative">
            {/* Global Theme Toggle Button */}
            <button
              id="global-theme-toggle"
              onClick={toggleTheme}
              className={`p-2 rounded-full border transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                isDark 
                  ? 'bg-white/5 border-white/10 text-[#CCFF00] hover:bg-white/10 hover:border-[#CCFF00]/40' 
                  : 'bg-slate-100 border-slate-200 text-[#9D50FF] hover:bg-slate-200 hover:border-[#9D50FF]/40'
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {profile ? (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end text-right hidden sm:flex">
                  <span className="text-xs font-semibold">{profile.full_name}</span>
                  <div className="flex gap-1.5 items-center">
                    <span className={`text-[9px] font-mono opacity-60 capitalize ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Role:</span>
                    <Badge variant={profile.role === 'organizer' ? 'success' : profile.role === 'staff' ? 'info' : 'warning'} module={currentModule}>
                      {profile.role}
                    </Badge>
                  </div>
                </div>
                
                {/* Avatar trigger */}
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-xs cursor-pointer border min-h-[44px] min-w-[44px] transition-colors ${
                    isOps 
                      ? isDark
                        ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-white/15 hover:border-[#CCFF00]' 
                        : 'bg-[#5A8F00]/10 text-[#5A8F00] border-[#5A8F00]/20 hover:border-[#5A8F00]'
                      : 'bg-[#9D50FF]/15 text-[#c084fc] border-white/15 hover:border-[#9D50FF]'
                  }`}
                >
                  {profile.full_name.substring(0, 2).toUpperCase()}
                </button>
                
                {/* Dropdown menu */}
                {showProfileDropdown && (
                  <div className={`absolute right-0 top-12 w-64 p-3 rounded-sm shadow-2xl border z-50 transition-colors ${
                    isDark 
                      ? 'bg-[#111114] border-white/10 text-white' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <div className={`border-b pb-2 mb-2 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                      <p className={`text-xs font-bold font-display uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Active Credentials</p>
                      <p className="text-sm font-semibold truncate mt-1">{profile.full_name}</p>
                      <p className={`text-[10px] font-mono truncate ${isDark ? 'text-white/40' : 'text-slate-400'}`}>FIFA ID: WorldCup2026-F-{profile.id}</p>
                    </div>

                    <div className="mb-3">
                      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Quick Swapper</p>
                      <div className="grid grid-cols-2 gap-1">
                        <button 
                          onClick={() => handleQuickRoleSwitch('organizer')} 
                          className={`px-1 py-1 rounded hover:bg-[#CCFF00]/20 text-[10px] font-mono uppercase font-bold text-center border cursor-pointer ${
                            isDark 
                              ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/20' 
                              : 'bg-[#5A8F00]/10 text-[#5A8F00] border-[#5A8F00]/20'
                          }`}
                        >
                          Organizer
                        </button>
                        <button 
                          onClick={() => handleQuickRoleSwitch('fan')} 
                          className="px-1 py-1 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[10px] font-mono uppercase font-bold text-center border border-amber-500/20 cursor-pointer"
                        >
                          Fan
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium font-display text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                    >
                      <LogOut size={14} />
                      Log Out Profile
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button 
                variant="solid" 
                module={currentModule} 
                onClick={() => {
                  setAuthIsSignUp(false);
                  setIsAuthModalOpen(true);
                }}
              >
                <LogIn size={14} />
                Access Portal
              </Button>
            )}
          </div>
        </header>

        {/* MOBILE OVERLAY NAVIGATION */}
        {isMobileMenuOpen && (
          <div className={`md:hidden fixed inset-0 top-16 z-30 flex flex-col p-4 border-b transition-colors duration-300 ${
            isDark 
              ? 'bg-[#0A0A0B]/95 border-white/10 text-white' 
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}>
            <p className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Navigation Options</p>
            <nav className="flex flex-col gap-2 mb-4">
              {currentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeScreen === item.id;
                
                if (item.id === 'admin' && profile?.role === 'fan') return null;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveScreen(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-sm text-sm font-display font-medium uppercase tracking-wider cursor-pointer border ${
                      isActive 
                        ? isOps 
                          ? 'bg-white/5 border-white/10 text-[#CCFF00] font-bold shadow-sm' 
                          : 'bg-white/5 border-white/10 text-[#9D50FF] font-bold shadow-sm'
                        : isDark
                          ? 'text-white/60 hover:bg-white/5 border-transparent'
                          : 'text-slate-600 hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className={`mt-auto border-t pt-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {/* Mobile Appearance Theme Toggle */}
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Appearance</span>
                <button
                  id="mobile-theme-toggle"
                  onClick={toggleTheme}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-display font-bold uppercase tracking-wider cursor-pointer ${
                    isDark 
                      ? 'bg-white/5 border-white/10 text-[#CCFF00]' 
                      : 'bg-slate-100 border-slate-200 text-[#9D50FF]'
                  }`}
                >
                  {isDark ? <Sun size={14} /> : <Moon size={14} />}
                  {isDark ? "Light Mode" : "Dark Mode"}
                </button>
              </div>

              <p className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Switch Workspace Module</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (profile?.role === 'fan') {
                      alert('Access Gated: Please switch to Staff or Organizer profile to toggle.');
                      return;
                    }
                    setModule('operationsIntelligence');
                    setActiveScreen('command');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-sm text-xs font-display tracking-wider uppercase text-center cursor-pointer border bg-[#16161A] ${
                    isOps ? 'text-[#CCFF00] border-white/10' : 'text-white/40 border-transparent'
                  }`}
                >
                  Ops Center
                </button>
                <button
                  onClick={() => {
                    setModule('unitypath');
                    setActiveScreen('matchday');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-sm text-xs font-display tracking-wider uppercase text-center cursor-pointer border bg-[#16161A] ${
                    !isOps ? 'text-[#9D50FF] border-white/10' : 'text-white/40 border-transparent'
                  }`}
                >
                  Fan Experience
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE MODULE CONTAINER / MAIN VIEWSTAGE */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>

      {/* ACCESS & AUTHENTICATION MODAL */}
      <Modal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        title={authIsSignUp ? "Fielda Registration" : "Fielda Security Gate"}
        module={currentModule}
      >
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-gray-400 mb-1.5">User Role Privilege</label>
            <div className="grid grid-cols-2 gap-2">
              {(['fan', 'organizer'] as UserRole[]).map((roleOption) => (
                <button
                  key={roleOption}
                  type="button"
                  onClick={() => setAuthRole(roleOption)}
                  className={`py-2 rounded text-xs font-display tracking-wider uppercase font-bold text-center border cursor-pointer ${
                    authRole === roleOption
                      ? isOps
                        ? 'bg-slate-900 border-action-lime text-action-lime'
                        : 'bg-slate-900 border-slate-900 text-white'
                      : isOps
                        ? 'bg-slate-950 border-slate-800 text-gray-400 hover:text-white'
                        : 'bg-stone-50 border-stone-200 text-slate-600 hover:bg-stone-100'
                  }`}
                >
                  {roleOption === 'fan' ? 'Fan Guest' : 'Organizer'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 font-sans mt-1.5 italic">
              {authRole === 'fan' 
                ? 'Allows accessing the inclusive Matchday Hub, AI Accessibility Chat, and Sensory Nav. Operations screens will be locked.' 
                : 'Grants access to full Operations Intelligence Command Center, real-time dispatch, and database simulation features.'}
            </p>
          </div>

          {authIsSignUp && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-gray-400 mb-1">Full Name</label>
              <input 
                type="text" 
                required
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className={`w-full p-2.5 rounded text-sm focus:outline-none focus:ring-1 border ${
                  isOps 
                    ? 'bg-slate-900 border-slate-800 text-white focus:ring-action-lime' 
                    : 'bg-stone-50 border-stone-200 text-slate-900 focus:ring-slate-900'
                }`}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-gray-400 mb-1">Email Coordinates</label>
            <input 
              type="email" 
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder={authIsSignUp ? "yourname@fielda.org" : `Try logging in as: ${authRole === 'organizer' ? 'org@fielda.org' : 'fan@fielda.org'}`}
              className={`w-full p-2.5 rounded text-sm focus:outline-none focus:ring-1 border ${
                isOps 
                  ? 'bg-slate-900 border-slate-800 text-white focus:ring-action-lime' 
                  : 'bg-stone-50 border-stone-200 text-slate-900 focus:ring-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-gray-400 mb-1">Security Token (Password)</label>
            <input 
              type="password" 
              defaultValue="password123"
              placeholder="••••••••"
              className={`w-full p-2.5 rounded text-sm focus:outline-none focus:ring-1 border ${
                isOps 
                  ? 'bg-slate-900 border-slate-800 text-white focus:ring-action-lime' 
                  : 'bg-stone-50 border-stone-200 text-slate-900 focus:ring-slate-900'
              }`}
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button type="submit" variant="solid" module={currentModule} className="w-full">
              {authIsSignUp ? 'Create Credentials' : 'Match & Authenticate'}
            </Button>
            
            <button
              type="button"
              onClick={() => setAuthIsSignUp(!authIsSignUp)}
              className="text-center text-[11px] underline font-display tracking-wide uppercase opacity-75 hover:opacity-100 cursor-pointer"
            >
              {authIsSignUp ? 'Already registered? Log in' : 'First time? Create a test account'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
