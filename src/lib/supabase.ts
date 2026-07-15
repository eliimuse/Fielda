import { createClient } from '@supabase/supabase-js';
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

// Initialize real Supabase client with Provided Credentials (safeguarded against type check errors)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://umlrnfplfshxhbwtytsm.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_snQ7cTa2xUh0B7LFTY5hXA_VXkyR_AN';

export const realSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Memory Stores for Local Sync and fallback
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
let currentUserProfile = getLocal<Profile | null>('current_user', initialProfiles[0]);

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

const notifyAndSave = (table: string, updatedData: any) => {
  setLocal(table, updatedData);
  notifySubscribers(table);
};

// Simulation Helpers
const runSelectSimulation = (table: string, chain: any) => {
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

  if (chain.eq) {
    list = list.filter(item => item[chain.eq.col] === chain.eq.val);
  }

  if (chain.order) {
    const asc = chain.order.ascending;
    const col = chain.order.col;
    list.sort((a, b) => {
      const valA = a[col];
      const valB = b[col];
      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  }

  if (chain.limit !== undefined) {
    list = list.slice(0, chain.limit);
  }

  return { data: list, error: null };
};

const insertLocal = (table: string, recordWithId: any) => {
  switch (table) {
    case 'stadiums': stadiumsStore.push(recordWithId); notifyAndSave(table, stadiumsStore); break;
    case 'zones': zonesStore.push(recordWithId); notifyAndSave(table, zonesStore); break;
    case 'staff': staffStore.push(recordWithId); notifyAndSave(table, staffStore); break;
    case 'incidents': incidentsStore.push(recordWithId); notifyAndSave(table, incidentsStore); break;
    case 'comms_messages': commsMessagesStore.push(recordWithId); notifyAndSave(table, commsMessagesStore); break;
    case 'crowd_metrics': crowdMetricsStore.push(recordWithId); notifyAndSave(table, crowdMetricsStore); break;
    case 'ai_predictions': aiPredictionsStore.push(recordWithId); notifyAndSave(table, aiPredictionsStore); break;
    case 'accessibility_requests': accessibilityRequestsStore.push(recordWithId); notifyAndSave(table, accessibilityRequestsStore); break;
    case 'sensory_readings': sensoryReadingsStore.push(recordWithId); notifyAndSave(table, sensoryReadingsStore); break;
    case 'assistant_conversations': assistantConversationsStore.push(recordWithId); notifyAndSave(table, assistantConversationsStore); break;
    case 'profiles': profilesStore.push(recordWithId); notifyAndSave(table, profilesStore); break;
  }
};

const updateLocal = (table: string, col: string, val: any, updates: any) => {
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

  const updatedRecords: any[] = [];
  list.forEach(item => {
    if (item[col] === val) {
      Object.assign(item, updates);
      updatedRecords.push(item);
    }
  });

  notifyAndSave(table, list);
  return updatedRecords;
};

const deleteLocal = (table: string, filterFn: (item: any) => boolean) => {
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
  notifyAndSave(table, list);
};

const clearLocal = (table: string) => {
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
  notifyAndSave(table, list);
};

// Helper to make chainable resilient select promises without triggering TS infinite type resolution
const makeResilientQuery = (table: string, columns: string = '*', chain: any = {}): any => {
  const execute = async () => {
    try {
      let query: any = realSupabase.from(table).select(columns);
      if (chain.eq) {
        query = query.eq(chain.eq.col, chain.eq.val);
      }
      if (chain.order) {
        query = query.order(chain.order.col, { ascending: chain.order.ascending });
      }
      if (chain.limit !== undefined) {
        query = query.limit(chain.limit);
      }
      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err: any) {
      console.warn(`Supabase select on "${table}" falling back to simulated stores:`, err.message || err);
      return runSelectSimulation(table, chain);
    }
  };

  const promise = new Promise<any>((resolve, reject) => {
    execute().then(resolve, reject);
  });

  const queryBuilder: any = promise;

  queryBuilder.order = (col: string, options?: { ascending?: boolean }) => {
    chain.order = { col, ascending: options?.ascending !== false };
    return makeResilientQuery(table, columns, chain);
  };

  queryBuilder.eq = (col: string, val: any) => {
    chain.eq = { col, val };
    return makeResilientQuery(table, columns, chain);
  };

  queryBuilder.limit = (n: number) => {
    chain.limit = n;
    return makeResilientQuery(table, columns, chain);
  };

  return queryBuilder;
};

// Resilient Hybrid Supabase Client
class ResilientSupabase {
  auth = {
    signUp: async (params: { email: string; password?: string; options?: { data?: { full_name?: string; role?: UserRole; language_pref?: string } } }) => {
      try {
        const { data, error } = await realSupabase.auth.signUp({
          email: params.email,
          password: params.password || 'TempPassword123!',
          options: params.options
        });
        if (error) throw error;
        
        const user = data.user;
        if (user) {
          const newProfile: Profile = {
            id: user.id,
            full_name: params.options?.data?.full_name || params.email.split('@')[0],
            role: params.options?.data?.role || 'fan',
            language_pref: params.options?.data?.language_pref || 'en',
            created_at: new Date().toISOString()
          };
          profilesStore.push(newProfile);
          setLocal('profiles', profilesStore);
          currentUserProfile = newProfile;
          setLocal('current_user', currentUserProfile);
          notifySubscribers('auth');
          return { data, error: null };
        }
      } catch (err: any) {
        console.warn('Real Supabase signUp failed, running simulation fallback:', err.message || err);
      }

      // Simulation Fallback
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
      currentUserProfile = newProfile;
      setLocal('current_user', currentUserProfile);
      notifySubscribers('auth');
      
      return { data: { user: { id, email } }, error: null };
    },

    signInWithPassword: async (params: { email: string; password?: string }) => {
      try {
        const { data, error } = await realSupabase.auth.signInWithPassword({
          email: params.email,
          password: params.password || 'TempPassword123!'
        });
        if (error) throw error;

        // Try getting real profile or creating locally
        let profile = profilesStore.find(p => p.id === data.user?.id);
        if (!profile) {
          profile = {
            id: data.user?.id || 'user-' + Math.random().toString(36).substr(2, 9),
            full_name: params.email.split('@')[0],
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
        return { data, error: null };
      } catch (err: any) {
        console.warn('Real Supabase signInWithPassword failed, running simulation fallback:', err.message || err);
      }

      // Simulation Fallback
      const email = params.email;
      let profile = profilesStore.find(p => p.full_name.toLowerCase().includes(email.split('@')[0].toLowerCase()));
      if (!profile) {
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
      try {
        await realSupabase.auth.signOut();
      } catch (e) {}
      currentUserProfile = null;
      setLocal('current_user', null);
      notifySubscribers('auth');
      return { error: null };
    },

    getUser: async () => {
      try {
        const { data, error } = await realSupabase.auth.getUser();
        if (data.user) return { data, error: null };
      } catch (e) {}
      if (currentUserProfile) {
        return { data: { user: { id: currentUserProfile.id, email: `${currentUserProfile.full_name.replace(/\s+/g, '').toLowerCase()}@fielda.org` } }, error: null };
      }
      return { data: { user: null }, error: null };
    },
    
    getProfile: () => currentUserProfile
  };

  from(table: string) {
    return {
      select: (columns: string = '*') => {
        return makeResilientQuery(table, columns);
      },

      insert: (record: any) => {
        const localId = record.id || `${table.substring(0, 3)}-` + Math.random().toString(36).substr(2, 9);
        const localRecord = {
          id: localId,
          ...record,
          created_at: record.created_at || new Date().toISOString()
        };

        const execute = async () => {
          try {
            const { data, error } = await realSupabase.from(table).insert(record).select();
            if (error) throw error;
            insertLocal(table, data?.[0] || localRecord);
            return { data: data || [localRecord], error: null };
          } catch (err: any) {
            console.warn(`Supabase insert on "${table}" falling back to simulated stores:`, err.message || err);
            insertLocal(table, localRecord);
            return { data: [localRecord], error: null };
          }
        };

        const promise = new Promise<any>((resolve, reject) => {
          execute().then(resolve, reject);
        });

        const insertBuilder: any = promise;

        insertBuilder.select = () => ({
          single: () => {
            return new Promise<any>((resolve, reject) => {
              execute().then(res => resolve({ data: res.data?.[0] || localRecord, error: null }), reject);
            });
          }
        });

        return insertBuilder;
      },

      update: (updates: any) => {
        return {
          eq: (col: string, val: any) => {
            const execute = async () => {
              try {
                const { data, error } = await realSupabase.from(table).update(updates).eq(col, val).select();
                if (error) throw error;
                updateLocal(table, col, val, updates);
                return { data: data || [], error: null };
              } catch (err: any) {
                console.warn(`Supabase update on "${table}" falling back to simulated stores:`, err.message || err);
                const updated = updateLocal(table, col, val, updates);
                return { data: updated, error: null };
              }
            };

            return new Promise<any>((resolve, reject) => {
              execute().then(resolve, reject);
            });
          }
        };
      },

      delete: () => {
        const executeDelete = async (filterFn: (item: any) => boolean, dbOp: (query: any) => any) => {
          try {
            const { data, error } = await dbOp(realSupabase.from(table).delete().select());
            if (error) throw error;
            deleteLocal(table, filterFn);
            return { data: data || [], error: null };
          } catch (err: any) {
            console.warn(`Supabase delete on "${table}" falling back to simulated stores:`, err.message || err);
            deleteLocal(table, filterFn);
            return { data: [], error: null };
          }
        };

        const executeDeleteAll = async () => {
          try {
            const { data, error } = await realSupabase.from(table).delete().select();
            if (error) throw error;
            clearLocal(table);
            return { data: data || [], error: null };
          } catch (err: any) {
            console.warn(`Supabase clear on "${table}" falling back to simulated stores:`, err.message || err);
            clearLocal(table);
            return { data: [], error: null };
          }
        };

        const promise = new Promise<any>((resolve, reject) => {
          executeDeleteAll().then(resolve, reject);
        });

        const deleteBuilder: any = promise;

        deleteBuilder.eq = (col: string, val: any) => {
          const execute = () => executeDelete(
            item => item[col] !== val,
            query => query.eq(col, val)
          );
          return new Promise<any>((resolve, reject) => {
            execute().then(resolve, reject);
          });
        };

        deleteBuilder.neq = (col: string, val: any) => {
          const execute = () => executeDelete(
            item => item[col] === val,
            query => query.neq(col, val)
          );
          return new Promise<any>((resolve, reject) => {
            execute().then(resolve, reject);
          });
        };

        return deleteBuilder;
      }
    };
  }

  subscribe(table: string, callback: Callback) {
    if (!subscribers[table]) {
      subscribers[table] = [];
    }
    subscribers[table].push(callback);

    let channel: any = null;
    try {
      channel = realSupabase
        .channel(`${table}-changes-${Math.random().toString(36).substr(2, 5)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: table },
          () => {
            callback();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Real Supabase real-time subscription failed:', err);
    }

    return {
      unsubscribe: () => {
        subscribers[table] = subscribers[table].filter(cb => cb !== callback);
        if (channel) {
          try {
            realSupabase.removeChannel(channel);
          } catch (e) {}
        }
      }
    };
  }
}

export const supabase = new ResilientSupabase();

// Seeder for real Supabase tables
const seedRealSupabase = async () => {
  try {
    if (localStorage.getItem('fielda_supabase_seeded') === 'true') return;

    console.info('Fielda: Checking if real Supabase tables need initial seeding...');
    const { data: zData, error: zError } = await realSupabase.from('zones').select('id').limit(1);
    if (zError) {
      console.info('Fielda: Real Supabase tables are not created yet (expected if fresh db). Local simulation is active.');
      return;
    }

    if (!zData || zData.length === 0) {
      console.info('Fielda: Seeding initial fixture data to real Supabase tables...');
      try { await realSupabase.from('zones').insert(initialZones); } catch (e) { console.warn('Error seeding zones:', e); }
      try { await realSupabase.from('staff').insert(initialStaff); } catch (e) { console.warn('Error seeding staff:', e); }
      try { await realSupabase.from('incidents').insert(initialIncidents); } catch (e) { console.warn('Error seeding incidents:', e); }
      try { await realSupabase.from('comms_messages').insert(initialCommsMessages); } catch (e) { console.warn('Error seeding comms_messages:', e); }
      try { await realSupabase.from('crowd_metrics').insert(initialCrowdMetrics); } catch (e) { console.warn('Error seeding crowd_metrics:', e); }
      try { await realSupabase.from('ai_predictions').insert(initialAIPredictions); } catch (e) { console.warn('Error seeding ai_predictions:', e); }
      try { await realSupabase.from('accessibility_requests').insert(initialAccessibilityRequests); } catch (e) { console.warn('Error seeding accessibility_requests:', e); }
      try { await realSupabase.from('sensory_readings').insert(initialSensoryReadings); } catch (e) { console.warn('Error seeding sensory_readings:', e); }
      try { await realSupabase.from('assistant_conversations').insert(initialConversations); } catch (e) { console.warn('Error seeding assistant_conversations:', e); }
      try { await realSupabase.from('profiles').insert(initialProfiles); } catch (e) { console.warn('Error seeding profiles:', e); }

      localStorage.setItem('fielda_supabase_seeded', 'true');
      console.info('Fielda: Real Supabase seeded successfully!');
    } else {
      localStorage.setItem('fielda_supabase_seeded', 'true');
      console.info('Fielda: Real Supabase already populated, skipping seeding.');
    }
  } catch (err) {
    console.warn('Fielda: Real Supabase auto-seeding skipped:', err);
  }
};

seedRealSupabase();
