import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge, Modal } from './SharedPrimitives';
import { Incident, Zone, Staff, CrowdMetric, Stadium } from '../types';
import { ShieldAlert, Users, TrendingUp, Compass, Clock, Activity, AlertCircle, ArrowUpRight, CheckCircle } from 'lucide-react';
import { AnimatedBackground } from './AnimatedBackground';

export const CommandCenter: React.FC = () => {
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [selectedStadiumId, setSelectedStadiumId] = useState(() => localStorage.getItem('selectedStadiumId') || 'stadium-1');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  
  // Modal detail states
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Emergency SOS States
  const [aiAssignments, setAiAssignments] = useState<Record<string, any>>({});
  const [isLoadingAi, setIsLoadingAi] = useState<Record<string, boolean>>({});
  const [manualDispatchSelections, setManualDispatchSelections] = useState<Record<string, string>>({});
  
  // Track triggered assignments synchronously using a ref to prevent race conditions and infinite loops
  const triggeredAssignmentsRef = React.useRef<Set<string>>(new Set());

  // Fetch AI recommended dispatch for an incident
  const triggerAiAssignment = async (inc: Incident, force = false) => {
    // If not forced, block duplicates immediately
    if (!force && triggeredAssignmentsRef.current.has(inc.id)) return;
    triggeredAssignmentsRef.current.add(inc.id);

    setIsLoadingAi(prev => ({ ...prev, [inc.id]: true }));
    try {
      const res = await fetch('/api/gemini/assign-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident: inc,
          staffList: staff,
          zones: zones
        })
      });
      const data = await res.json();
      if (data && data.assignment) {
        setAiAssignments(prev => ({ ...prev, [inc.id]: data.assignment }));
      } else {
        setAiAssignments(prev => ({ 
          ...prev, 
          [inc.id]: { 
            assignedStaffName: 'AI Selection Unavailable', 
            assignedStaffRole: '', 
            assignedStaffId: '', 
            reason: data?.error || 'AI service returned empty result.',
            isError: true 
          } 
        }));
      }
    } catch (err: any) {
      console.error('Failed to fetch AI staff assignment:', err);
      setAiAssignments(prev => ({ 
        ...prev, 
        [inc.id]: { 
          assignedStaffName: 'AI Selection Unavailable', 
          assignedStaffRole: '', 
          assignedStaffId: '', 
          reason: err.message || 'Failed to fetch assignment recommendations.',
          isError: true 
        } 
      }));
    } finally {
      setIsLoadingAi(prev => ({ ...prev, [inc.id]: false }));
    }
  };

  const handleConfirmDispatch = async (
    incidentId: string,
    staffId: string,
    staffName: string,
    staffRole: string,
    reason: string,
    fanMessage?: string
  ) => {
    await supabase.from('incidents').update({
      status: 'dispatched',
      assigned_role: staffRole,
      assigned_staff_name: staffName,
      assigned_reason: reason,
      fan_message: fanMessage || "Feel free to contact us if further help is needed!"
    }).eq('id', incidentId);

    await supabase.from('comms_messages').insert({
      channel: 'operations',
      original_text: `🚨 [DISPATCH SUCCESSFUL]: ${staffRole} ${staffName} dispatched to Sector. Reason: ${reason}`,
      original_lang: 'en',
      translated_text: `🚨 [DESPACHO EXITOSO]: ${staffRole} ${staffName} enviado al Sector. Razón: ${reason}`,
      translated_lang: 'es',
      sender: 'Command Center AI Dispatch'
    });

    await loadData();
  };

  // Load and subscribe
  const loadData = async () => {
    const sRes = await supabase.from('stadiums').select();
    if (sRes.data) setStadiums(sRes.data);

    const iRes = await supabase.from('incidents').select();
    if (iRes.data) setIncidents(iRes.data);

    const zRes = await supabase.from('zones').select();
    if (zRes.data) setZones(zRes.data);

    const stRes = await supabase.from('staff').select();
    if (stRes.data) setStaff(stRes.data);
  };

  useEffect(() => {
    loadData();

    // Sync selectedStadiumId across pages
    const handleStorageChange = () => {
      const curStadium = localStorage.getItem('selectedStadiumId') || 'stadium-1';
      setSelectedStadiumId(curStadium);
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    // Subscribe to database changes
    const sub1 = supabase.subscribe('incidents', loadData);
    const sub2 = supabase.subscribe('zones', loadData);
    const sub3 = supabase.subscribe('staff', loadData);
    const sub4 = supabase.subscribe('crowd_metrics', loadData);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
      sub1.unsubscribe();
      sub2.unsubscribe();
      sub3.unsubscribe();
      sub4.unsubscribe();
    };
  }, []);

  // Auto-trigger AI assignments for critical reported SOS alerts
  useEffect(() => {
    const criticalReported = incidents.filter(
      i => i.stadium_id === selectedStadiumId && i.severity === 'critical' && i.status === 'reported'
    );
    criticalReported.forEach(inc => {
      if (!triggeredAssignmentsRef.current.has(inc.id) && !aiAssignments[inc.id] && !isLoadingAi[inc.id]) {
        triggerAiAssignment(inc);
      }
    });
  }, [incidents, selectedStadiumId]);

  const activeStadium = stadiums.find(s => s.id === selectedStadiumId) || stadiums[0];
  const activeZones = zones.filter(z => z.stadium_id === selectedStadiumId);
  const activeIncidents = React.useMemo(() => {
    const seen = new Set<string>();
    const sorted = [...incidents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted.filter(i => {
      if (i.stadium_id !== selectedStadiumId) return false;
      const key = `${i.title}-${i.zone_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [incidents, selectedStadiumId]);
  
  // Calculate stats
  const totalCapacity = activeZones.reduce((sum, z) => sum + z.capacity, 0);
  const totalOccupancy = activeZones.reduce((sum, z) => sum + z.current_occupancy, 0);
  const globalPct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;
  
  const activeAlertsCount = activeIncidents.filter(i => i.status !== 'resolved').length;
  const onDutyCount = staff.filter(st => st.stadium_id === selectedStadiumId && st.status === 'on_duty').length;

  const handleDispatch = async (incidentId: string) => {
    if (!dispatchTarget) return;
    
    // Find matching redundant incidents to dispatch them all together
    const currentInc = incidents.find(i => i.id === incidentId);
    if (currentInc) {
      const matching = incidents.filter(
        i => i.stadium_id === currentInc.stadium_id &&
             i.zone_id === currentInc.zone_id &&
             i.title === currentInc.title &&
             i.status !== 'resolved'
      );
      for (const m of matching) {
        await supabase.from('incidents').update({ 
          status: 'dispatched',
          description: `${m.description || ''}\n\n[Dispatch Log]: Responder "${dispatchTarget}" assigned to sector.`
        }).eq('id', m.id);
      }
    } else {
      await supabase.from('incidents').update({ 
        status: 'dispatched',
        description: `${selectedIncident?.description || ''}\n\n[Dispatch Log]: Responder "${dispatchTarget}" assigned to sector.`
      }).eq('id', incidentId);
    }
    
    setIsDetailModalOpen(false);
    setSelectedIncident(null);
    setDispatchTarget('');
    loadData();
  };

  const handleResolve = async (incidentId: string) => {
    // Find matching redundant incidents to resolve them all together
    const currentInc = incidents.find(i => i.id === incidentId);
    if (currentInc) {
      const matching = incidents.filter(
        i => i.stadium_id === currentInc.stadium_id &&
             i.zone_id === currentInc.zone_id &&
             i.title === currentInc.title &&
             i.status !== 'resolved'
      );
      for (const m of matching) {
        await supabase.from('incidents').update({ status: 'resolved' }).eq('id', m.id);
      }
    } else {
      await supabase.from('incidents').update({ status: 'resolved' }).eq('id', incidentId);
    }
    setIsDetailModalOpen(false);
    setSelectedIncident(null);
    loadData();
  };

  // Generate simple sparkline SVG paths
  const generateSparkline = (points: number[]) => {
    const width = 120;
    const height = 30;
    const max = Math.max(...points, 100);
    const min = Math.min(...points, 0);
    const range = max - min;
    const stepX = width / (points.length - 1);
    
    return points.map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-white relative">
      <AnimatedBackground module="operationsIntelligence" />

      <div className="relative z-10 space-y-6">
        {/* Sector Overview Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase">Vanguard Command Center</h2>
          <p className="text-xs text-white/50 font-mono uppercase mt-1">FIFA World Cup 2026 Core Operations Supervisor</p>
        </div>
        
        {/* Stadium Selector */}
        <div className="flex gap-2">
          {stadiums.map(stad => (
            <button
              key={stad.id}
              onClick={() => {
                setSelectedStadiumId(stad.id);
                localStorage.setItem('selectedStadiumId', stad.id);
              }}
              className={`px-3 py-1.5 rounded-sm text-xs font-display font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                selectedStadiumId === stad.id
                  ? 'bg-[#CCFF00] border-[#CCFF00] text-slate-950 shadow-[0_0_12px_rgba(204,255,0,0.25)]'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
              }`}
            >
              {stad.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4 KPI Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Occupancy Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-4 top-4 text-[#CCFF00] opacity-30"><Activity size={24} /></div>
          <p className="text-[10px] font-mono uppercase text-white/40 tracking-wider">Gate Access Load</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-display font-black text-white">{globalPct}%</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">▲ 2.4%</span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-[10px] font-mono text-white/40">{totalOccupancy.toLocaleString()} / {totalCapacity.toLocaleString()} max</p>
            <svg width="60" height="20" className="stroke-[#CCFF00] fill-none stroke-2">
              <path d={generateSparkline([60, 65, 72, 70, 78, 81, globalPct])} />
            </svg>
          </div>
        </Card>

        {/* Incidents Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-4 top-4 text-red-500 opacity-30"><ShieldAlert size={24} /></div>
          <p className="text-[10px] font-mono uppercase text-white/40 tracking-wider">Active Alerts</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-display font-black text-white">{activeAlertsCount}</span>
            <span className="text-xs font-mono text-white/40">unresolved</span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <p className="text-[10px] font-mono text-red-400 uppercase font-bold">Realtime feed</p>
            </div>
            <svg width="60" height="20" className="stroke-red-500 fill-none stroke-2">
              <path d={generateSparkline([1, 0, 2, 1, 3, 2, activeAlertsCount])} />
            </svg>
          </div>
        </Card>

        {/* Responders Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-4 top-4 text-sky-400 opacity-30"><Users size={24} /></div>
          <p className="text-[10px] font-mono uppercase text-white/40 tracking-wider">On-duty Responders</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-display font-black text-white">{onDutyCount}</span>
            <span className="text-xs font-mono text-sky-400 font-bold">actives</span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-[10px] font-mono text-white/40">{staff.length} staff total registered</p>
            <svg width="60" height="20" className="stroke-sky-400 fill-none stroke-2">
              <path d={generateSparkline([3, 3, 4, 4, 5, 5, onDutyCount])} />
            </svg>
          </div>
        </Card>

        {/* Average Queues */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-4 top-4 text-amber-400 opacity-30"><Clock size={24} /></div>
          <p className="text-[10px] font-mono uppercase text-white/40 tracking-wider">Avg Clearance Wait</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-display font-black text-white">9.2m</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">▼ 1.5m</span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-[10px] font-mono text-white/40">At standard checkpoints</p>
            <svg width="60" height="20" className="stroke-amber-400 fill-none stroke-2">
              <path d={generateSparkline([12, 14, 11, 10, 8, 9, 7])} />
            </svg>
          </div>
        </Card>

      </div>

      {/* Main Content Layout: Active Alert Queue + AI-flagged predictive risks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Active Incidents List (Spans 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Critical SOS Emergency Control Board */}
          {activeIncidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length > 0 && (
            <div className="border border-red-500/35 bg-red-950/15 rounded-sm p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-red-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <h3 className="text-sm font-display font-black uppercase text-red-500 tracking-wider flex items-center gap-2">
                    <ShieldAlert size={16} />
                    Active Critical Emergency SOS Control Sector
                  </h3>
                </div>
                <Badge variant="danger" className="animate-pulse bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] py-1 px-2.5">
                  CRITICAL INCIDENT FLOW
                </Badge>
              </div>

              <div className="space-y-4">
                {activeIncidents
                  .filter(i => i.severity === 'critical' && i.status !== 'resolved')
                  .map(inc => {
                    const zoneObj = zones.find(z => z.id === inc.zone_id);
                    const isReported = inc.status === 'reported';
                    const aiRec = aiAssignments[inc.id];
                    const loading = isLoadingAi[inc.id];

                    return (
                      <div key={inc.id} className="p-4 rounded-sm bg-black/40 border border-red-500/10 space-y-3 text-xs">
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div>
                            <h4 className="text-sm font-display font-black text-white uppercase tracking-wider">
                              🚨 Emergency SOS: {inc.title}
                            </h4>
                            <p className="text-[11px] text-white/50 font-mono mt-1 uppercase">
                              Target Sector: {zoneObj?.name || 'Unknown Zone'}
                            </p>
                          </div>
                          <Badge variant={isReported ? 'danger' : 'success'} className="uppercase">
                            {inc.status}
                          </Badge>
                        </div>

                        <p className="text-white/80 leading-relaxed font-mono bg-white/5 p-2 rounded-sm border border-white/5">
                          {inc.description}
                        </p>

                        {/* Dispatch section */}
                        {isReported ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                            {/* Gen AI Intelligent Assignment */}
                            <div className="space-y-2">
                              <span className="block text-[10px] font-mono uppercase text-white/40">🧠 Gen AI Staff Assignment</span>
                              {loading ? (
                                <div className="p-3 bg-white/5 border border-white/5 rounded-sm flex items-center justify-center gap-2 text-white/60 font-mono text-[11px]">
                                  <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping" />
                                  Gemini AI selecting responder...
                                </div>
                              ) : (aiRec && !aiRec.isError) ? (
                                <div className="p-3 bg-[#CCFF00]/5 border border-[#CCFF00]/20 rounded-sm space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                                    <span className="font-bold text-white text-[11px]">
                                      {aiRec.assignedStaffName} ({aiRec.assignedStaffRole})
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#CCFF00]/80 italic">
                                    {aiRec.reason}
                                  </p>
                                  <button
                                    onClick={() => handleConfirmDispatch(
                                      inc.id,
                                      aiRec.assignedStaffId,
                                      aiRec.assignedStaffName,
                                      aiRec.assignedStaffRole,
                                      aiRec.reason,
                                      aiRec.fanMessage
                                    )}
                                    className="w-full bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 text-[10px] font-mono font-bold py-1.5 rounded-sm uppercase tracking-wide cursor-pointer transition-colors"
                                  >
                                    Confirm AI Dispatch
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {aiRec?.isError && (
                                    <div className="p-2.5 bg-red-500/5 border border-red-500/10 rounded-sm space-y-1">
                                      <p className="text-[10px] text-red-400 font-semibold tracking-wider uppercase">⚠️ API Quota / Load Fallback Enabled</p>
                                      <p className="text-[10px] text-gray-400 leading-normal font-mono">
                                        Using local rules backup. (Reason: {aiRec.reason})
                                      </p>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => triggerAiAssignment(inc, true)}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[10px] font-mono font-bold py-2 rounded-sm uppercase tracking-wide cursor-pointer transition-colors"
                                  >
                                    {aiRec?.isError ? 'Retry AI Assignment' : 'Trigger AI Analysis'}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Manual Reassignment Section */}
                            <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4">
                              <span className="block text-[10px] font-mono uppercase text-white/40">🛠️ Manual Reassignment</span>
                              <div className="space-y-2">
                                <select
                                  value={manualDispatchSelections[inc.id] || ''}
                                  onChange={(e) => setManualDispatchSelections(prev => ({ ...prev, [inc.id]: e.target.value }))}
                                  className="w-full bg-white/5 border border-white/10 text-[11px] text-white rounded-sm p-2 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                                >
                                  <option value="" className="bg-[#0A0A0B] text-white">-- Select Responder --</option>
                                  {staff
                                    .filter(st => st.stadium_id === selectedStadiumId && st.status !== 'off_duty')
                                    .map(st => (
                                      <option key={st.id} value={st.id} className="bg-[#0A0A0B] text-white">
                                        {st.name} ({st.role} - {st.language})
                                      </option>
                                    ))}
                                </select>
                                <button
                                  disabled={!manualDispatchSelections[inc.id]}
                                  onClick={() => {
                                    const selectedStaffId = manualDispatchSelections[inc.id];
                                    const selectedStaff = staff.find(st => st.id === selectedStaffId);
                                    if (selectedStaff) {
                                      handleConfirmDispatch(
                                        inc.id,
                                        selectedStaff.id,
                                        selectedStaff.name,
                                        selectedStaff.role,
                                        `Manually assigned by operations command override.`
                                      );
                                    }
                                  }}
                                  className="w-full bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:hover:bg-white/5 border border-white/10 text-[10px] font-mono font-bold py-1.5 rounded-sm uppercase tracking-wide cursor-pointer transition-all"
                                >
                                  Manually Dispatch Responder
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-sm space-y-1">
                            <p className="font-bold flex items-center gap-1 text-[11px]">
                              <span>✓</span> RESPONDER DISPATCHED SUCCESSFULLY
                            </p>
                            <p className="text-[11px] text-white/90">
                              {inc.assigned_role} ({inc.assigned_staff_name}) is currently at the location.
                            </p>
                            {inc.assigned_reason && (
                              <p className="text-[10px] text-emerald-400/80 font-mono italic">
                                Reason: {inc.assigned_reason}
                              </p>
                            )}
                            <button
                              onClick={async () => {
                                await supabase.from('incidents').update({ status: 'resolved' }).eq('id', inc.id);
                                await loadData();
                              }}
                              className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-mono font-bold py-1 px-3 rounded-sm uppercase cursor-pointer"
                            >
                              Mark Emergency Resolved
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              Active Tactical Alerts ({activeIncidents.filter(i => i.status !== 'resolved').length})
            </h3>
            <span className="text-[10px] font-mono uppercase text-white/40">Click entry to Dispatch / Resolve</span>
          </div>

          <div className="space-y-3">
            {activeIncidents.filter(i => i.status !== 'resolved').length === 0 ? (
              <div className="border border-white/5 rounded-sm p-6 bg-[#16161A] text-center text-white/40 font-mono text-xs uppercase">
                ✓ No active alerts. Venue conditions pristine.
              </div>
            ) : (
              activeIncidents.filter(i => i.status !== 'resolved').map(inc => {
                const zoneObj = zones.find(z => z.id === inc.zone_id);
                return (
                  <Card 
                    key={inc.id}
                    onClick={() => {
                      setSelectedIncident(inc);
                      setIsDetailModalOpen(true);
                    }}
                    className={`cursor-pointer transition-all ${
                      inc.severity === 'critical' 
                        ? 'border-l-4 border-l-red-500' 
                        : inc.severity === 'high' 
                          ? 'border-l-4 border-l-amber-500' 
                          : 'border-l-4 border-l-sky-500'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-display font-bold text-white tracking-wide">{inc.title}</h4>
                          <Badge variant={inc.severity === 'critical' ? 'danger' : inc.severity === 'high' ? 'warning' : 'info'}>
                            {inc.severity}
                          </Badge>
                          <Badge variant={inc.status === 'reported' ? 'warning' : 'success'}>
                            {inc.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-white/40 font-mono mt-1 uppercase">Sector: {zoneObj?.name || 'Unknown Zone'}</p>
                        <p className="text-xs text-white/80 mt-2 line-clamp-2">{inc.description}</p>
                      </div>

                      <div className="text-right sm:self-center flex-shrink-0">
                        <span className="text-[10px] font-mono text-white/40 uppercase block">Reported</span>
                        <span className="text-xs font-mono font-semibold text-white">{new Date(inc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: AI-flagged Predictive Risks Panel */}
        <div className="space-y-4">
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-[#CCFF00]" />
              AI Predictive Risk Oversight
            </h3>
          </div>

          <div className="space-y-4">
            
            {/* Dynamic Forecast overview */}
            <Card className="bg-[#111114] border border-[#CCFF00]/25 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-[#CCFF00]/15 text-[#CCFF00] text-[9px] font-mono uppercase tracking-widest font-bold">
                Prediction Active
              </div>
              <p className="text-[11px] font-mono uppercase text-[#CCFF00] flex items-center gap-1">
                <Compass size={12} />
                20-Minute Bottleneck Risk
              </p>
              
              <div className="mt-4 space-y-3">
                {/* Find zones that are crowded */}
                {activeZones.map(zone => {
                  const currentOcc = Math.round((zone.current_occupancy / zone.capacity) * 100);
                  // Predict crowd increase for high occ
                  const predicted = currentOcc > 80 ? currentOcc + 12 : currentOcc + Math.floor(Math.random() * 8) - 4;
                  
                  if (currentOcc > 70) {
                    return (
                      <div key={zone.id} className="p-2.5 rounded bg-white/5 border border-white/5 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-white truncate max-w-[140px]">{zone.name}</span>
                          <span className="text-xs font-mono font-bold text-[#CCFF00]">
                            Est: {predicted}% occupancy
                          </span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-sm overflow-hidden">
                          <div 
                            className="bg-[#CCFF00] h-full transition-all"
                            style={{ width: `${Math.min(predicted, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-white/50 leading-snug">
                          {predicted >= 100 
                            ? '🚨 CRITICAL OVERLOAD forecast. Automatic rerouting triggers recommended.' 
                            : '⚠️ Elevated risk. Monitor gate pressure closely.'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })}
                
                {/* Static AI Advice summary */}
                <p className="text-[10px] text-[#CCFF00] font-mono leading-relaxed mt-2 uppercase">
                  ⚡ Fielda AI: Current Azteca / MetLife sensor grids show gate loads converging on Sector Escalators. Recommend routing arrivals to Secondary concourses.
                </p>
              </div>
            </Card>

            {/* AI Sustainability Tracker */}
            <Card>
              <h4 className="text-xs font-display font-black text-white uppercase tracking-wider mb-2">Sustainability Grid Oversight</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                Solar tiles at MetLife Gate D generating **12.4 kWh** backup energy. Smart waste compactors at Level 1 report **85% capacity**; dispatch alert triggered for sanitation marshal.
              </p>
            </Card>

          </div>

        </div>

      </div>

      {/* DISPATCH AND DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedIncident(null);
        }}
        title="Tactical Incident Response Panel"
      >
        {selectedIncident && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={selectedIncident.severity === 'critical' ? 'danger' : selectedIncident.severity === 'high' ? 'warning' : 'info'}>
                Severity: {selectedIncident.severity}
              </Badge>
              <Badge variant="info">Status: {selectedIncident.status}</Badge>
            </div>

            <div>
              <h4 className="text-xs font-mono uppercase text-white/40">Incident Description</h4>
              <p className="text-sm font-sans text-white mt-1 leading-relaxed bg-[#0A0A0B] p-3 rounded-sm border border-white/5 whitespace-pre-line">
                {selectedIncident.description}
              </p>
            </div>

            {selectedIncident.status !== 'resolved' && (
              <div className="border-t border-white/5 pt-3 space-y-3">
                <h4 className="text-xs font-mono uppercase text-white/40">Dispatch Available Responders</h4>
                
                <div className="flex gap-2">
                  <select
                    value={dispatchTarget}
                    onChange={(e) => setDispatchTarget(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 text-xs text-white rounded-sm p-2 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  >
                    <option value="" className="bg-[#0A0A0B] text-white">-- Choose Responder --</option>
                    {staff.filter(st => st.status !== 'off_duty').map(st => (
                      <option key={st.id} value={st.name} className="bg-[#0A0A0B] text-white">
                        {st.name} ({st.role} - {st.language})
                      </option>
                    ))}
                  </select>
                  
                  <Button 
                    variant="solid" 
                    onClick={() => handleDispatch(selectedIncident.id)}
                    disabled={!dispatchTarget}
                    className="!py-2 cursor-pointer"
                  >
                    Dispatch
                  </Button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleResolve(selectedIncident.id)}
                    className="w-full text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer"
                  >
                    <CheckCircle size={14} />
                    Mark Incident Resolved
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
    </div>
  );
};
