import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge } from './SharedPrimitives';
import { 
  Navigation, Compass, ShieldCheck, AlertTriangle, 
  Accessibility, ArrowRight, Users, Car, Clock, Sun, Wind, MapPin 
} from 'lucide-react';

interface NavNode {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
}

const START_NODES: NavNode[] = [
  { id: 'gate-a', name: 'Gate A (North)', label: 'Gate A', x: 300, y: 70 },
  { id: 'gate-b', name: 'Gate B (East)', label: 'Gate B', x: 520, y: 200 },
  { id: 'gate-c', name: 'Gate C (South)', label: 'Gate C', x: 300, y: 330 },
  { id: 'gate-d', name: 'Gate D (West)', label: 'Gate D', x: 80, y: 200 },
];

const DEST_NODES: NavNode[] = [
  { id: 'sec-b', name: 'Seat Section B (Row 18)', label: 'Sec B', x: 440, y: 280 },
  { id: 'sec-d', name: 'Seat Section D (ADA Row)', label: 'Sec D', x: 160, y: 280 },
  { id: 'concession-east', name: 'Concession Court East', label: 'Concession East', x: 460, y: 120 },
  { id: 'medical-alpha', name: 'Medical Bay Alpha', label: 'Medical Bay Alpha', x: 140, y: 120 },
];

interface MobilityNavigatorProps {
  metrics?: { visitors: number, waitTime: number, aqi: number, temp: number };
}

