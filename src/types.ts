export type UserRole = 'fan' | 'organizer';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  language_pref: string;
  created_at: string;
}

export interface Stadium {
  id: string;
  name: string;
  capacity: number;
  city: string;
  lat: number;
  lng: number;
}

export interface Zone {
  id: string;
  stadium_id: string;
  name: string;
  type: string; // 'seating' | 'concourse' | 'gate' | 'sensory' | 'executive'
  capacity: number;
  current_occupancy: number;
}

export interface Staff {
  id: string;
  stadium_id: string;
  name: string;
  role: string;
  language: string;
  zone_id: string;
  status: 'on_duty' | 'off_duty' | 'standby';
  shift_start: string;
  shift_end: string;
}

export interface Incident {
  id: string;
  stadium_id: string;
  zone_id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'dispatched' | 'resolved';
  description: string;
  created_at: string;
  assigned_role?: string;
  assigned_staff_name?: string;
  assigned_reason?: string;
  fan_message?: string;
}

export interface CommsMessage {
  id: string;
  channel: string; // e.g., 'operations', 'zone-A', 'medical'
  original_text: string;
  original_lang: string;
  translated_text: string;
  translated_lang?: string;
  sender: string;
  created_at: string;
}

export interface CrowdMetric {
  id: string;
  stadium_id: string;
  zone_id: string;
  occupancy_pct: number;
  timestamp: string;
}

export interface AIPrediction {
  id: string;
  stadium_id: string;
  zone_id: string;
  predicted_congestion_pct: number;
  confidence: number; // 0 to 100
  forecast_time: string; // e.g., '+30 mins'
  suggested_action: string;
}

export interface AccessibilityRequest {
  id: string;
  fan_id: string;
  request_type: 'wheelchair' | 'sign_language' | 'sensory_kit' | 'guiding_companion';
  zone_id: string;
  status: 'pending' | 'assigned' | 'completed';
  created_at: string;
}

export interface SensoryReading {
  id: string;
  zone_id: string;
  noise_level: number; // in dB, e.g. 85
  strobe_active: boolean;
  quiet_room_capacity: number; // e.g. 15 remaining
  timestamp: string;
}

export interface AssistantConversation {
  id: string;
  fan_id: string;
  message: string;
  sender: 'fan' | 'ai';
  language: string;
  created_at: string;
}
