import React, { useState, useEffect } from 'react';
import { NavShell } from './components/NavShell';
import { ThemeModule } from './components/SharedPrimitives';

// Operations Intelligence Screen Components
import { CommandCenter } from './components/CommandCenter';
import { CommsNode } from './components/CommsNode';
import { DeploymentCopilot } from './components/DeploymentCopilot';
import { SpatialMap } from './components/SpatialMap';
import { DataConsole } from './components/DataConsole';

// Unity Path Screen Components
import { MatchdayHub } from './components/MatchdayHub';
import { AIAccessibility } from './components/AIAccessibility';
import { SensoryMap } from './components/SensoryMap';
import { MobilityNavigator } from './components/MobilityNavigator';

export default function App() {
  const [currentModule, setModule] = useState<ThemeModule>('operationsIntelligence');
  const [activeScreen, setActiveScreen] = useState<string>('command');
  
  const [metrics, setMetrics] = useState({ visitors: 42389, waitTime: 11, aqi: 34, temp: 75 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        visitors: prev.visitors + Math.floor(Math.random() * 7) - 3,
        waitTime: Math.max(3, Math.min(12, prev.waitTime + (Math.random() > 0.85 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
        aqi: Math.max(25, Math.min(45, prev.aqi + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
        temp: Math.max(68, Math.min(75, prev.temp + (Math.random() > 0.9 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Render the currently selected screen component dynamically
  const renderScreen = () => {
    switch (activeScreen) {
      // Operations Intelligence
      case 'command':
        return <CommandCenter />;
      case 'comms':
        return <CommsNode />;
      case 'copilot':
        return <DeploymentCopilot />;
      case 'map':
        return <SpatialMap />;
      case 'admin':
        return <DataConsole />;

      // Unity Path (Fan Experience)
      case 'matchday':
        return <MatchdayHub setActiveScreen={setActiveScreen} />;
      case 'assistant':
        return <AIAccessibility />;
      case 'sensory':
        return <SensoryMap />;
      case 'navigator':
        return <MobilityNavigator metrics={metrics} />;

      default:
        return <CommandCenter />;
    }
  };

  return (
    <NavShell
      currentModule={currentModule}
      setModule={setModule}
      activeScreen={activeScreen}
      setActiveScreen={setActiveScreen}
      metrics={metrics}
    >
      <div id="active-screen-viewstage" className="fade-in duration-300">
        {renderScreen()}
      </div>
    </NavShell>
  );
}
