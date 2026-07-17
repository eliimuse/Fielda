import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge, Modal } from './SharedPrimitives';
import { Zone, AIPrediction, Staff } from '../types';
import { Users, TrendingUp, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw, Zap, Sliders } from 'lucide-react';

export const DeploymentCopilot: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [predictions, setPredictions] = useState<Record<string, AIPrediction & { isLoading?: boolean; executed?: boolean }>>({});
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [reassignTargetStaff, setReassignTargetStaff] = useState('');
  const [reassignTargetZone, setReassignTargetZone] = useState('');
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  const triggeredZonesRef = useRef<Set<string>>(new Set());

  const loadData = async () => {
    const zRes = await supabase.from('zones').select();
    if (zRes.data) setZones(zRes.data);

    const stRes = await supabase.from('staff').select();
    if (stRes.data) setStaff(stRes.data);
  };

  useEffect(() => {
    loadData();
    const sub1 = supabase.subscribe('zones', loadData);
    const sub2 = supabase.subscribe('staff', loadData);
    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
    };
  }, []);

  const fetchPrediction = async (zone: Zone) => {
    triggeredZonesRef.current.add(zone.id);
    // Mark as loading
    setPredictions(prev => ({
      ...prev,
      [zone.id]: {
        ...prev[zone.id],
        id: 'temp',
        stadium_id: zone.stadium_id,
        zone_id: zone.id,
        predicted_congestion_pct: 0,
        confidence: 0,
        forecast_time: '+20 mins',
        suggested_action: '',
        isLoading: true
      }
    }));

    try {
      const currentOcc = Math.round((zone.current_occupancy / zone.capacity) * 100);
      const response = await fetch('/api/gemini/crowd-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneName: zone.name,
          occupancyPct: currentOcc
        })
      });

      const result = await response.json();
      
      setPredictions(prev => ({
        ...prev,
        [zone.id]: {
          id: result.id || Math.random().toString(),
          stadium_id: zone.stadium_id,
          zone_id: zone.id,
          predicted_congestion_pct: result.predicted_congestion_pct,
          confidence: result.confidence,
          forecast_time: result.forecast_time || '+20 mins',
          suggested_action: result.suggested_action,
          isLoading: false,
          executed: false
        }
      }));
    } catch (error) {
      console.error('Prediction failed:', error);
    }
  };

  // Trigger default predictions for high capacity zones automatically with a staggered delay
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    if (zones.length > 0) {
      let delay = 0;
      zones.forEach(zone => {
        const currentOcc = Math.round((zone.current_occupancy / zone.capacity) * 100);
        if (currentOcc > 70 && !triggeredZonesRef.current.has(zone.id)) {
          // Add to triggered ref to block duplicate triggers immediately
          triggeredZonesRef.current.add(zone.id);

          // Pre-emptively register as loading to block duplicate triggers during the stagger
          setPredictions(prev => {
            if (prev[zone.id]) return prev;
            return {
              ...prev,
              [zone.id]: {
                id: 'temp-' + zone.id,
                stadium_id: zone.stadium_id,
                zone_id: zone.id,
                predicted_congestion_pct: 0,
                confidence: 0,
                forecast_time: '+20 mins',
                suggested_action: 'Staggered queue prediction processing...',
                isLoading: true,
                executed: false
              }
            };
          });

          const timer = setTimeout(() => {
            fetchPrediction(zone);
          }, delay);
          timers.push(timer);
          delay += 4000; // Space out requests by 4 seconds to comply with Gemini free-tier quotas
        }
      });
    }
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [zones]);

  const handleExecuteDirective = async (zoneId: string, actionText: string) => {
    // Simulate execution of a directive by:
    // 1. Mark as executed
    setPredictions(prev => ({
      ...prev,
      [zoneId]: {
        ...prev[zoneId],
        executed: true
      }
    }));

    // 2. Publish to communications node to broadcast translation
    await supabase.from('comms_messages').insert({
      channel: 'operations',
      original_text: `[AI System Action Committed]: Rerouting directive executed. Action detail: ${actionText}`,
      original_lang: 'en',
      translated_text: `[Acción del Sistema de IA Cometida]: Directiva de desvío ejecutada. Detalle: ${actionText}`,
      translated_lang: 'es',
      sender: 'Vanguard AI Co-pilot',
    });

    // 3. Increment staff numbers in the target zone
    const targetZoneObj = zones.find(z => z.id === zoneId);
    if (targetZoneObj) {
      // Find a standby staff member and move them
      const standbyStaff = staff.find(st => st.status === 'standby');
      if (standbyStaff) {
        await supabase.from('staff').update({ zone_id: zoneId, status: 'on_duty' }).eq('id', standbyStaff.id);
        loadData();
      }
    }
  };

  const handleManualReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTargetStaff || !reassignTargetZone) return;

    // Update staff zone allocation
    await supabase.from('staff').update({ 
      zone_id: reassignTargetZone,
      status: 'on_duty'
    }).eq('id', reassignTargetStaff);

    // Broadcast log
    const staffObj = staff.find(st => st.id === reassignTargetStaff);
    const zoneObj = zones.find(z => z.id === reassignTargetZone);
    if (staffObj && zoneObj) {
      await supabase.from('comms_messages').insert({
        channel: 'operations',
        original_text: `Manual reassignment: ${staffObj.name} deployed to ${zoneObj.name}.`,
        original_lang: 'en',
        translated_text: `Reasignación manual: ${staffObj.name} desplegado en ${zoneObj.name}.`,
        translated_lang: 'es',
        sender: 'Manual Reroute Command',
      });
    }

    setIsReassignModalOpen(false);
    setReassignTargetStaff('');
    setReassignTargetZone('');
    loadData();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
            <Users className="text-[#CCFF00]" size={24} />
            Deployment Co-pilot
          </h2>
          <p className="text-xs text-white/50 font-mono uppercase mt-1">Predictive Crowd Staffing suggestions & confidence models</p>
        </div>

        <Button 
          variant="outline" 
          onClick={() => {
            setIsReassignModalOpen(true);
            if (staff.length > 0) setReassignTargetStaff(staff[0].id);
            if (zones.length > 0) setReassignTargetZone(zones[0].id);
          }}
          className="border-white/10 text-white/80 hover:border-[#CCFF00] hover:text-[#CCFF00] cursor-pointer rounded-sm transition-all"
        >
          <Sliders size={14} />
          Manual Reassign Action
        </Button>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Zone load overview & predictions trigger (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">
              Stadium Sector Load Indicators
            </h3>
            <span className="text-[10px] font-mono text-white/40 uppercase">Updates automatically</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zones.map((zone) => {
              const occupancyPct = Math.round((zone.current_occupancy / zone.capacity) * 100);
              const activeZoneStaff = staff.filter(st => st.zone_id === zone.id && st.status === 'on_duty');
              const pred = predictions[zone.id];

              return (
                <Card 
                  key={zone.id}
                  className={`flex flex-col justify-between p-4 relative ${
                    occupancyPct > 90 ? 'border-r-4 border-r-red-500' : occupancyPct > 70 ? 'border-r-4 border-r-amber-500' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-white/40 uppercase">{zone.type} sector</h4>
                        <h5 className="text-sm font-display font-bold text-white tracking-wide mt-0.5">{zone.name}</h5>
                      </div>
                      <Badge variant={occupancyPct > 90 ? 'danger' : occupancyPct > 70 ? 'warning' : 'success'}>
                        {occupancyPct}% Load
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/5 border border-white/10 h-2 rounded overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          occupancyPct > 90 ? 'bg-red-500' : occupancyPct > 70 ? 'bg-amber-400' : 'bg-[#CCFF00]'
                        }`}
                        style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
                      <span>Occ: {zone.current_occupancy.toLocaleString()} / {zone.capacity.toLocaleString()}</span>
                      <span className="text-sky-400 font-bold">{activeZoneStaff.length} Marshals active</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/40">Copilot status:</span>
                    {pred ? (
                      pred.isLoading ? (
                        <div className="flex items-center gap-1 text-[10px] text-[#CCFF00] font-mono uppercase animate-pulse">
                          <RefreshCw className="animate-spin" size={10} />
                          consulting gemini...
                        </div>
                      ) : (
                        <Badge variant="ai">Ready</Badge>
                      )
                    ) : (
                      <button
                        onClick={() => fetchPrediction(zone)}
                        className="text-[10px] font-display font-bold text-[#CCFF00] hover:text-white uppercase tracking-widest cursor-pointer transition-colors"
                      >
                        ⚡ Forecast Bottleneck
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Co-pilot Suggestions & Execute Directive (1/3 width) */}
        <div className="space-y-4">
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <Zap className="text-[#CCFF00]" size={16} />
              AI Deployment Directives
            </h3>
          </div>

          <div className="space-y-4">
            {Object.keys(predictions).length === 0 ? (
              <div className="border border-white/5 rounded-sm p-6 bg-white/5 text-center text-white/40 font-mono text-xs uppercase">
                Select "Forecast Bottleneck" to synthesize predictive deployment actions
              </div>
            ) : (
              Object.entries(predictions).map(([zoneId, anyPred]) => {
                const pred = anyPred as any;
                const zoneObj = zones.find(z => z.id === zoneId);
                if (pred.isLoading) return null;

                return (
                  <Card 
                    key={zoneId} 
                    className={`border-[#CCFF00]/10 bg-[#CCFF00]/5 ${
                      pred.executed ? 'opacity-70 border-emerald-500/30' : 'shadow-[0_0_15px_rgba(204,255,0,0.05)]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-[#CCFF00]/10 pb-1.5">
                        <span className="text-[10px] font-mono font-bold text-[#CCFF00] truncate max-w-[150px]">
                          Forecast: {zoneObj?.name}
                        </span>
                        <div className="flex gap-1.5">
                          <span className="text-[10px] font-mono text-white/40 font-bold uppercase">{pred.forecast_time}</span>
                          <span className="text-[10px] font-mono text-[#CCFF00] font-bold bg-[#CCFF00]/20 px-1 rounded-sm">Conf: {pred.confidence}%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white">
                          <span>Predicted Congestion Load</span>
                          <span className="font-mono font-bold text-[#CCFF00]">{pred.predicted_congestion_pct}%</span>
                        </div>
                        <div className="w-full bg-white/5 border border-white/10 h-1 rounded overflow-hidden">
                          <div 
                            className="bg-[#CCFF00] h-full"
                            style={{ width: `${Math.min(pred.predicted_congestion_pct, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-[#0A0A0B] p-2.5 rounded-sm border border-white/5">
                        <span className="text-[9px] font-mono font-bold text-[#CCFF00] uppercase block mb-1">Co-pilot Recommendation</span>
                        <p className="text-xs text-white/80 leading-normal font-sans">
                          {pred.suggested_action}
                        </p>
                      </div>

                      {pred.executed ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                          <ShieldCheck size={14} />
                          Directive in Effect
                        </div>
                      ) : (
                        <Button
                          variant="solid"
                          onClick={() => handleExecuteDirective(zoneId, pred.suggested_action)}
                          className="w-full !py-2 bg-[#CCFF00]/10 border border-[#CCFF00]/30 hover:bg-[#CCFF00] hover:text-slate-950 text-[#CCFF00] uppercase text-xs font-bold transition-all cursor-pointer rounded-sm"
                        >
                          Execute Directive
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* REASSIGN STAFF DIALOG */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Manual Staff Deployment Re-Allocation"
      >
        <form onSubmit={handleManualReassignSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-white/40 mb-1">Select Marshal / Responder</label>
            <select
              value={reassignTargetStaff}
              onChange={(e) => setReassignTargetStaff(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
            >
              {staff.map(st => (
                <option key={st.id} value={st.id} className="bg-[#0A0A0B] text-white">
                  {st.name} ({st.role} - Status: {st.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/40 mb-1">Target Sector Deployment</label>
            <select
              value={reassignTargetZone}
              onChange={(e) => setReassignTargetZone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
            >
              {zones.map(z => (
                <option key={z.id} value={z.id} className="bg-[#0A0A0B] text-white">
                  {z.name} (Load: {Math.round((z.current_occupancy / z.capacity) * 100)}%)
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsReassignModalOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" variant="solid" className="cursor-pointer">
              Apply Reassignment
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
