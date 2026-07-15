import { 
  UserRole, Profile, Stadium, Zone, Staff, Incident, 
  CommsMessage, CrowdMetric, AIPrediction, AccessibilityRequest, 
  SensoryReading, AssistantConversation 
} from '../types';

// Helper to load/save from localStorage
const getLocal = <T>(key: string, fallback: T): T => {
  const data = localStorage.getItem(`fielda_${key}`);
  return data ? JSON.parse(data) : fallback;
};

const setLocal = <T>(key: string, value: T): void => {
  localStorage.setItem(`fielda_${key}`, JSON.stringify(value));
};

// Initial Seed Data
const initialStadiums: Stadium[] = [
  { id: 'stadium-1', name: 'MetLife Stadium', capacity: 82500, city: 'East Rutherford, NJ', lat: 40.8135, lng: -74.0744 },
  { id: 'stadium-2', name: 'Estadio Azteca', capacity: 87523, city: 'Mexico City, MX', lat: 19.3029, lng: -99.1505 }
];

const initialZones: Zone[] = [
  // MetLife Stadium Zones
  { id: 'zone-1a', stadium_id: 'stadium-1', name: 'Gate A', type: 'gate', capacity: 15000, current_occupancy: 12400 },
  { id: 'zone-1b', stadium_id: 'stadium-1', name: 'Concourse West (Level 1)', type: 'concourse', capacity: 8000, current_occupancy: 7800 },
  { id: 'zone-1c', stadium_id: 'stadium-1', name: 'Section 120 (Seating)', type: 'seating', capacity: 5000, current_occupancy: 4200 },
  { id: 'zone-1d', stadium_id: 'stadium-1', name: 'Sensory Room 202', type: 'sensory', capacity: 30, current_occupancy: 18 },
  { id: 'zone-1e', stadium_id: 'stadium-1', name: 'Gate D', type: 'gate', capacity: 20000, current_occupancy: 9500 },
  // Azteca Stadium Zones
  { id: 'zone-2a', stadium_id: 'stadium-2', name: 'Gate 1 main', type: 'gate', capacity: 25000, current_occupancy: 21000 },
  { id: 'zone-2b', stadium_id: 'stadium-2', name: 'Plaza de la Constitución Concourse', type: 'concourse', capacity: 12000, current_occupancy: 9400 },
  { id: 'zone-2c', stadium_id: 'stadium-2', name: 'Sección Preferente Oriente', type: 'seating', capacity: 15000, current_occupancy: 14200 },
  { id: 'zone-2d', stadium_id: 'stadium-2', name: 'Estancia Sensorial Sur', type: 'sensory', capacity: 40, current_occupancy: 12 }
];

const initialStaff: Staff[] = [
  { id: 'staff-1', stadium_id: 'stadium-1', name: 'Alejandro Gomez', role: 'Crowd Marshal', language: 'es', zone_id: 'zone-1b', status: 'on_duty', shift_start: '08:00', shift_end: '18:00' },
  { id: 'staff-2', stadium_id: 'stadium-1', name: 'Sarah Jenkins', role: 'Accessibility Lead', language: 'en', zone_id: 'zone-1d', status: 'on_duty', shift_start: '09:00', shift_end: '17:00' },
  { id: 'staff-3', stadium_id: 'stadium-1', name: 'Kenji Sato', role: 'First Responder', language: 'ja', zone_id: 'zone-1a', status: 'on_duty', shift_start: '08:00', shift_end: '18:00' },
  { id: 'staff-4', stadium_id: 'stadium-1', name: 'Michael O\'Connor', role: 'Sustainabilty Officer', language: 'en', zone_id: 'zone-1e', status: 'standby', shift_start: '10:00', shift_end: '18:00' },
  { id: 'staff-5', stadium_id: 'stadium-2', name: 'Sofia Rodriguez', role: 'Crowd Marshal', language: 'es', zone_id: 'zone-2a', status: 'on_duty', shift_start: '08:00', shift_end: '18:00' }
];

const initialIncidents: Incident[] = [
  {
    id: 'inc-1',
    stadium_id: 'stadium-1',
    zone_id: 'zone-1b',
    title: 'Crowd Bottleneck at Concourse Escalator',
    severity: 'high',
    status: 'reported',
    description: 'Escalator blockage causing massive crowding. Volunteers requested to redirect fan flow to Section 120 staircases.',
    created_at: new Date(Date.now() - 15 * 60000).toISOString() // 15m ago
  },
  {
    id: 'inc-2',
    stadium_id: 'stadium-1',
    zone_id: 'zone-1a',
    title: 'Ticket Scanner Malfunction',
    severity: 'medium',
    status: 'dispatched',
    description: 'Lane 4 scanner offline. IT dispatch unit and Alejandro Gomez redirected to manually verify via QR code mobile scanners.',
    created_at: new Date(Date.now() - 35 * 60000).toISOString() // 35m ago
  }
];

