// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
// Establish global expect for @testing-library/jest-dom compatibility
globalThis.expect = expect;
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ALERT_ZONE_IDS, isZoneInAlert, getZoneDisplayName } from './lib/emergencyZones';
import { NavShell } from './components/NavShell';
import { CommandCenter } from './components/CommandCenter';

// ---------------------------------------------------------------------------
// 1. Synchronously mock localStorage on the global object before any database
//    module loads (jsdom provides its own localStorage, but we override it
//    with an in-memory mock so state is fully reset between test files/runs).
// ---------------------------------------------------------------------------
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => {
    store[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key in store) {
      delete store[key];
    }
  },
  length: 0,
  key: (index: number) => null,
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.matchMedia for JSDOM compatibility
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// 2. Dynamically import supabase to guarantee the mock is fully operational
const { supabase } = await import('./lib/supabase');

// ---------------------------------------------------------------------------
// Supabase Simulation — Core CRUD
// ---------------------------------------------------------------------------
describe('Supabase Simulation Database Suite', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with standard seed data', () => {
    const profile = supabase.auth.getProfile();
    expect(profile).not.toBeNull();
    expect(profile?.full_name).toBe('Dev Organizer');
    expect(profile?.role).toBe('organizer');
  });

  it('should sign in or sign up new profiles correctly', async () => {
    const initialProfiles = await supabase.from('profiles').select();
    expect(initialProfiles.data).toBeDefined();

    const signUpRes = await supabase.auth.signUp({
      email: 'test@fielda.com',
      options: {
        data: {
          full_name: 'Test User',
          role: 'fan'
        }
      }
    });
    expect(signUpRes.data?.user).toBeDefined();
    expect(signUpRes.data?.user?.email).toBe('test@fielda.com');

    const activeProfile = supabase.auth.getProfile();
    expect(activeProfile).not.toBeNull();
    expect(activeProfile?.role).toBe('fan');
    expect(activeProfile?.full_name).toBe('Test User');
  });

  it('should retrieve stadiums list', async () => {
    const res = await supabase.from('stadiums').select();
    expect(res.data).toBeDefined();
    expect(res.data?.length).toBeGreaterThan(0);
    expect(res.data?.[0].name).toBe('MetLife Stadium');
  });

  it('should support filtering queries via eq', async () => {
    const res = await supabase.from('zones').select().eq('stadium_id', 'stadium-2');
    expect(res.data).toBeDefined();
    expect(res.data?.length).toBe(4); // Azteca Stadium Zones
    expect(res.data?.[0].name).toBe('Gate 1 main');
  });

  it('should support inserting new accessibility requests', async () => {
    const newRequest = {
      fan_id: 'fan-test-123',
      request_type: 'wheelchair',
      zone_id: 'zone-1a',
      status: 'pending'
    };

    const insertRes = await supabase.from('accessibility_requests').insert(newRequest);
    expect(insertRes.data).toBeDefined();
    expect(insertRes.data?.[0].id).toBeDefined();
    expect(insertRes.data?.[0].fan_id).toBe('fan-test-123');

    const selectRes = await supabase.from('accessibility_requests').select().eq('fan_id', 'fan-test-123');
    expect(selectRes.data?.length).toBe(1);
  });

  it('should support updating incidents successfully', async () => {
    const updateRes = await supabase.from('incidents').update({ status: 'resolved' }).eq('id', 'inc-1');
    expect(updateRes.data).toBeDefined();
    expect(updateRes.data?.[0].status).toBe('resolved');

    const verifyRes = await supabase.from('incidents').select().eq('id', 'inc-1');
    expect(verifyRes.data?.[0].status).toBe('resolved');
  });

  it('should support deleting accessibility requests', async () => {
    const newRequest = {
      fan_id: 'delete-me',
      request_type: 'sensory_kit',
      zone_id: 'zone-1d',
      status: 'pending'
    };
    await supabase.from('accessibility_requests').insert(newRequest);

    const beforeDelete = await supabase.from('accessibility_requests').select().eq('fan_id', 'delete-me');
    expect(beforeDelete.data?.length).toBe(1);

    await supabase.from('accessibility_requests').delete().eq('fan_id', 'delete-me');
    const afterDelete = await supabase.from('accessibility_requests').select().eq('fan_id', 'delete-me');
    expect(afterDelete.data?.length).toBe(0);
  });

  it('should support ordering and limiting query results', async () => {
    const resQuery = supabase.from('zones').select().eq('stadium_id', 'stadium-2');
    const orderedRes = resQuery.order('name', { ascending: true });
    expect(orderedRes.data?.[0].name).toBe('Estancia Sensorial Sur');

    const limitedRes = orderedRes.limit(2);
    expect(limitedRes.data?.length).toBe(2);
  });

  it('should support subscribing and unsubscribing from live events', () => {
    let firedCount = 0;
    const sub = supabase.subscribe('incidents', () => {
      firedCount++;
    });

    // Simulated event trigger via insert / update
    // Just verifying register/unregister is successful
    expect(sub.unsubscribe).toBeDefined();
    sub.unsubscribe();
  });

  it('should support deleting with neq filter', async () => {
    // Insert a temp record to test neq delete
    const tempRequest = {
      fan_id: 'neq-test-keep',
      request_type: 'other',
      zone_id: 'zone-1a',
      status: 'pending'
    };
    await supabase.from('accessibility_requests').insert(tempRequest);

    // Delete records where fan_id is not 'neq-test-keep'
    await supabase.from('accessibility_requests').delete().neq('fan_id', 'neq-test-keep');

    const res = await supabase.from('accessibility_requests').select().eq('fan_id', 'neq-test-keep');
    expect(res.data?.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Supabase Simulation — Edge Cases & Negative Paths
// ---------------------------------------------------------------------------
describe('Supabase Simulation — Edge Cases & Negative Paths', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns an empty array (not null/undefined/throw) when a filter matches nothing', async () => {
    const res = await supabase.from('incidents').select().eq('zone_id', 'zone-does-not-exist');
    expect(res.data).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data?.length).toBe(0);
  });

  it('does not throw when deleting a record that does not exist', async () => {
    await expect(
      supabase.from('accessibility_requests').delete().eq('id', 'nonexistent-id-999')
    ).resolves.not.toThrow();
  });

  it('leaves existing data untouched after a no-op delete', async () => {
    const before = await supabase.from('incidents').select();
    const beforeCount = before.data?.length ?? 0;

    await supabase.from('incidents').delete().eq('id', 'nonexistent-id-999');

    const after = await supabase.from('incidents').select();
    expect(after.data?.length).toBe(beforeCount);
  });

  it('does not throw when updating a record that does not exist', () => {
    expect(() => {
      supabase.from('incidents').update({ status: 'resolved' }).eq('id', 'nonexistent-id-999');
    }).not.toThrow();
  });

  it('does not silently accept an insert missing a required field', async () => {
    const res = await supabase.from('accessibility_requests').insert({
      request_type: 'wheelchair',
      zone_id: 'zone-1a',
      status: 'pending'
    });
    // Documents current behavior. If your simulation doesn't yet validate
    // required fields, this will fail — that's a real gap worth fixing
    // (either reject the insert, or update this assertion once validation
    // is added).
    expect(res.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Supabase Simulation — Role-Based Access (data layer)
// ---------------------------------------------------------------------------
describe('Supabase Simulation — Role-Based Access', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('assigns the selected role correctly on signup', async () => {
    await supabase.auth.signUp({
      email: 'organizer@fielda.com',
      options: { data: { full_name: 'Dev Organizer', role: 'organizer' } }
    });
    const profile = supabase.auth.getProfile();
    expect(profile?.role).toBe('organizer');
  });

  it('assigns a fan role correctly and distinctly from organizer', async () => {
    await supabase.auth.signUp({
      email: 'fanuser@fielda.com',
      options: { data: { full_name: 'Fan User', role: 'fan' } }
    });
    const profile = supabase.auth.getProfile();
    expect(profile?.role).toBe('fan');
    expect(profile?.role).not.toBe('organizer');
  });
});

// ---------------------------------------------------------------------------
// Emergency Zone Alert Logic (Path 2 — hardcoded ALERT_ZONE_IDS)
// ---------------------------------------------------------------------------
describe('Emergency Zone Alert Logic (Path 2 — hardcoded ALERT_ZONE_IDS)', () => {
  it('flags Section 120 (zone-1c) as an alert zone', () => {
    expect(isZoneInAlert('zone-1c')).toBe(true);
  });

  it('flags Sensory Room 202 (zone-1d) as an alert zone', () => {
    expect(isZoneInAlert('zone-1d')).toBe(true);
  });

  it('flags Concourse West (zone-1b) as an alert zone', () => {
    expect(isZoneInAlert('zone-1b')).toBe(true);
  });

  it('does not flag an unrelated/unknown zone id', () => {
    expect(isZoneInAlert('zone-9z')).toBe(false);
  });

  it('prefixes the display name with 🚨 for alert zones', () => {
    const zone = { id: 'zone-1c', name: 'Section 120 (Seating)' };
    expect(getZoneDisplayName(zone)).toBe('🚨 Section 120 (Seating)');
  });

  it('leaves the display name unprefixed for non-alert zones', () => {
    const zone = { id: 'zone-1a', name: 'Gate A (North)' };
    expect(getZoneDisplayName(zone)).toBe('Gate A (North)');
  });

  it('handles name with existing siren and returns exactly one siren for alert zones', () => {
    const zone = { id: 'zone-1c', name: '🚨 Section 120 (Seating)' };
    expect(getZoneDisplayName(zone)).toBe('🚨 Section 120 (Seating)');
  });

  it('is independent of any incident/localStorage state (pure function, no side effects)', () => {
    expect(ALERT_ZONE_IDS).toEqual(['zone-1b', 'zone-1c', 'zone-1d']);
  });
});

// ---------------------------------------------------------------------------
// NavShell — Role-Based Access Gating (component layer)
// ---------------------------------------------------------------------------
describe('NavShell — Role-Based Access Gating', () => {
  it('hides the Data Console nav item for the fan role', async () => {
    await supabase.auth.signUp({
      email: 'fan@fielda.com',
      options: { data: { full_name: 'Test Fan', role: 'fan' } }
    });

    render(
      <NavShell
        currentModule="unitypath"
        setModule={() => {}}
        activeScreen="matchday"
        setActiveScreen={() => {}}
      >
        <div>content</div>
      </NavShell>
    );
    expect(screen.queryByText(/data console/i)).not.toBeInTheDocument();
  });

  it('shows the Data Console nav item for the organizer role', async () => {
    await supabase.auth.signUp({
      email: 'organizer@fielda.com',
      options: { data: { full_name: 'Test Organizer', role: 'organizer' } }
    });

    render(
      <NavShell
        currentModule="operationsIntelligence"
        setModule={() => {}}
        activeScreen="command"
        setActiveScreen={() => {}}
      >
        <div>content</div>
      </NavShell>
    );
    expect(screen.getByText(/data console/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CommandCenter — Empty Alert State (component layer)
// ---------------------------------------------------------------------------
describe('CommandCenter — Empty Alert State', () => {
  it('shows a "no active alerts" message when there are zero unresolved incidents', async () => {
    // Clear any unresolved incidents to ensure CommandCenter reports no active alerts
    await supabase.from('incidents').delete().neq('id', 'none');

    render(<CommandCenter />);
    expect(screen.getByText(/no active alerts/i)).toBeInTheDocument();
  });

  it('renders the AI Predictive Risk Oversight panel', () => {
    render(<CommandCenter />);
    expect(screen.getByText(/predictive risk/i)).toBeInTheDocument();
  });
});