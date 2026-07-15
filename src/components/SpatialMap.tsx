import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge } from './SharedPrimitives';
import { Incident, Zone, Staff, Stadium } from '../types';
import { Map, Layers, RotateCcw, AlertOctagon, HelpCircle } from 'lucide-react';
import * as THREE from 'three';

export const SpatialMap: React.FC = () => {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [selectedStadiumId, setSelectedStadiumId] = useState(() => localStorage.getItem('selectedStadiumId') || 'stadium-1');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedPin, setSelectedPin] = useState<{ type: 'incident' | 'staff'; data: any } | null>(null);

  const [isLightMode, setIsLightMode] = useState(() => document.documentElement.classList.contains('light'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightMode(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const mountRef = useRef<HTMLDivElement>(null);

  // Load database entities
  const loadData = async () => {
    const { data: stData } = await supabase.from('stadiums').select();
    if (stData) setStadiums(stData);

    const { data: iData } = await supabase.from('incidents').select();
    if (iData) setIncidents(iData);

    const { data: zData } = await supabase.from('zones').select();
    if (zData) setZones(zData);

    const { data: sData } = await supabase.from('staff').select();
    if (sData) setStaff(sData);
  };

  useEffect(() => {
    loadData();

    const handleStorageChange = () => {
      const curStadium = localStorage.getItem('selectedStadiumId') || 'stadium-1';
      setSelectedStadiumId(curStadium);
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    const sub0 = supabase.subscribe('stadiums', loadData);
    const sub1 = supabase.subscribe('incidents', loadData);
    const sub2 = supabase.subscribe('zones', loadData);
    const sub3 = supabase.subscribe('staff', loadData);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
      sub0.unsubscribe();
      sub1.unsubscribe();
      sub2.unsubscribe();
      sub3.unsubscribe();
    };
  }, []);

  // --- THREE.JS 3D CANVAS CODE ---
  useEffect(() => {
    if (viewMode !== '3d' || !mountRef.current) return;

    const width = mountRef.current.clientWidth || 500;
    const height = mountRef.current.clientHeight || 400;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isLightMode ? '#f1f5f9' : '#030712');

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(250, 200, 250);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // 3. Grid Helper baseline
    const gridHelper = new THREE.GridHelper(
      200, 
      20, 
      isLightMode ? '#94a3b8' : '#1e293b', 
      isLightMode ? '#cbd5e1' : '#0f172a'
    );
    gridHelper.position.y = -20;
    scene.add(gridHelper);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isLightMode ? 0.7 : 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isLightMode ? 1.0 : 0.8);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);

    // 5. Build 3D Stadium Wireframe Ring
    const ringGeo = new THREE.CylinderGeometry(80, 100, 30, 32, 2, true);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isLightMode ? 0x94a3b8 : 0x475569,
      wireframe: true,
      transparent: true,
      opacity: isLightMode ? 0.4 : 0.25
    });
    const stadiumMesh = new THREE.Mesh(ringGeo, ringMat);
    scene.add(stadiumMesh);

    // Pitch Plane representation
    const pitchGeo = new THREE.PlaneGeometry(80, 50);
    const pitchMat = new THREE.MeshBasicMaterial({
      color: isLightMode ? 0xdcfce7 : 0x1e293b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isLightMode ? 0.6 : 0.15
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = Math.PI / 2;
    pitch.position.y = -19;
    scene.add(pitch);

    // 6. Draw glowing active markers for Incidents and Staff
    const incidentGroup = new THREE.Group();
    const staffGroup = new THREE.Group();
    scene.add(incidentGroup);
    scene.add(staffGroup);

    // Maps incident positions around the ring (deduplicated to avoid redundant markers)
    const activeIncidents: Incident[] = [];
    const seenIncidents = new Set<string>();
    incidents.filter(i => i.stadium_id === selectedStadiumId && i.status !== 'resolved').forEach(inc => {
      const key = `${inc.title}-${inc.zone_id}-${inc.status}`;
      if (!seenIncidents.has(key)) {
        seenIncidents.add(key);
        activeIncidents.push(inc);
      }
    });
    activeIncidents.forEach((inc, index) => {
      const angle = (index / activeIncidents.length) * Math.PI * 2;
      const radius = 90;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Pulsing sphere
      const sphereGeo = new THREE.SphereGeometry(6, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: 0xff2a2a, // Command Red
        wireframe: false
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(x, 0, z);
      
      // Store reference metadata on object
      sphere.userData = { type: 'incident', data: inc };
      incidentGroup.add(sphere);
    });

    // Maps staff positions around the ring (both on_duty and standby/off_duty)
    const activeStaff = staff.filter(st => st.stadium_id === selectedStadiumId);
    activeStaff.forEach((st, index) => {
      const angle = ((index + 0.5) / activeStaff.length) * Math.PI * 2;
      const radius = 75;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Spanning Cylinder Cone
      const coneGeo = new THREE.ConeGeometry(4, 12, 4);
      const coneMat = new THREE.MeshBasicMaterial({
        color: st.status === 'on_duty' ? 0xccff00 : 0x475569, // Action Lime for on-duty, Slate/gray for standby/off-duty
        wireframe: true
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(x, -5, z);
      cone.userData = { type: 'staff', data: st };
      staffGroup.add(cone);
    });

    // Raycasting for interactive pin clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([...incidentGroup.children, ...staffGroup.children]);

      if (intersects.length > 0) {
        const clickedObj = intersects[0].object;
        setSelectedPin({
          type: clickedObj.userData.type,
          data: clickedObj.userData.type === 'staff' ? [clickedObj.userData.data] : clickedObj.userData.data
        });
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 7. Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const time = clock.getElapsedTime();

      // Rotate camera around stadium ring slowly
      camera.position.x = Math.sin(time * 0.1) * 250;
      camera.position.z = Math.cos(time * 0.1) * 250;
      camera.lookAt(0, 0, 0);

      // Pulse Incidents
      incidentGroup.children.forEach(child => {
        const scale = 1 + Math.sin(time * 6) * 0.15;
        child.scale.set(scale, scale, scale);
      });

      // Spin Staff cylinders
      staffGroup.children.forEach(child => {
        child.rotation.y = time * 2;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(mountRef.current);

    // Cleanup WebGL resources
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [viewMode, incidents, staff, isLightMode, selectedStadiumId]);

  // 2D Sector Coordinates mapping for Aztec/MetLife schematic overlay
  const sectorCoordinates: Record<string, { x: string; y: string }> = {
    'zone-1a': { x: '18%', y: '30%' }, // Gate A
    'zone-1b': { x: '35%', y: '55%' }, // Concourse West
    'zone-1c': { x: '52%', y: '32%' }, // Section 120
    'zone-1d': { x: '42%', y: '42%' }, // Sensory Room
    'zone-1e': { x: '78%', y: '70%' }, // Gate D
    
    'zone-2a': { x: '18%', y: '30%' }, // Gate 1 main
    'zone-2b': { x: '35%', y: '55%' }, // Plaza Concourse
    'zone-2c': { x: '52%', y: '32%' }, // Preferente Oriente
    'zone-2d': { x: '42%', y: '42%' }  // Estancia Sensorial
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
            <Map className="text-action-lime" size={24} />
            Spatial & Infrastructure Map
          </h2>
          <p className="text-xs text-gray-400 font-mono uppercase mt-1">Combined spatial schematic tracking volunteers and active alerts</p>
        </div>

        {/* Stadium Selector & Toggle Wrapper */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stadium Selector */}
          {stadiums.length > 0 && (
            <div className="flex gap-1 border border-slate-800 p-0.5 rounded bg-slate-950">
              {stadiums.map(stad => (
                <button
                  key={stad.id}
                  onClick={() => {
                    setSelectedStadiumId(stad.id);
                    localStorage.setItem('selectedStadiumId', stad.id);
                    setSelectedPin(null);
                  }}
                  className={`px-2.5 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    selectedStadiumId === stad.id
                      ? 'bg-action-lime text-slate-950 font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {stad.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          {/* 2D/3D toggle */}
          <div className="flex gap-1 border border-slate-800 p-0.5 rounded bg-slate-950">
            <button
              onClick={() => {
                setViewMode('2d');
                setSelectedPin(null);
              }}
              className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                viewMode === '2d' ? 'bg-action-lime text-slate-950' : 'text-gray-400 hover:text-white'
              }`}
            >
              2D Schematic
            </button>
            <button
              onClick={() => {
                setViewMode('3d');
                setSelectedPin(null);
              }}
              className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                viewMode === '3d' ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'text-gray-400 hover:text-white'
              }`}
            >
              3D Isometric
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Map Workspace Area (Spans 2 columns) */}
        <div className="lg:col-span-2 h-[450px] bg-slate-950 border border-slate-850 rounded relative overflow-hidden flex flex-col items-center justify-center">
          
          {/* VIEW: 2D STADIUM SCHEMATIC OVERLAY */}
          {viewMode === '2d' && (
            <div className="relative w-full h-full p-4 flex items-center justify-center select-none">
              
              {/* Outer Stadium Track Graphic (Retro SVG) */}
              <svg className="absolute w-[80%] h-[80%] opacity-20 pointer-events-none" viewBox="0 0 200 150">
                <ellipse cx="100" cy="75" rx="90" ry="60" fill="none" stroke="#475569" strokeWidth="4" />
                <ellipse cx="100" cy="75" rx="70" ry="45" fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="4 2" />
                <rect x="70" y="55" width="60" height="40" rx="3" fill="none" stroke="#475569" strokeWidth="2" />
              </svg>

              {/* Pins mapped based on individual incident and on-duty staff nodes */}
              {(() => {
                const activeIncidents = incidents.filter(
                  i => i.stadium_id === selectedStadiumId && i.status !== 'resolved'
                );
                const activeOnDutyStaff = staff.filter(
                  st => st.stadium_id === selectedStadiumId && st.status === 'on_duty'
                );

                // Group them by zone_id to compute offsets
                const zoneGroups: Record<string, Array<{ type: 'incident' | 'staff'; data: any }>> = {};
                
                // Also find all empty zones for this stadium so we can render simple grey dots for them
                const stadiumZones = zones.filter(z => z.stadium_id === selectedStadiumId);
                stadiumZones.forEach(z => {
                  zoneGroups[z.id] = [];
                });

                activeIncidents.forEach(inc => {
                  if (zoneGroups[inc.zone_id]) {
                    zoneGroups[inc.zone_id].push({ type: 'incident', data: inc });
                  } else {
                    zoneGroups[inc.zone_id] = [{ type: 'incident', data: inc }];
                  }
                });

                activeOnDutyStaff.forEach(st => {
                  if (zoneGroups[st.zone_id]) {
                    zoneGroups[st.zone_id].push({ type: 'staff', data: st });
                  } else {
                    zoneGroups[st.zone_id] = [{ type: 'staff', data: st }];
                  }
                });

                return Object.entries(zoneGroups).map(([zoneId, items]) => {
                  const coord = sectorCoordinates[zoneId] || { x: '50%', y: '50%' };
                  const total = items.length;

                  if (total === 0) {
                    const currentZone = zones.find(z => z.id === zoneId);
                    return (
                      <div
                        key={`empty-${zoneId}`}
                        className="absolute"
                        style={{ left: coord.x, top: coord.y }}
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full bg-slate-700 hover:bg-slate-500 cursor-pointer -translate-x-1/2 -translate-y-1/2" 
                          title={currentZone ? `${currentZone.name} (Empty Sector)` : "Empty Sector"}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`zone-group-${zoneId}`}
                      className="absolute"
                      style={{ left: coord.x, top: coord.y }}
                    >
                      <div className="relative">
                        {items.map((item, idx) => {
                          const angle = total > 1 ? (idx / total) * Math.PI * 2 : 0;
                          const radius = total > 1 ? 16 : 0; // 16px radius offset for nice visual layout
                          const offsetX = Math.cos(angle) * radius;
                          const offsetY = Math.sin(angle) * radius;

                          if (item.type === 'incident') {
                            const inc = item.data;
                            return (
                              <button
                                key={`inc-${inc.id}`}
                                onClick={() => setSelectedPin({ type: 'incident', data: inc })}
                                className="w-8 h-8 rounded-full bg-critical-red flex items-center justify-center border-2 border-white cursor-pointer absolute animate-pulse shadow-lg hover:scale-115 transition-transform"
                                style={{
                                  left: `${offsetX}px`,
                                  top: `${offsetY}px`,
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 30
                                }}
                                title={`Incident: ${inc.title}`}
                              >
                                <AlertOctagon size={14} className="text-white" />
                              </button>
                            );
                          } else {
                            const st = item.data;
                            const initials = st.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                            return (
                              <button
                                key={`staff-${st.id}`}
                                onClick={() => setSelectedPin({ type: 'staff', data: [st] })}
                                className="w-7 h-7 rounded-full bg-action-lime flex items-center justify-center border-2 border-slate-950 cursor-pointer absolute hover:scale-115 transition-transform shadow-md"
                                style={{
                                  left: `${offsetX}px`,
                                  top: `${offsetY}px`,
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 20
                                }}
                                title={`Marshal on Duty: ${st.name} (${st.role})`}
                              >
                                <span className="text-[9px] font-mono font-bold text-slate-950">
                                  {initials}
                                </span>
                              </button>
                            );
                          }
                        })}
                      </div>
                    </div>
                  );
                });
              })()}

              <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-800 p-2 rounded text-[10px] font-mono text-gray-400 space-y-1 uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-critical-red inline-block" />
                  Pulsing Red: Tactical Incident Alert
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-action-lime inline-block" />
                  Green Circle: Active Marshal Crew
                </div>
              </div>

              <div className="absolute top-4 right-4 bg-slate-900/60 p-2 rounded text-[10px] font-mono uppercase text-gray-500 border border-slate-800">
                Baselines Map • MetLife / Azteca Grid
              </div>
            </div>
          )}

          {/* VIEW: THREE.JS 3D WIREFRAME ISO STADIUM */}
          {viewMode === '3d' && (
            <div ref={mountRef} className="w-full h-full relative">
              <div className="absolute top-4 left-4 text-[10px] font-mono uppercase text-purple-300 bg-purple-950/20 px-2 py-1 rounded border border-purple-500/20 select-none">
                Interactive WebGL Canvas Active • Click nodes to view detail
              </div>
            </div>
          )}
        </div>

        {/* Right Detail Inspect Panel (1 column) */}
        <div className="space-y-4">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">
              Sector Node Inspector
            </h3>
          </div>

          <Card className="bg-slate-900/40 border-slate-800 min-h-[300px] flex flex-col justify-between">
            {selectedPin ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                
                {/* Pin Header */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <span className="text-[10px] font-mono uppercase text-gray-400">Node Coordinate</span>
                    <Badge variant={selectedPin.type === 'incident' ? 'danger' : 'success'}>
                      {selectedPin.type}
                    </Badge>
                  </div>

                  {/* Incident Info */}
                  {selectedPin.type === 'incident' && (
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-display font-bold text-white leading-snug">{selectedPin.data.title}</h4>
                      <p className="text-xs text-gray-400 font-mono uppercase">Severity: {selectedPin.data.severity}</p>
                      <p className="text-xs text-gray-300 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-850">
                        {selectedPin.data.description}
                      </p>
                    </div>
                  )}

                  {/* Staff Info */}
                  {selectedPin.type === 'staff' && (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {selectedPin.data.length > 1 && (
                        <div className="text-[10px] font-mono text-action-lime uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                          Deployed Marshals ({selectedPin.data.length})
                        </div>
                      )}
                      <div className="space-y-4 divide-y divide-slate-800">
                        {selectedPin.data.map((member: Staff, index: number) => (
                          <div key={member.id} className={index > 0 ? "pt-4" : ""}>
                            <h4 className="text-sm font-display font-bold text-white">{member.name}</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400 mt-2">
                              <div>
                                <span className="block text-[10px] uppercase text-gray-500">Role</span>
                                <span className="text-white font-semibold">{member.role}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] uppercase text-gray-500">Language</span>
                                <span className="text-white font-semibold uppercase">{member.language}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] uppercase text-gray-500">Shift</span>
                                <span className="text-white font-semibold">{member.shift_start} - {member.shift_end}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] uppercase text-gray-500">Status</span>
                                <span className={`${member.status === 'on_duty' ? 'text-action-lime font-bold' : 'text-gray-400 font-semibold'} uppercase`}>
                                  {member.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => setSelectedPin(null)}
                  className="w-full mt-4"
                >
                  Clear Selection
                </Button>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <HelpCircle size={32} className="text-slate-700 mb-3" />
                <p className="text-xs font-mono uppercase tracking-wide">No node selected</p>
                <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px] mt-1">
                  Click on any incident icon or marshal count pin in the 2D/3D map viewport to inspect details.
                </p>
              </div>
            )}
          </Card>
        </div>

      </div>

    </div>
  );
};