const initialCommsMessages: CommsMessage[] = [
  {
    id: 'msg-1',
    channel: 'operations',
    original_text: 'Hay una congestión severa en la entrada oeste. Necesitamos tres auxiliares adicionales.',
    original_lang: 'es',
    translated_text: 'There is a severe congestion at the west entrance. We need three additional assistants.',
    sender: 'Alejandro Gomez (Crowd Marshal)',
    created_at: new Date(Date.now() - 10 * 60000).toISOString()
  },
  {
    id: 'msg-2',
    channel: 'operations',
    original_text: 'First aid unit dispatched to Section 120 for minor heat exhaustion.',
    original_lang: 'en',
    translated_text: 'Unidad de primeros auxilios enviada a la Sección 120 por agotamiento leve por calor.',
    sender: 'Command Center Dispatcher',
    created_at: new Date(Date.now() - 5 * 60000).toISOString()
  }
];

const initialCrowdMetrics: CrowdMetric[] = [
  { id: 'cm-1', stadium_id: 'stadium-1', zone_id: 'zone-1a', occupancy_pct: 83, timestamp: new Date().toISOString() },
  { id: 'cm-2', stadium_id: 'stadium-1', zone_id: 'zone-1b', occupancy_pct: 98, timestamp: new Date().toISOString() },
  { id: 'cm-3', stadium_id: 'stadium-1', zone_id: 'zone-1c', occupancy_pct: 84, timestamp: new Date().toISOString() },
  { id: 'cm-4', stadium_id: 'stadium-1', zone_id: 'zone-1d', occupancy_pct: 60, timestamp: new Date().toISOString() },
  { id: 'cm-5', stadium_id: 'stadium-1', zone_id: 'zone-1e', occupancy_pct: 48, timestamp: new Date().toISOString() }
];

const initialAIPredictions: AIPrediction[] = [
  {
    id: 'pred-1',
    stadium_id: 'stadium-1',
    zone_id: 'zone-1b',
    predicted_congestion_pct: 110,
    confidence: 94,
    forecast_time: '+20 mins',
    suggested_action: 'Re-route Gate A fan incoming paths to Concourse North'
  },
  {
    id: 'pred-2',
    stadium_id: 'stadium-1',
    zone_id: 'zone-1a',
    predicted_congestion_pct: 95,
    confidence: 88,
    forecast_time: '+45 mins',
    suggested_action: 'Increase scanner lanes to avoid check-in backlog as kickoff approaches'
  }
];

const initialAccessibilityRequests: AccessibilityRequest[] = [
  { id: 'acc-1', fan_id: 'fan-test-1', request_type: 'wheelchair', zone_id: 'zone-1b', status: 'assigned', created_at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 'acc-2', fan_id: 'fan-test-2', request_type: 'sensory_kit', zone_id: 'zone-1d', status: 'completed', created_at: new Date(Date.now() - 40 * 60000).toISOString() }
];

const initialSensoryReadings: SensoryReading[] = [
  { id: 'sr-1', zone_id: 'zone-1a', noise_level: 92, strobe_active: false, quiet_room_capacity: 12, timestamp: new Date().toISOString() },
  { id: 'sr-2', zone_id: 'zone-1b', noise_level: 104, strobe_active: true, quiet_room_capacity: 12, timestamp: new Date().toISOString() },
  { id: 'sr-3', zone_id: 'zone-1c', noise_level: 115, strobe_active: true, quiet_room_capacity: 12, timestamp: new Date().toISOString() },
  { id: 'sr-4', zone_id: 'zone-1d', noise_level: 45, strobe_active: false, quiet_room_capacity: 12, timestamp: new Date().toISOString() }
];

const initialConversations: AssistantConversation[] = [
  { id: 'conv-1', fan_id: 'fan-test-1', message: 'Is there wheelchair-accessible seating near Section 120?', sender: 'fan', language: 'en', created_at: new Date(Date.now() - 1 * 60000).toISOString() },
  { id: 'conv-2', fan_id: 'fan-test-1', message: 'Yes, Section 120 features elevator-accessible viewing decks in Row 18. Volunteer Sarah Jenkins can meet you at Gate A.', sender: 'ai', language: 'en', created_at: new Date().toISOString() }
];

