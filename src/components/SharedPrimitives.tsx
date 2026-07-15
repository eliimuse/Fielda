import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Design Token constants (matched with CSS)
export type ThemeModule = 'operationsIntelligence' | 'unitypath';

// 1. Unified Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'ghost' | 'outline' | 'danger';
  module?: ThemeModule;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'solid',
  module = 'operationsIntelligence',
  className = '',
  children,
  ...props
}) => {
  const isOps = module === 'operationsIntelligence';
  
  // Base classes for 44px touch compliance
  const baseClass = 'px-4 py-2.5 rounded text-xs font-display font-semibold uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer select-none min-h-[44px]';
  
  let themeClass = '';
  
  if (variant === 'solid') {
    if (isOps) {
      themeClass = 'bg-[#CCFF00] text-black hover:brightness-110 shadow-[0_0_15px_rgba(204,255,0,0.25)] border border-transparent';
    } else {
      themeClass = 'bg-[#9D50FF] text-white hover:brightness-110 shadow-[0_0_15px_rgba(157,80,255,0.25)] border border-transparent';
    }
  } else if (variant === 'ghost') {
    if (isOps) {
      themeClass = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white';
    } else {
      themeClass = 'text-slate-600 hover:bg-slate-100 hover:text-[#9D50FF] dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-[#9D50FF]';
    }
  } else if (variant === 'outline') {
    if (isOps) {
      themeClass = 'border border-slate-200 text-slate-700 hover:border-[#CCFF00] hover:text-[#CCFF00] hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:border-[#CCFF00] dark:hover:text-[#CCFF00] dark:hover:bg-white/5';
    } else {
      themeClass = 'border border-slate-200 text-slate-700 hover:border-[#9D50FF] hover:text-[#9D50FF] hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:border-[#9D50FF] dark:hover:text-[#9D50FF] dark:hover:bg-white/5';
    }
  } else if (variant === 'danger') {
    themeClass = 'bg-[#FF2A2A] text-white hover:bg-red-700 shadow-[0_0_12px_rgba(255,42,42,0.3)] border border-transparent';
  }

  return (
    <button className={`${baseClass} ${themeClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

// 2. Badge/Tag Component
interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'ai';
  module?: ThemeModule;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  module = 'operationsIntelligence',
  children,
  className = ''
}) => {
  const isOps = module === 'operationsIntelligence';
  
  const baseClass = 'px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border';
  
  let styles = '';
  
  if (variant === 'danger') {
    styles = 'bg-[#FF2A2A]/10 text-[#FF2A2A] border-[#FF2A2A]/30';
  } else if (variant === 'warning') {
    styles = 'bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20';
  } else if (variant === 'success') {
    styles = 'bg-[#CCFF00]/10 text-[#5A8F00] dark:text-[#CCFF00] border-[#CCFF00]/20';
  } else if (variant === 'ai') {
    styles = 'bg-[#9D50FF]/15 text-[#9D50FF] dark:text-[#c084fc] border-[#9D50FF]/30 font-bold shadow-[0_0_8px_rgba(157,80,255,0.2)]';
  } else {
    // Info / default
    styles = isOps 
      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' 
      : 'bg-[#9D50FF]/10 text-purple-600 dark:text-purple-300 border-[#9D50FF]/20';
  }

  return (
    <span className={`${baseClass} ${styles} ${className}`}>
      {variant === 'ai' && <span className="w-1.5 h-1.5 rounded-full bg-[#9D50FF] animate-pulse" />}
      {children}
    </span>
  );
};

// 3. Card Component
interface CardProps {
  module?: ThemeModule;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  id?: string;
}

export const Card: React.FC<CardProps> = ({
  module = 'operationsIntelligence',
  children,
  className = '',
  onClick,
  hoverable = false,
  id
}) => {
  const isOps = module === 'operationsIntelligence';
  
  const baseClass = 'bg-white border border-slate-200 text-slate-800 dark:bg-[#16161A] dark:border-white/5 dark:text-white rounded-sm p-5 shadow-lg transition-colors duration-300';
    
  const interactiveClass = onClick || hoverable
    ? isOps 
      ? 'cursor-pointer hover:border-[#CCFF00]/40 dark:hover:border-[#CCFF00]/40 hover:shadow-slate-200 dark:hover:shadow-black/60 transition-all duration-200'
      : 'cursor-pointer hover:border-[#9D50FF]/40 dark:hover:border-[#9D50FF]/40 hover:shadow-slate-200 dark:hover:shadow-black/60 transition-all duration-200'
    : '';

  return (
    <div 
      id={id}
      onClick={onClick} 
      className={`${baseClass} ${interactiveClass} ${className}`}
    >
      {children}
    </div>
  );
};

// 4. Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  module?: ThemeModule;
  children: React.ReactNode;
  id?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  module = 'operationsIntelligence',
  children,
  id
}) => {
  const isOps = module === 'operationsIntelligence';

  return (
    <AnimatePresence>
      {isOpen && (
        <div id={id} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-lg overflow-hidden rounded-sm shadow-2xl z-10 border bg-white border-slate-200 text-slate-800 dark:bg-[#111114] dark:border-white/10 dark:text-white transition-colors duration-300"
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-[#16161A]/50">
              <h3 className="font-display font-bold text-sm tracking-wide uppercase">{title}</h3>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// 5. Toggle Component
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  module?: ThemeModule;
  id?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  module = 'operationsIntelligence',
  id
}) => {
  const isOps = module === 'operationsIntelligence';

  return (
    <label id={id} className="inline-flex items-center gap-3 cursor-pointer select-none">
      {label && (
        <span className="text-xs font-semibold font-sans text-slate-700 dark:text-white/80">
          {label}
        </span>
      )}
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-10 h-6 rounded-full transition-colors ${
          checked 
            ? isOps 
              ? 'bg-[#CCFF00]' 
              : 'bg-[#9D50FF]' 
            : 'bg-slate-200 dark:bg-white/10'
        }`} />
        <div className={`absolute left-1 top-1 w-4 h-4 rounded-full transition-transform bg-white ${
          checked ? 'translate-x-4' : 'translate-x-0'
        } ${isOps && checked ? '!bg-[#0A0A0B]' : ''}`} />
      </div>
    </label>
  );
};
