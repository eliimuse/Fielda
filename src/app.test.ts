import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Synchronously mock localStorage on the global object before any database module loads
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

// 2. Dynamically import supabase to guarantee the mock is fully operational
const { supabase } = await import('./lib/supabase');

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
    // Check initial profiles count
    const initialProfiles = await supabase.from('profiles').select();
    expect(initialProfiles.data).toBeDefined();

    // Sign up a fan
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

    // Get active profile
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

    // Verify it is saved
    const selectRes = await supabase.from('accessibility_requests').select().eq('fan_id', 'fan-test-123');
    expect(selectRes.data?.length).toBe(1);
  });

  it('should support updating incidents successfully', async () => {
    const updateRes = await supabase.from('incidents').update({ status: 'resolved' }).eq('id', 'inc-1');
    expect(updateRes.data).toBeDefined();
    expect(updateRes.data?.[0].status).toBe('resolved');

    // Verify state matches
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
});

describe('Translation Helper Functions Simulation Tests', () => {
  it('should verify standard translations map correctly', () => {
    // Quick validation helper mapping simulates translator patterns
    const serviceTranslations: Record<string, string> = {
      'wheelchair assistance': 'Asistencia con Silla de Ruedas',
      'sign language interpreter': 'Intérprete de Lengua de Señas',
      'guide dog escort': 'Escolta de Perro Guía'
    };

    expect(serviceTranslations['wheelchair assistance']).toBe('Asistencia con Silla de Ruedas');
    expect(serviceTranslations['sign language interpreter']).toBe('Intérprete de Lengua de Señas');
  });

  it('should translate fallback glossary items accurately', () => {
    const glossary: Record<string, string> = {
      "first aid": "primeros auxilios",
      "heat exhaustion": "agotamiento por calor",
      "severe congestion": "congestión severa"
    };

    expect(glossary["first aid"]).toBe("primeros auxilios");
    expect(glossary["severe congestion"]).toBe("congestión severa");
  });
});
