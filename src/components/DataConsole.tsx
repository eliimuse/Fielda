import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge, Toggle } from './SharedPrimitives';
import { Zone, Incident, Staff, CrowdMetric, SensoryReading } from '../types';
import { Plus, Users, ShieldAlert, Zap, Radio, Check, Trash2 } from 'lucide-react';

export const DataConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'incident' | 'staff' | 'telemetry' | 'sensory'>('incident');
  const [zones, setZones] = useState<Zone[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Form states
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [incidentZone, setIncidentZone] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');

  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('Crowd Marshal');
  const [staffLang, setStaffLang] = useState('en');
  const [staffZone, setStaffZone] = useState('');
  const [staffStatus, setStaffStatus] = useState<'on_duty' | 'off_duty' | 'standby'>('on_duty');

  const [crowdZone, setCrowdZone] = useState('');
  const [crowdOccupancy, setCrowdOccupancy] = useState(70);

  const [sensoryZone, setSensoryZone] = useState('');
  const [sensoryNoise, setSensoryNoise] = useState(80);
  const [sensoryStrobe, setSensoryStrobe] = useState(false);
  const [sensoryRoomCap, setSensoryRoomCap] = useState(15);

  const loadStaffList = async () => {
    const { data } = await supabase.from('staff').select();
    if (data) {
      setStaffList(data);
    }
  };

  useEffect(() => {
    supabase.from('zones').select().then(({ data }) => {
      if (data) {
        setZones(data);
        if (data.length > 0) {
          setIncidentZone(data[0].id);
          setStaffZone(data[0].id);
          setCrowdZone(data[0].id);
          setSensoryZone(data[0].id);
        }
      }
    });

    loadStaffList();
    const sub = supabase.subscribe('staff', loadStaffList);
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle || !incidentZone) return;

    const selectedZoneObj = zones.find(z => z.id === incidentZone);
    const targetStadiumId = selectedZoneObj ? selectedZoneObj.stadium_id : 'stadium-1';

    const newIncident = {
      stadium_id: targetStadiumId,
      zone_id: incidentZone,
      title: incidentTitle,
      severity: incidentSeverity,
      status: 'reported' as const,
      description: incidentDesc,
    };

    await supabase.from('incidents').insert(newIncident);
    triggerSuccess(`Incident "${incidentTitle}" created successfully!`);
    setIncidentTitle('');
    setIncidentDesc('');
  };

  const handleStaffCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffZone) return;

    const selectedZoneObj = zones.find(z => z.id === staffZone);
    const targetStadiumId = selectedZoneObj ? selectedZoneObj.stadium_id : 'stadium-1';

    const newStaff = {
      stadium_id: targetStadiumId,
      name: staffName,
      role: staffRole,
      language: staffLang,
      zone_id: staffZone,
      status: staffStatus,
      shift_start: '08:00',
      shift_end: '18:00'
    };

    await supabase.from('staff').insert(newStaff);
    triggerSuccess(`Staff marshal "${staffName}" added to duty roster!`);
    setStaffName('');
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      await supabase.from('staff').delete().eq('id', staffId);
      triggerSuccess('Staff roster profile removed successfully.');
    } catch (err) {
      console.error('Error removing staff:', err);
    }
  };

  const handleCrowdTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crowdZone) return;

    const selectedZoneObj = zones.find(z => z.id === crowdZone);
    const targetStadiumId = selectedZoneObj ? selectedZoneObj.stadium_id : 'stadium-1';

    // 1. Insert metric row
    await supabase.from('crowd_metrics').insert({
      stadium_id: targetStadiumId,
      zone_id: crowdZone,
      occupancy_pct: Number(crowdOccupancy),
      timestamp: new Date().toISOString()
    });

    // 2. Dynamically update current zone occupancy for spatial maps
    const zoneObj = zones.find(z => z.id === crowdZone);
    if (zoneObj) {
      const updatedOcc = Math.floor(zoneObj.capacity * (Number(crowdOccupancy) / 100));
      await supabase.from('zones').update({ current_occupancy: updatedOcc }).eq('id', crowdZone);
    }

    triggerSuccess(`Crowd occupancy telemetry submitted for zone!`);
  };

  const handleSensoryReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sensoryZone) return;

    await supabase.from('sensory_readings').insert({
      zone_id: sensoryZone,
      noise_level: Number(sensoryNoise),
      strobe_active: sensoryStrobe,
      quiet_room_capacity: Number(sensoryRoomCap),
      timestamp: new Date().toISOString()
    });

    triggerSuccess(`Sensory conditions updated and saved!`);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase">Data Administration Console</h2>
          <p className="text-xs text-white/50 font-mono uppercase mt-1">Simulate live World Cup telemetry & duty roster inputs</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-[#CCFF00]/10 border border-[#CCFF00]/20 text-[#CCFF00] p-3 rounded-sm flex items-center gap-3 text-xs font-medium font-mono uppercase">
          <Check size={16} />
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('incident')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-display font-bold tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
            activeTab === 'incident' ? 'border-[#CCFF00] text-[#CCFF00]' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          <ShieldAlert size={14} />
          Report Incident
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-display font-bold tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
            activeTab === 'staff' ? 'border-[#CCFF00] text-[#CCFF00]' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          <Users size={14} />
          Staff Check-in
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-display font-bold tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
            activeTab === 'telemetry' ? 'border-[#CCFF00] text-[#CCFF00]' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          <Radio size={14} />
          Crowd Telemetry
        </button>
        <button
          onClick={() => setActiveTab('sensory')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-display font-bold tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
            activeTab === 'sensory' ? 'border-[#CCFF00] text-[#CCFF00]' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          <Zap size={14} />
          Sensory Logs
        </button>
      </div>

      {/* Forms Area */}
      <Card className="p-5">
        
        {/* Tab 1: INCIDENT REPORT */}
        {activeTab === 'incident' && (
          <form onSubmit={handleCreateIncident} className="space-y-4">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[#CCFF00]">Draft New Stadium Alert</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Alert Title</label>
                <input
                  type="text"
                  required
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  placeholder="e.g. Unidentified bag near gate entrance"
                  className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Target Zone Sector</label>
                <select
                  value={incidentZone}
                  onChange={(e) => setIncidentZone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id} className="bg-[#0A0A0B] text-white">{z.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Alert Severity</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setIncidentSeverity(sev)}
                      className={`flex-1 py-2 text-xs font-mono font-bold uppercase border rounded-sm cursor-pointer transition-all ${
                        incidentSeverity === sev
                          ? 'bg-[#CCFF00]/20 border-[#CCFF00]/40 text-[#CCFF00]'
                          : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                      }`}
                    >
                      {sev === 'critical' ? 'severe' : sev}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Description & Details</label>
                <textarea
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Provide incident specifics, dispatch requests, and key visual cues..."
                  className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00] h-20 resize-none"
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              <Plus size={16} />
              Publish Incident Alert
            </Button>
          </form>
        )}

        {/* Tab 2: STAFF ROSTER CHECK-IN */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <form onSubmit={handleStaffCheckIn} className="space-y-4">
              <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[#CCFF00]">Check-in Marshal or Responder</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="e.g. Kenji Sato"
                    className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">Assigned Deployment Sector</label>
                  <select
                    value={staffZone}
                    onChange={(e) => setStaffZone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id} className="bg-[#0A0A0B] text-white">{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">Duty Assignment Role</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  >
                    <option value="Crowd Marshal" className="bg-[#0A0A0B] text-white">Crowd Marshal</option>
                    <option value="Accessibility Lead" className="bg-[#0A0A0B] text-white">Accessibility Lead</option>
                    <option value="First Responder" className="bg-[#0A0A0B] text-white">First Responder</option>
                    <option value="Sustainability Officer" className="bg-[#0A0A0B] text-white">Sustainability Officer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">Language Fluency</label>
                  <select
                    value={staffLang}
                    onChange={(e) => setStaffLang(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  >
                    <option value="en" className="bg-[#0A0A0B] text-white">English (en)</option>
                    <option value="es" className="bg-[#0A0A0B] text-white">Spanish (es)</option>
                    <option value="ja" className="bg-[#0A0A0B] text-white">Japanese (ja)</option>
                    <option value="fr" className="bg-[#0A0A0B] text-white">French (fr)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">Initial Duty Status</label>
                  <select
                    value={staffStatus}
                    onChange={(e: any) => setStaffStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  >
                    <option value="on_duty" className="bg-[#0A0A0B] text-white">On Duty</option>
                    <option value="standby" className="bg-[#0A0A0B] text-white">Standby Alert</option>
                    <option value="off_duty" className="bg-[#0A0A0B] text-white">Off Duty</option>
                  </select>
                </div>
              </div>

              <Button type="submit" className="w-full">
                <Plus size={16} />
                Register Duty Roster Profile
              </Button>
            </form>

            <div className="border-t border-white/5 pt-6">
              <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[#CCFF00] mb-3 flex items-center gap-2">
                <Users size={16} />
                Registered Duty Roster ({staffList.length})
              </h3>
              {staffList.length === 0 ? (
                <p className="text-xs font-mono text-white/30 uppercase">No registered staff on the duty roster.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {staffList.map(st => {
                    const zoneObj = zones.find(z => z.id === st.zone_id);
                    return (
                      <div
                        key={st.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-sm hover:border-white/20 transition-all gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{st.name}</span>
                            <Badge variant={st.status === 'on_duty' ? 'success' : st.status === 'standby' ? 'warning' : 'info'}>
                              {st.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-white/40 uppercase">
                            <span>Role: <strong className="text-white/70 font-normal">{st.role}</strong></span>
                            <span>•</span>
                            <span>Zone: <strong className="text-white/70 font-normal">{zoneObj?.name || 'Unknown'}</strong></span>
                            <span>•</span>
                            <span>Lang: <strong className="text-white/70 font-normal">{st.language}</strong></span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Button
                            onClick={() => handleRemoveStaff(st.id)}
                            variant="danger"
                            className="min-h-[36px] py-1.5 px-3 text-[11px]"
                          >
                            <Trash2 size={12} />
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: CROWD TELEMETRY UPDATER */}
        {activeTab === 'telemetry' && (
          <form onSubmit={handleCrowdTelemetry} className="space-y-4">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[#CCFF00]">Trigger Live Capacity Telemetry</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Target Zone Sector</label>
                <select
                  value={crowdZone}
                  onChange={(e) => setCrowdZone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id} className="bg-[#0A0A0B] text-white">{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-mono uppercase text-white/40">Current Occupancy Percentage</label>
                  <span className="text-xs font-bold text-[#CCFF00] font-mono">{crowdOccupancy}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={crowdOccupancy}
                  onChange={(e) => setCrowdOccupancy(Number(e.target.value))}
                  className="w-full accent-[#CCFF00] bg-white/5 border border-white/10 rounded-sm p-3 h-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              <Plus size={16} />
              Submit Telemetry Packet
            </Button>
          </form>
        )}

        {/* Tab 4: SENSORY LOGS */}
        {activeTab === 'sensory' && (
          <form onSubmit={handleSensoryReading} className="space-y-4">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[#CCFF00]">Log Sensory Map Conditions</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Stadium Zone Sector</label>
                <select
                  value={sensoryZone}
                  onChange={(e) => setSensoryZone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id} className="bg-[#0A0A0B] text-white">{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-mono uppercase text-white/40">Noise Level Reading (dB)</label>
                  <span className="text-xs font-bold text-[#CCFF00] font-mono">{sensoryNoise} dB</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="130"
                  value={sensoryNoise}
                  onChange={(e) => setSensoryNoise(Number(e.target.value))}
                  className="w-full accent-[#CCFF00] bg-white/5 border border-white/10 rounded-sm p-3 h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-6 p-2 bg-white/5 rounded-sm border border-white/10 h-16">
                <Toggle
                  checked={sensoryStrobe}
                  onChange={setSensoryStrobe}
                  label="Intense Flash/Strobe Lights Active"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Quiet Room Safe Capacity (slots)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={sensoryRoomCap}
                  onChange={(e) => setSensoryRoomCap(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              <Plus size={16} />
              Commit Sensory Conditions
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
