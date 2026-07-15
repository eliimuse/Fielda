import React, { useMemo, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

interface AnimatedBackgroundProps {
  module?: 'operationsIntelligence' | 'unitypath';
}

interface FootballData {
  id: number;
  size: number;
  left: string;
  top: string;
  duration: number;
  bobAmount: number;
  rotationDirection: number;
  opacity: number;
}

const FootballSVG: React.FC = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="4" fill="currentColor" fillOpacity="0.05" />
    <polygon points="50,34 65,45 59,62 41,62 35,45" fill="currentColor" fillOpacity="0.6" stroke="currentColor" strokeWidth="3" />
    <line x1="50" y1="34" x2="50" y2="4" stroke="currentColor" strokeWidth="3" />
    <line x1="65" y1="45" x2="94" y2="35" stroke="currentColor" strokeWidth="3" />
    <line x1="59" y1="62" x2="77" y2="90" stroke="currentColor" strokeWidth="3" />
    <line x1="41" y1="62" x2="23" y2="90" stroke="currentColor" strokeWidth="3" />
    <line x1="35" y1="45" x2="6" y2="35" stroke="currentColor" strokeWidth="3" />
    <line x1="50" y1="4" x2="72" y2="12" stroke="currentColor" strokeWidth="3" />
    <line x1="50" y1="4" x2="28" y2="12" stroke="currentColor" strokeWidth="3" />
    <line x1="94" y1="35" x2="94" y2="60" stroke="currentColor" strokeWidth="3" />
    <line x1="77" y1="90" x2="50" y2="96" stroke="currentColor" strokeWidth="3" />
    <line x1="23" y1="90" x2="50" y2="96" stroke="currentColor" strokeWidth="3" />
    <line x1="6" y1="35" x2="6" y2="60" stroke="currentColor" strokeWidth="3" />
  </svg>
);

const _AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ module = 'unitypath' }) => {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [hasMouse, setHasMouse] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Faster, more responsive spring configuration
  const springConfig = { damping: 20, stiffness: 130, mass: 0.6 };
  const glowX = useSpring(mouseX, springConfig);
  const glowY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Detect reduced motion preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);
    const listener = (event: MediaQueryListEvent) => {
      setShouldReduceMotion(event.matches);
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setHasMouse(true);
      mouseX.set(e.clientX - 250);
      mouseY.set(e.clientY - 250);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const footballs = useMemo(() => {
    const list: FootballData[] = [];
    let idCounter = 0;

    // Generate footballs specifically for the Left Side Gutter (sides)
    for (let i = 0; i < 5; i++) {
      list.push({
        id: idCounter++,
        size: Math.floor(Math.random() * 20) + 28, // 28px to 48px (slightly larger/more visible)
        left: `${Math.floor(Math.random() * 8) + 2}%`, // 2% to 10%
        top: `${Math.floor(Math.random() * 80) + 10}%`,
        duration: Math.random() * 8 + 12, // 12s to 20s (faster rotation and float)
        bobAmount: Math.floor(Math.random() * 25) + 20, // 20px to 45px
        rotationDirection: Math.random() > 0.5 ? 1 : -1,
        opacity: Math.random() * 0.12 + 0.15, // 0.15 to 0.27 (more visible)
      });
    }

    // Generate footballs specifically for the Right Side Gutter (sides)
    for (let i = 0; i < 5; i++) {
      list.push({
        id: idCounter++,
        size: Math.floor(Math.random() * 20) + 28, // 28px to 48px
        left: `${Math.floor(Math.random() * 8) + 90}%`, // 90% to 98%
        top: `${Math.floor(Math.random() * 80) + 10}%`,
        duration: Math.random() * 8 + 12,
        bobAmount: Math.floor(Math.random() * 25) + 20,
        rotationDirection: Math.random() > 0.5 ? 1 : -1,
        opacity: Math.random() * 0.12 + 0.15, // 0.15 to 0.27
      });
    }

    // Generate some scattered footballs in the main viewport area
    for (let i = 0; i < 4; i++) {
      list.push({
        id: idCounter++,
        size: Math.floor(Math.random() * 16) + 16, // 16px to 32px
        left: `${Math.floor(Math.random() * 60) + 20}%`, // 20% to 80%
        top: `${Math.floor(Math.random() * 80) + 10}%`,
        duration: Math.random() * 10 + 15, // 15s to 25s
        bobAmount: Math.floor(Math.random() * 20) + 15,
        rotationDirection: Math.random() > 0.5 ? 1 : -1,
        opacity: Math.random() * 0.08 + 0.08, // 0.08 to 0.16 (subtle in center to not distract)
      });
    }

    return list;
  }, []);

  // Slightly more noticeable glow opacity (0.22 instead of 0.12)
  const glowColor = module === 'operationsIntelligence' ? 'rgba(204, 255, 0, 0.22)' : 'rgba(157, 80, 255, 0.22)';

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Dynamic Cursor / Static Centered Glow */}
      <motion.div
        style={
          hasMouse
            ? {
                position: 'fixed',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
                filter: 'blur(80px)',
                x: glowX,
                y: glowY,
                left: 0,
                top: 0,
                pointerEvents: 'none',
                zIndex: 0,
              }
            : {
                position: 'fixed',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
                filter: 'blur(80px)',
                left: '50%',
                top: '25%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 0,
              }
        }
      />

      {/* Floating Footballs */}
      {footballs.map((fb) => (
        <motion.div
          key={fb.id}
          style={{
            position: 'absolute',
            left: fb.left,
            top: fb.top,
            width: `${fb.size}px`,
            height: `${fb.size}px`,
            opacity: fb.opacity,
            color: '#FFFFFF',
            zIndex: 0,
          }}
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [0, -fb.bobAmount, 0],
                  rotate: [0, fb.rotationDirection * 360],
                }
          }
          transition={{
            duration: fb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <FootballSVG />
        </motion.div>
      ))}
    </div>
  );
};

export const AnimatedBackground = React.memo(_AnimatedBackground);
