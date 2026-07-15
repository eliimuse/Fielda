const fs = require('fs');
let code = fs.readFileSync('src/components/MobilityNavigator.tsx', 'utf8');

const replacement = `  useEffect(() => {
    const checkEmergency = async () => {
      const curStadium = localStorage.getItem('selectedStadiumId') || 'stadium-1';
      const { data: incidentsData } = await supabase.from('incidents').select('*');
      const { data: zonesData } = await supabase.from('zones').select('*');
      
      let stZones: any[] = [];
      if (zonesData) {
        stZones = zonesData.filter((z: any) => z.stadium_id === curStadium);
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
          name: isEmergency ? \`🚨 \${z.name}\` : z.name,
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

      setStartNodesList(uniqueStart);
      setDestNodesList(uniqueDest);

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
  }, []);`;

code = code.replace(/  useEffect\(\(\) => \{\n    const checkEmergency = async \(\) => \{[\s\S]*?  \}, \[\]\);/, replacement);

fs.writeFileSync('src/components/MobilityNavigator.tsx', code);