const initialProfiles: Profile[] = [
  { id: 'user-organizer', full_name: 'Dev Organizer', role: 'organizer', language_pref: 'en', created_at: new Date().toISOString() },
  { id: 'user-staff', full_name: 'Dev Staff Member', role: 'staff', language_pref: 'es', created_at: new Date().toISOString() },
  { id: 'user-fan', full_name: 'Dev Fan Guest', role: 'fan', language_pref: 'en', created_at: new Date().toISOString() }
];

// Memory Stores
let stadiumsStore = getLocal<Stadium[]>('stadiums', initialStadiums);
let zonesStore = getLocal<Zone[]>('zones', initialZones).map(z => {
  if (z.name === 'Gate A Entrance') return { ...z, name: 'Gate A' };
  if (z.name === 'Gate D Plaza') return { ...z, name: 'Gate D' };
  return z;
});
setLocal('zones', zonesStore);
let staffStore = getLocal<Staff[]>('staff', initialStaff);
let incidentsStore = getLocal<Incident[]>('incidents', initialIncidents);
let commsMessagesStore = getLocal<CommsMessage[]>('comms_messages', initialCommsMessages);
let crowdMetricsStore = getLocal<CrowdMetric[]>('crowd_metrics', initialCrowdMetrics);
let aiPredictionsStore = getLocal<AIPrediction[]>('ai_predictions', initialAIPredictions);
let accessibilityRequestsStore = getLocal<AccessibilityRequest[]>('accessibility_requests', initialAccessibilityRequests);
let sensoryReadingsStore = getLocal<SensoryReading[]>('sensory_readings', initialSensoryReadings);
let assistantConversationsStore = getLocal<AssistantConversation[]>('assistant_conversations', initialConversations);
let profilesStore = getLocal<Profile[]>('profiles', initialProfiles);

// Active User session
let currentUserProfile = getLocal<Profile | null>('current_user', initialProfiles[0]); // Default to Organizer for ease

// Realtime notification callbacks
type Callback = () => void;
const subscribers: Record<string, Callback[]> = {};

const notifySubscribers = (table: string) => {
  if (subscribers[table]) {
    subscribers[table].forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }
};

// Simulation Client Class
class SupabaseSimulation {
  auth = {
    signUp: async (params: { email: string; password?: string; options?: { data?: { full_name?: string; role?: UserRole; language_pref?: string } } }) => {
      const email = params.email;
      const full_name = params.options?.data?.full_name || email.split('@')[0];
      const role = params.options?.data?.role || 'fan';
      const language_pref = params.options?.data?.language_pref || 'en';
      
      const id = 'user-' + Math.random().toString(36).substr(2, 9);
      const newProfile: Profile = {
        id,
        full_name,
        role,
        language_pref,
        created_at: new Date().toISOString()
      };
      
      profilesStore.push(newProfile);
      setLocal('profiles', profilesStore);
      
      // Auto login as this new user
      currentUserProfile = newProfile;
      setLocal('current_user', currentUserProfile);
      notifySubscribers('auth');
      
      return { data: { user: { id, email } }, error: null };
    },

    signInWithPassword: async (params: { email: string; password?: string }) => {
      const email = params.email;
      // Search profiles. Match a profile for testing easily.
      // If none, create a temporary fan profile
      let profile = profilesStore.find(p => p.full_name.toLowerCase().includes(email.split('@')[0].toLowerCase()));
      if (!profile) {
        // Fall back to matching by role
        if (email.includes('org')) {
          profile = profilesStore.find(p => p.role === 'organizer');
        } else if (email.includes('staff')) {
          profile = profilesStore.find(p => p.role === 'staff');
        } else {
          profile = profilesStore.find(p => p.role === 'fan');
        }
      }
      
      if (!profile) {
        profile = {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          full_name: email.split('@')[0],
          role: 'fan',
          language_pref: 'en',
          created_at: new Date().toISOString()
        };
        profilesStore.push(profile);
        setLocal('profiles', profilesStore);
      }
      
      currentUserProfile = profile;
      setLocal('current_user', currentUserProfile);
      notifySubscribers('auth');
      
      return { data: { user: { id: profile.id, email } }, error: null };
    },

    signOut: async () => {
      currentUserProfile = null;
      setLocal('current_user', null);
      notifySubscribers('auth');
      return { error: null };
    },

    getUser: async () => {
      if (currentUserProfile) {
        return { data: { user: { id: currentUserProfile.id, email: `${currentUserProfile.full_name.replace(/\s+/g, '').toLowerCase()}@fielda.org` } }, error: null };
      }
      return { data: { user: null }, error: null };
    },
    
    getProfile: () => currentUserProfile
  };