export const MobilityNavigator: React.FC<MobilityNavigatorProps> = ({ metrics }) => {
  const [startGate, setStartGate] = useState('gate-a');
  const [endSection, setEndSection] = useState('sec-b');
  const [avoidCrowd, setAvoidCrowd] = useState(false);
  const [wheelchair, setWheelchair] = useState(false);
  const [startNodesList, setStartNodesList] = useState<NavNode[]>(START_NODES);
  const [destNodesList, setDestNodesList] = useState<NavNode[]>(DEST_NODES);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  useEffect(() => {
    const checkEmergency = async () => {
      const curStadium = localStorage.getItem('selectedStadiumId') || 'stadium-1';
      const { data: incidentsData } = await supabase.from('incidents').select('*');
      const { data: zonesData } = await supabase.from('zones').select('*');
      
      let stZones: any[] = [];
      if (zonesData) {
        stZones = zonesData.filter((z: any) => z.stadium_id === curStadium && !['Gate A', 'Gate D'].includes(z.name));
      }

      let activeCritical = null;
      if (incidentsData) {
        const activeSosId = localStorage.getItem('active_sos_id');
        activeCritical = incidentsData.find((i: any) => 
          (i.id === activeSosId || i.severity === 'critical') && 
          i.status !== 'resolved' && 
          i.stadium_id === curStadium
        );
      }

      setIsEmergencyMode(!!activeCritical);

      const newNodes: NavNode[] = stZones.map((z: any, idx: number) => {
        const angle = (idx / stZones.length) * Math.PI * 2;
        const isEmergency = activeCritical && z.id === activeCritical.zone_id;
        return {
          id: z.id,
          name: isEmergency ? `🚨 ${z.name}` : z.name,
          label: z.name,
          x: 300 + Math.cos(angle) * 170,
          y: 200 + Math.sin(angle) * 110
        };
      });

      const uniqueStart = [...START_NODES];
      newNodes.forEach(nn => {
        if (!uniqueStart.some(un => un.id === nn.id)) uniqueStart.push(nn);
      });
      
      const uniqueDest = [...DEST_NODES];
      newNodes.forEach(nn => {
        if (!uniqueDest.some(un => un.id === nn.id)) uniqueDest.push(nn);
      });

      const formattedStartNodes = uniqueStart.map(node => {
        if (node.name.includes('Section 120') || node.name.includes('Sensory Room 202')) {
           return { ...node, name: node.name.startsWith('🚨') ? node.name : `🚨 ${node.name}` };
        }
        return node;
      });

      const filteredDestNodes = uniqueDest.filter(node => 
        !node.name.includes('Section 120') && 
        !node.name.includes('Sensory Room 202') && 
        !node.name.includes('Concourse West')
      );

      setStartNodesList(formattedStartNodes);
      setDestNodesList(filteredDestNodes);

      if (activeCritical) {
        if (uniqueStart.some(n => n.id === activeCritical.zone_id)) {
          setStartGate(activeCritical.zone_id);
        }
        const emergencyNode = newNodes.find(n => n.id === activeCritical.zone_id);
        if (emergencyNode) {
          let maxDist = -1;
          let bestGate = START_NODES[0].id;
          START_NODES.forEach(gate => {
            const dist = Math.pow(gate.x - emergencyNode.x, 2) + Math.pow(gate.y - emergencyNode.y, 2);
            if (dist > maxDist) {
              maxDist = dist;
              bestGate = gate.id;
            }
          });
          setEndSection(bestGate);
        }
      }
    };
    checkEmergency();
    const sub = supabase.subscribe('incidents', checkEmergency);
    return () => sub.unsubscribe();
  }, []);

  const [isLightMode, setIsLightMode] = useState(() => document.documentElement.classList.contains('light'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightMode(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stats computation
  const getRouteStats = () => {
    const startNode = startNodesList.find(n => n.id === startGate) || startNodesList[0];
    const destNode = destNodesList.find(n => n.id === endSection) || destNodesList[0];

    let distance = 180;
    let time = 6;
    let loadText = "Low (Redirected via ramp)";
    let loadPct = "15%";
    let loadType: 'low' | 'med' | 'high' = 'low';
    let steps: string[] = [];

    // Calculate baseline distance based on Euclidean distance on canvas
    const dx = destNode.x - startNode.x;
    const dy = destNode.y - startNode.y;
    const directDist = Math.round(Math.sqrt(dx * dx + dy * dy));
    
    // Scale baseline to stadium-realistic meters
    distance = Math.round(directDist * 0.8) + 50;

    if (avoidCrowd) {
      distance = Math.round(distance * 1.15); // detour distance
      loadText = "15% (Congestion avoided)";
      loadPct = "15%";
      loadType = 'low';
    } else {
      if (destNode.id === 'concession-east') {
        loadText = "85% (Heavy congestion at Concourse A)";
        loadPct = "85%";
        loadType = 'high';
      } else {
        loadText = "45% (Moderate crowd on route)";
        loadPct = "45%";
        loadType = 'med';
      }
    }

    // Determine travel time based on distance and wheelchair modifier
    const walkingSpeed = wheelchair ? 35 : 50; // meters per minute
    time = Math.max(2, Math.ceil(distance / walkingSpeed));

    // Formulate turn-by-turn steps
    const isEvacuation = isEmergencyMode && (startNode.name.includes('🚨') || destNode.name.includes('🚨'));
    
    if (isEvacuation) {
      steps.push(`⚠️ EVACUATION ACTIVE: Move away from ${startNode.name.replace('🚨 ', '')}.`);
      steps.push(`Follow emergency lights down the main corridor.`);
      steps.push(`Exit stadium safely via ${destNode.name.replace('🚨 ', '')}.`);
    } else {
      const cleanStartName = startNode.name.replace('🚨 ', '');
      const cleanDestName = destNode.name.replace('🚨 ', '');

      // 1. Entrance / Start step
      if (startNode.id === 'gate-a') {
        steps.push(`Enter through Gate A (North Hub) and pass security screening.`);
      } else if (startNode.id === 'gate-b') {
        steps.push(`Enter through Gate B (East Plaza) near the ticket counter.`);
      } else if (startNode.id === 'gate-c') {
        steps.push(`Enter through Gate C (South Entry) under the main welcome arch.`);
      } else if (startNode.id === 'gate-d') {
        steps.push(`Enter through Gate D (West Atrium) past the merchandise showcase.`);
      } else {
        steps.push(`Start your route at ${cleanStartName}.`);
      }

      // ADA adjustment at start
      if (wheelchair) {
        steps.push(`Use the designated ADA priority scanner lane on the far right.`);
      }

      // 2. Traversal routing
      if (avoidCrowd) {
        if (startNode.id === 'gate-a') {
          steps.push(`Take the quiet North-West service bypass corridor (low foot traffic).`);
        } else if (startNode.id === 'gate-b') {
          steps.push(`Turn right and follow the outer ring pathway to bypass main lobby queues.`);
        } else if (startNode.id === 'gate-c') {
          steps.push(`Proceed via the South-East inner walkway which has 40% less congestion.`);
        } else if (startNode.id === 'gate-d') {
          steps.push(`Follow the mezzanine bypass ramp to stay above the busy ground level.`);
        } else {
          steps.push(`Follow the outer ring corridor to avoid major crowd bottlenecks.`);
        }
      } else {
        if (startNode.id === 'gate-a') {
          steps.push(`Walk straight down the main North Concourse Promenade.`);
        } else if (startNode.id === 'gate-b') {
          steps.push(`Walk through the bustling East food & merchandise galleria.`);
        } else if (startNode.id === 'gate-c') {
          steps.push(`Cross the active South Stadium Plaza (heavy foot traffic).`);
        } else if (startNode.id === 'gate-d') {
          steps.push(`Head through the vibrant West Fan Zone Concourse.`);
        } else {
          steps.push(`Walk down the main concourse corridor.`);
        }
      }

      // 3. Level shift / vertical transit
      if (wheelchair) {
        if (destNode.id === 'sec-b') {
          steps.push(`Locate Elevator 4 (East Wall) and request priority transit to Level 2.`);
        } else if (destNode.id === 'sec-d') {
          steps.push(`Use the low-slope ADA Access Ramp near Section 108 to descend to row-level.`);
        } else if (destNode.id === 'concession-east') {
          steps.push(`Take Elevator 1 to Level 1 and use the accessible lower-counter ordering lane.`);
        } else {
          steps.push(`Use Ramp Alpha to transition smoothly to the destination level.`);
        }
      } else {
        if (destNode.id === 'sec-b') {
          steps.push(`Ascend Staircase 12 (Gate B area) or take Escalator 4 to Level 2.`);
        } else if (destNode.id === 'sec-d') {
          steps.push(`Take the stairs down Section 112 directly towards the pitch.`);
        } else if (destNode.id === 'concession-east') {
          steps.push(`Follow the neon overhead signage directly into Concession Court East.`);
        } else {
          steps.push(`Ascend the nearest escalators to the upper concourse ring.`);
        }
      }

      // 4. Final guidance / Arrival step
      if (destNode.id === 'sec-b') {
        steps.push(`Find Row 18. Your seats are to the left of the stair entrance.`);
      } else if (destNode.id === 'sec-d') {
        steps.push(`Arrive at Seat Section D. Your companion seats are immediately adjacent.`);
      } else if (destNode.id === 'concession-east') {
        steps.push(`Arrive at Concession Court East. Enjoy your food and beverages!`);
      } else if (destNode.id === 'medical-alpha') {
        steps.push(`Arrive at Medical Bay Alpha. Professional medical staff are on duty.`);
      } else {
        steps.push(`Arrive at ${cleanDestName}.`);
      }
    }

    return { distance, time, loadText, loadPct, loadType, steps };
  };

  const stats = getRouteStats();

  // Animation Loop for Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const drawMap = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Color mapping based on mode
      const outerRingColor = isLightMode ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.05)';
      const midRingColor = isLightMode ? 'rgba(157, 80, 255, 0.25)' : 'rgba(157, 80, 255, 0.15)';
      const innerRingColor = isLightMode ? 'rgba(157, 80, 255, 0.3)' : 'rgba(157, 80, 255, 0.2)';
      const pitchFill = isLightMode ? '#dcfce7' : '#081c15';
      const pitchStroke = isLightMode ? 'rgba(22, 163, 74, 0.3)' : 'rgba(255, 255, 255, 0.15)';
      const inactiveNodeFill = isLightMode ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.2)';
      const inactiveNodeText = isLightMode ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.35)';
      
      const pathStroke = isLightMode ? '#0d9488' : '#00ffcc';
      const pathShadow = isLightMode ? 'rgba(13, 148, 136, 0.4)' : '#00ffcc';
      
      const startFill = isLightMode ? '#0d9488' : '#00ffcc';
      const startShadow = isLightMode ? 'rgba(13, 148, 136, 0.5)' : '#00ffcc';
      const startRipple = isLightMode ? 'rgba(13, 148, 136, 0.3)' : 'rgba(0, 255, 204, 0.4)';
      
      const endFill = isLightMode ? '#7c3aed' : '#9D50FF';
      const endShadow = isLightMode ? 'rgba(124, 58, 237, 0.5)' : '#9D50FF';
      const endRipple = isLightMode ? 'rgba(124, 58, 237, 0.3)' : 'rgba(157, 80, 255, 0.4)';
      
      const activeTextFill = isLightMode ? '#0f172a' : '#ffffff';

      // 1. Draw baseline stadium rings (concentric ellipses)
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 1;
      
      // Outer seating outline
      ctx.strokeStyle = outerRingColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 270, 175, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Middle tier contour
      ctx.strokeStyle = midRingColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 210, 135, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner ring contour
      ctx.strokeStyle = innerRingColor;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 140, 90, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw soccer field / pitch in center
      ctx.fillStyle = pitchFill;
      ctx.strokeStyle = pitchStroke;
      ctx.lineWidth = 2;
      
      const pitchWidth = 160;
      const pitchHeight = 100;
      const px = cx - pitchWidth / 2;
      const py = cy - pitchHeight / 2;
      
      ctx.beginPath();
      ctx.roundRect(px, py, pitchWidth, pitchHeight, 12);
      ctx.fill();
      ctx.stroke();

      // Pitch center circle & center line
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, py);
      ctx.lineTo(cx, py + pitchHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty boxes
      ctx.beginPath();
      // Left box
      ctx.rect(px, cy - 30, 25, 60);
      // Right box
      ctx.rect(px + pitchWidth - 25, cy - 30, 25, 60);
      ctx.stroke();

      // 3. Draw All Static Nodes (Inactive style)
      const allNodes = [...startNodesList, ...destNodesList];
      const startObj = startNodesList.find(n => n.id === startGate) || startNodesList[0];
      const destObj = destNodesList.find(n => n.id === endSection) || destNodesList[0];

      allNodes.forEach(node => {
        const isStart = node.id === startObj.id;
        const isEnd = node.id === destObj.id;

        if (!isStart && !isEnd) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = inactiveNodeFill;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
          ctx.fill();

          // Node Text label
          ctx.fillStyle = inactiveNodeText;
          ctx.font = '500 9px monospace';
          
          let align: CanvasTextAlign = 'center';
          let offsetX = 0;
          let offsetY = 0;

          if (node.id === 'gate-a') { offsetY = -15; }
          else if (node.id === 'gate-b') { align = 'left'; offsetX = 12; offsetY = 3; }
          else if (node.id === 'gate-c') { offsetY = 15; }
          else if (node.id === 'gate-d') { align = 'right'; offsetX = -12; offsetY = 3; }
          else if (node.id === 'concession-east') { align = 'left'; offsetX = 10; offsetY = -4; }
          else if (node.id === 'medical-alpha') { align = 'right'; offsetX = -10; offsetY = -4; }
          else if (node.id === 'sec-b') { align = 'left'; offsetX = 10; offsetY = 10; }
          else if (node.id === 'sec-d') { align = 'right'; offsetX = -10; offsetY = 10; }

          ctx.textAlign = align;
          ctx.fillText(node.label, node.x + offsetX, node.y + offsetY);
        }
      });

      // 4. Draw Active Path Route (Curved & Animated)
      const x1 = startObj.x;
      const y1 = startObj.y;
      const x2 = destObj.x;
      const y2 = destObj.y;

      // Compute bending control point around the center field
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const dx = mx - cx;
      const dy = my - cy;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);

      let ctrlX = mx;
      let ctrlY = my;

      if (distToCenter < 70) {
        // Bend strongly around pitch
        const perpX = -(y2 - y1);
        const perpY = x2 - x1;
        const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
        if (perpLen > 0) {
          ctrlX = mx + (perpX / perpLen) * 95;
          ctrlY = my + (perpY / perpLen) * 95;
        }
      } else {
        // Bend moderately
        ctrlX = mx + (dx / distToCenter) * 45;
        ctrlY = my + (dy / distToCenter) * 45;
      }

      // pathway stroke
      ctx.shadowBlur = isLightMode ? 4 : 12;
      ctx.shadowColor = pathShadow;
      ctx.strokeStyle = pathStroke;
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -frame * 0.7;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(ctrlX, ctrlY, x2, y2);
      ctx.stroke();

      // Reset style params
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // 5. Draw Active Node Markers with Pulsing Radii
      const pulseSize = Math.sin(frame * 0.1) * 4 + 8;

      // START NODE
      ctx.shadowBlur = isLightMode ? 4 : 10;
      ctx.shadowColor = startShadow;
      ctx.fillStyle = startFill;
      ctx.beginPath();
      ctx.arc(x1, y1, 6, 0, Math.PI * 2);
      ctx.fill();

      // Outer ripple
      ctx.strokeStyle = startRipple;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x1, y1, pulseSize, 0, Math.PI * 2);
      ctx.stroke();

      // Label text
      ctx.shadowBlur = 0;
      ctx.fillStyle = activeTextFill;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = startObj.id === 'gate-b' ? 'left' : (startObj.id === 'gate-d' ? 'right' : 'center');
      ctx.fillText(startObj.label, x1 + (startObj.id === 'gate-b' ? 14 : (startObj.id === 'gate-d' ? -14 : 0)), y1 + (startObj.id === 'gate-a' ? -16 : (startObj.id === 'gate-c' ? 18 : 3)));

      // END NODE
      ctx.shadowBlur = isLightMode ? 4 : 10;
      ctx.shadowColor = endShadow;
      ctx.fillStyle = endFill;
      ctx.beginPath();
      ctx.arc(x2, y2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Outer ripple
      ctx.strokeStyle = endRipple;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x2, y2, pulseSize, 0, Math.PI * 2);
      ctx.stroke();

      // Label text
      ctx.shadowBlur = 0;
      ctx.fillStyle = activeTextFill;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = destObj.id === 'concession-east' || destObj.id === 'sec-b' ? 'left' : 'right';
      ctx.fillText(destObj.label, x2 + (destObj.id === 'concession-east' || destObj.id === 'sec-b' ? 14 : -14), y2 + 3);

      animId = requestAnimationFrame(drawMap);
    };

    drawMap();

    return () => cancelAnimationFrame(animId);
  }, [startGate, endSection, isLightMode]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto text-white">
      
      {/* 1. TOP METRICS CONSOLE */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-[#111114] border border-white/5 rounded-sm p-3.5 text-xs font-mono">
        <div className="flex items-center gap-2.5 border-r border-white/5 pr-2">
          <Users size={15} className="text-white/40" />
          <div>
            <span className="block text-[10px] uppercase text-white/40 leading-none">Visitors</span>
            <span className="font-bold text-white text-sm">{(metrics?.visitors || 42389).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-r border-white/5 pr-2">
          <Car size={15} className="text-white/40" />
          <div>
            <span className="block text-[10px] uppercase text-white/40 leading-none">Parking</span>
            <span className="font-bold text-amber-500 text-sm">87%</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:border-r border-white/5 pr-2">
          <Clock size={15} className="text-white/40" />
          <div>
            <span className="block text-[10px] uppercase text-white/40 leading-none">Wait Time</span>
            <span className="font-bold text-emerald-400 text-sm">{metrics?.waitTime || 6} Min</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-r border-white/5 pr-2">
          <Sun size={15} className="text-white/40" />
          <div>
            <span className="block text-[10px] uppercase text-white/40 leading-none">Solar Power</span>
            <span className="font-bold text-amber-400 text-sm">327kW</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-r border-white/5 pr-2">
          <Wind size={15} className="text-white/40" />
          <div>
            <span className="block text-[10px] uppercase text-white/40 leading-none">Air Quality</span>
            <span className="font-bold text-emerald-400 text-sm">{(metrics?.aqi || 34) > 40 ? 'Moderate' : 'Good'}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 pl-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Simulation Active</span>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN DECK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Configuration and Stadium Map (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <Card module="unitypath" className="space-y-4">
            
            {/* Title & Status Badge */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h2 className="text-lg font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                <Navigation className="text-[#9D50FF]" size={20} />
                Smart AI Route Pathfinding
              </h2>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] py-1 px-2.5 flex items-center gap-1.5 bg-emerald-950/20 rounded-full font-mono uppercase">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Indoor GPS Active
              </Badge>
            </div>

            {/* Input Selectors Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1.5 tracking-wider">Start Point</label>
                <select
                  value={startGate}
                  onChange={(e) => setStartGate(e.target.value)}
                  className="w-full bg-[#16161A] border border-white/10 text-xs text-white rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-[#9D50FF] font-medium"
                >
                  {startNodesList.map(node => (
                    <option key={node.id} value={node.id} className="bg-[#0A0A0B] text-white">{node.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1.5 tracking-wider">Destination</label>
                <select
                  value={endSection}
                  onChange={(e) => setEndSection(e.target.value)}
                  className="w-full bg-[#16161A] border border-white/10 text-xs text-white rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-[#9D50FF] font-medium"
                >
                  {destNodesList.map(node => (
                    <option key={node.id} value={node.id} className="bg-[#0A0A0B] text-white">{node.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toggle Configuration Switches */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAvoidCrowd(!avoidCrowd)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-sm border text-xs font-mono transition-all duration-150 uppercase ${
                  avoidCrowd 
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/5' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <AlertTriangle size={14} />
                Avoid Crowd
              </button>

              <button
                type="button"
                onClick={() => setWheelchair(!wheelchair)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-sm border text-xs font-mono transition-all duration-150 uppercase ${
                  wheelchair 
                    ? 'bg-[#00ffcc]/10 border-[#00ffcc] text-[#00ffcc] shadow-lg shadow-[#00ffcc]/5' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <Accessibility size={14} />
                Wheelchair Route
              </button>
            </div>

            {/* Stadium Visualizer Map */}
            <div className="relative border border-white/5 rounded-sm bg-[#08080A] p-2 aspect-[3/2] flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                width={600}
                height={400}
                className="w-full h-full max-w-full max-h-full object-contain"
              />
              
              {/* Corner Watermark */}
              <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm border border-white/5 rounded-sm px-2 py-1 text-[8px] font-mono text-white/30 tracking-wider uppercase select-none">
                GRID LEVEL-01 BLU-CONTOUR
              </div>
            </div>

          </Card>
        </div>

        {/* RIGHT COLUMN: Interactive Directions & Turn-by-Turn Panel (1/3 width) */}
        <div>
          <Card module="unitypath" className="space-y-5 h-full flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Compass className="text-[#00ffcc]" size={20} />
                <h3 className="text-sm font-display font-black uppercase text-white tracking-wider">
                  Directions
                </h3>
              </div>

              {/* Path Metrics Cards */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/5 border border-white/5 rounded-sm p-3.5">
                  <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider">Distance</span>
                  <span className="text-xl font-display font-black text-[#00ffcc] block mt-0.5">{stats.distance}m</span>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-sm p-3.5">
                  <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider">Walk Time</span>
                  <span className="text-xl font-display font-black text-white block mt-0.5">{stats.time} Mins</span>
                </div>
              </div>

              {/* Crowd Load Status Alert */}
              <div className="mt-4">
                <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider mb-1.5">Crowd Load on Route</span>
                <div className={`p-3 rounded-sm border text-xs font-mono font-bold flex items-center gap-2 ${
                  stats.loadType === 'low' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : stats.loadType === 'high'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    stats.loadType === 'low' 
                      ? 'bg-emerald-400' 
                      : stats.loadType === 'high'
                        ? 'bg-red-400'
                        : 'bg-amber-400'
                  }`} />
                  {stats.loadText}
                </div>
              </div>

              {/* Turn-by-Turn Instruction Steps */}
              <div className="mt-5 space-y-3">
                <span className="block text-[10px] font-mono text-white/40 uppercase tracking-wider border-b border-white/5 pb-1">
                  Turn-by-Turn Navigation
                </span>
                
                <div className="space-y-4">
                  {stats.steps.map((step, index) => (
                    <div key={index} className="flex gap-3 text-xs leading-relaxed">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono font-bold text-white/60 text-[10px]">
                        {index + 1}
                      </div>
                      <div className="text-white/80 font-medium pt-0.5 flex-1">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Disclaimer */}
            <div className="pt-4 border-t border-white/5 text-[9px] font-mono text-white/30 uppercase leading-snug">
              🚨 Fielda routing engine syncs live with Operations Command. Real-time corridor blockages are bypassed automatically.
            </div>

          </Card>
        </div>

      </div>

    </div>
  );
};
