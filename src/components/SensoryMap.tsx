import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Badge, Button } from './SharedPrimitives';
import { SensoryReading, Zone } from '../types';
import { Eye, Info, VolumeX, ShieldAlert, Sparkles } from 'lucide-react';

export const SensoryMap: React.FC = () => {
  const [readings, setReadings] = useState<SensoryReading[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneReading, setSelectedZoneReading] = useState<SensoryReading | null>(null);

  const loadData = async () => {
    const { data: rData } = await supabase.from('sensory_readings').select();
    if (rData) setReadings(rData);

    const { data: zData } = await supabase.from('zones').select();
    if (zData) setZones(zData);
  };

  useEffect(() => {
    loadData();
    const sub1 = supabase.subscribe('sensory_readings', loadData);
    const sub2 = supabase.subscribe('zones', loadData);
    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
    };
  }, []);

  // Map zone specific decibel details
  const getNoiseLevelColor = (db: number) => {
    if (db >= 100) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (db >= 85) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  const getNoiseBarColor = (db: number) => {
    if (db >= 100) return 'bg-red-500';
    if (db >= 85) return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto text-white">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
          <Eye className="text-[#9D50FF]" size={24} />
          Sensory Map & Quiet Zones
        </h2>
        <p className="text-xs text-white/50 font-mono uppercase mt-1">Live World Cup Environmental tracker mapping decibels, strobe lights, and quiet room slots</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Schematic Grid view (Spans 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">
              Active Stadium Sector Readings
            </h3>
            <span className="text-[10px] font-mono text-white/40 uppercase">Updates in real-time</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zones.map((zone) => {
              // Find matching sensory reading
              const reading = readings.find(r => r.zone_id === zone.id) || {
                id: zone.id,
                zone_id: zone.id,
                noise_level: zone.type === 'sensory' ? 45 : 85,
                strobe_active: false,
                quiet_room_capacity: 15,
                timestamp: new Date().toISOString()
              };

              return (
                <Card 
                  key={zone.id}
                  module="unitypath"
                  onClick={() => setSelectedZoneReading(reading as SensoryReading)}
                  className="cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-white/40 uppercase">{zone.type} sector</span>
                        <h4 className="text-sm font-display font-bold text-white tracking-wide">{zone.name}</h4>
                      </div>
                      
                      <div className="flex gap-1">
                        {reading.strobe_active && (
                          <Badge variant="danger" module="unitypath">⚡ Strobe</Badge>
                        )}
                        {zone.type === 'sensory' && (
                          <Badge variant="success" module="unitypath">Quiet Hub</Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress indicator for noise */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60">Noise Level</span>
                        <span className="font-mono font-bold">{reading.noise_level} dB</span>
                      </div>
                      <div className="w-full bg-white/5 border border-white/10 h-2 rounded-sm overflow-hidden">
                        <div 
                          className={`h-full transition-all ${getNoiseBarColor(reading.noise_level)}`}
                          style={{ width: `${Math.min((reading.noise_level / 130) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-white/40">
                      <span>Status: {reading.noise_level >= 100 ? 'Extreme volume' : reading.noise_level >= 85 ? 'Crowded noise' : 'Safe level'}</span>
                      {zone.type === 'sensory' && (
                        <span className="text-emerald-400 font-bold">{reading.quiet_room_capacity} slots left</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="space-y-4">
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">
              Sector Sensory Advisor
            </h3>
          </div>

          <Card module="unitypath" className="min-h-[250px] flex flex-col justify-between p-5">
            {selectedZoneReading ? (
              <div className="space-y-4">
                <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                  <h4 className="text-xs font-mono uppercase text-white/40">Inspecting Reading</h4>
                  <span className="text-xs font-mono font-bold">{selectedZoneReading.noise_level} dB</span>
                </div>

                <div className="space-y-3">
                  <div className={`p-3 rounded-sm border text-xs leading-relaxed ${getNoiseLevelColor(selectedZoneReading.noise_level)}`}>
                    <p className="font-bold flex items-center gap-1.5 uppercase font-mono mb-1 text-[10px]">
                      <Info size={12} />
                      Decibel Threshold Details
                    </p>
                    {selectedZoneReading.noise_level >= 100 ? (
                      'High alert: Noise level exceeds 100 dB. We strongly advise neurodivergent individuals, infants, or sensory-sensitive fans to wear noise-canceling headsets or locate a nearby Sensory Quiet Room immediately.'
                    ) : selectedZoneReading.noise_level >= 85 ? (
                      'Medium load: Noise level is around 85-95 dB. Normal stadium volume. Touch sensory support kit contains protective ear-plugs.'
                    ) : (
                      'Pristine calm: Sector noise is safe and comfortable. Highly suitable for resting and quiet decompression.'
                    )}
                  </div>

                  {selectedZoneReading.strobe_active && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-sm text-xs leading-relaxed">
                      <p className="font-bold flex items-center gap-1.5 uppercase font-mono mb-1 text-[10px]">
                        <ShieldAlert size={12} className="text-red-400" />
                        Flash / Strobe Alert active
                      </p>
                      Flashing lighting displays or pyro effects are active near this seating deck. Highly sensitive guests should shield vision or close eyes during kickoff and goal celebrations.
                    </div>
                  )}
                </div>

                <Button 
                  variant="outline" 
                  module="unitypath" 
                  onClick={() => setSelectedZoneReading(null)}
                  className="w-full mt-4"
                >
                  Clear Inspector
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-white/40">
                <VolumeX size={32} className="text-white/20 mb-2" />
                <p className="text-xs font-mono uppercase tracking-wide">Select Stadium sector</p>
                <p className="text-[11px] text-white/50 max-w-[200px] leading-relaxed mt-1">
                  Click on any stadium card sector to check precise quiet safe-havens, decibel advisories, and active strobe indicators.
                </p>
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* PERSISTENT CONDENSED LEGEND STRIP (FOR MOBILE AND DECK COMPLIANCE) */}
      <div id="sensory-legend-strip" className="border border-white/5 bg-[#16161A] rounded-sm p-3 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="ai" module="unitypath">Legend Guide</Badge>
          <span className="font-display font-bold text-white/80">Sensory Health Decibel Scale:</span>
        </div>
        <div className="flex gap-4 flex-wrap justify-center font-mono uppercase text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" />
            <span>&lt; 80 dB Safe Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" />
            <span>85 - 95 dB Active Load</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block animate-pulse" />
            <span>&gt; 100 dB Extreme Alert</span>
          </div>
        </div>
      </div>

    </div>
  );
};