  // Fluent chain mock
  from(table: string) {
    const notifyAndSave = (updatedData: any) => {
      setLocal(table, updatedData);
      notifySubscribers(table);
    };

    return {
      select: (columns: string = '*') => {
        let list: any[] = [];
        switch (table) {
          case 'stadiums': list = [...stadiumsStore]; break;
          case 'zones': list = [...zonesStore]; break;
          case 'staff': list = [...staffStore]; break;
          case 'incidents': list = [...incidentsStore]; break;
          case 'comms_messages': list = [...commsMessagesStore]; break;
          case 'crowd_metrics': list = [...crowdMetricsStore]; break;
          case 'ai_predictions': list = [...aiPredictionsStore]; break;
          case 'accessibility_requests': list = [...accessibilityRequestsStore]; break;
          case 'sensory_readings': list = [...sensoryReadingsStore]; break;
          case 'assistant_conversations': list = [...assistantConversationsStore]; break;
          case 'profiles': list = [...profilesStore]; break;
          default: list = [];
        }

        // Return builder methods
        return {
          order: (col: string, options?: { ascending?: boolean }) => {
            const asc = options?.ascending !== false;
            list.sort((a, b) => {
              const valA = a[col];
              const valB = b[col];
              if (valA < valB) return asc ? -1 : 1;
              if (valA > valB) return asc ? 1 : -1;
              return 0;
            });
            
            return {
              limit: (n: number) => {
                return { data: list.slice(0, n), error: null };
              },
              then: (onfulfilled: (res: { data: any[]; error: any }) => any) => {
                return onfulfilled({ data: list, error: null });
              },
              data: list,
              error: null
            };
          },
          eq: (col: string, val: any) => {
            const filtered = list.filter(item => item[col] === val);
            return {
              order: (c: string, o?: { ascending?: boolean }) => {
                const asc = o?.ascending !== false;
                filtered.sort((a, b) => {
                  if (a[c] < b[c]) return asc ? -1 : 1;
                  if (a[c] > b[c]) return asc ? 1 : -1;
                  return 0;
                });
                return {
                  limit: (n: number) => ({ data: filtered.slice(0, n), error: null }),
                  data: filtered,
                  error: null
                };
              },
              data: filtered,
              error: null,
              then: (onfulfilled: (res: { data: any[]; error: any }) => any) => {
                return onfulfilled({ data: filtered, error: null });
              }
            };
          },
          data: list,
          error: null,
          then: (onfulfilled: (res: { data: any[]; error: any }) => any) => {
            return onfulfilled({ data: list, error: null });
          }
        };
      },

      insert: (record: any) => {
        const id = record.id || `${table.substring(0,3)}-` + Math.random().toString(36).substr(2, 9);
        const recordWithId = { id, ...record, created_at: record.created_at || new Date().toISOString() };
        
        switch (table) {
          case 'stadiums': stadiumsStore.push(recordWithId); notifyAndSave(stadiumsStore); break;
          case 'zones': zonesStore.push(recordWithId); notifyAndSave(zonesStore); break;
          case 'staff': staffStore.push(recordWithId); notifyAndSave(staffStore); break;
          case 'incidents': incidentsStore.push(recordWithId); notifyAndSave(incidentsStore); break;
          case 'comms_messages': commsMessagesStore.push(recordWithId); notifyAndSave(commsMessagesStore); break;
          case 'crowd_metrics': crowdMetricsStore.push(recordWithId); notifyAndSave(crowdMetricsStore); break;
          case 'ai_predictions': aiPredictionsStore.push(recordWithId); notifyAndSave(aiPredictionsStore); break;
          case 'accessibility_requests': accessibilityRequestsStore.push(recordWithId); notifyAndSave(accessibilityRequestsStore); break;
          case 'sensory_readings': sensoryReadingsStore.push(recordWithId); notifyAndSave(sensoryReadingsStore); break;
          case 'assistant_conversations': assistantConversationsStore.push(recordWithId); notifyAndSave(assistantConversationsStore); break;
          case 'profiles': profilesStore.push(recordWithId); notifyAndSave(profilesStore); break;
        }

        return {
          select: () => ({
            single: () => ({ data: recordWithId, error: null })
          }),
          data: [recordWithId],
          error: null,
          then: (onfulfilled: (res: { data: any[]; error: any }) => any) => {
            return onfulfilled({ data: [recordWithId], error: null });
          }
        };
      },

      update: (updates: any) => {
        return {
          eq: (col: string, val: any) => {
            let list: any[] = [];
            switch (table) {
              case 'stadiums': list = stadiumsStore; break;
              case 'zones': list = zonesStore; break;
              case 'staff': list = staffStore; break;
              case 'incidents': list = incidentsStore; break;
              case 'comms_messages': list = commsMessagesStore; break;
              case 'crowd_metrics': list = crowdMetricsStore; break;
              case 'ai_predictions': list = aiPredictionsStore; break;
              case 'accessibility_requests': list = accessibilityRequestsStore; break;
              case 'sensory_readings': list = sensoryReadingsStore; break;
              case 'assistant_conversations': list = assistantConversationsStore; break;
              case 'profiles': list = profilesStore; break;
            }

            let updatedRecords: any[] = [];
            list.forEach(item => {
              if (item[col] === val) {
                Object.assign(item, updates);
                updatedRecords.push(item);
              }
            });

            notifyAndSave(list);
            return { data: updatedRecords, error: null };
          }
        };
      },

      delete: () => {
        const executeDelete = (filterFn: (item: any) => boolean) => {
          let list: any[] = [];
          switch (table) {
            case 'stadiums': stadiumsStore = stadiumsStore.filter(filterFn); list = stadiumsStore; break;
            case 'zones': zonesStore = zonesStore.filter(filterFn); list = zonesStore; break;
            case 'staff': staffStore = staffStore.filter(filterFn); list = staffStore; break;
            case 'incidents': incidentsStore = incidentsStore.filter(filterFn); list = incidentsStore; break;
            case 'comms_messages': commsMessagesStore = commsMessagesStore.filter(filterFn); list = commsMessagesStore; break;
            case 'crowd_metrics': crowdMetricsStore = crowdMetricsStore.filter(filterFn); list = crowdMetricsStore; break;
            case 'ai_predictions': aiPredictionsStore = aiPredictionsStore.filter(filterFn); list = aiPredictionsStore; break;
            case 'accessibility_requests': accessibilityRequestsStore = accessibilityRequestsStore.filter(filterFn); list = accessibilityRequestsStore; break;
            case 'sensory_readings': sensoryReadingsStore = sensoryReadingsStore.filter(filterFn); list = sensoryReadingsStore; break;
            case 'assistant_conversations': assistantConversationsStore = assistantConversationsStore.filter(filterFn); list = assistantConversationsStore; break;
            case 'profiles': profilesStore = profilesStore.filter(filterFn); list = profilesStore; break;
          }
          notifyAndSave(list);
          return { data: [], error: null, then: (onfulfilled: (res: { data: any[]; error: any }) => any) => onfulfilled({ data: [], error: null }) };
        };

        return {
          eq: (col: string, val: any) => {
            return executeDelete(item => item[col] !== val);
          },
          neq: (col: string, val: any) => {
            return executeDelete(item => item[col] === val);
          },
          then: (onfulfilled: (res: { data: any[]; error: any }) => any) => {
            // Delete all records when no filter is chained directly
            let list: any[] = [];
            switch (table) {
              case 'stadiums': stadiumsStore = []; list = stadiumsStore; break;
              case 'zones': zonesStore = []; list = zonesStore; break;
              case 'staff': staffStore = []; list = staffStore; break;
              case 'incidents': incidentsStore = []; list = incidentsStore; break;
              case 'comms_messages': commsMessagesStore = []; list = commsMessagesStore; break;
              case 'crowd_metrics': crowdMetricsStore = []; list = crowdMetricsStore; break;
              case 'ai_predictions': aiPredictionsStore = []; list = aiPredictionsStore; break;
              case 'accessibility_requests': accessibilityRequestsStore = []; list = accessibilityRequestsStore; break;
              case 'sensory_readings': sensoryReadingsStore = []; list = sensoryReadingsStore; break;
              case 'assistant_conversations': assistantConversationsStore = []; list = assistantConversationsStore; break;
              case 'profiles': profilesStore = []; list = profilesStore; break;
            }
            notifyAndSave(list);
            return onfulfilled({ data: [], error: null });
          }
        };
      }
    };
  }

  // Live Subscription Bridge
  subscribe(table: string, callback: Callback) {
    if (!subscribers[table]) {
      subscribers[table] = [];
    }
    subscribers[table].push(callback);
    return {
      unsubscribe: () => {
        subscribers[table] = subscribers[table].filter(cb => cb !== callback);
      }
    };
  }
}

export const supabase = new SupabaseSimulation();
