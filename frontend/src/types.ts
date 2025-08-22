export type Person = {
  image_url?: string;
  id?: number;
  full_name: string;
  known_aliases: string[];
  dob?: string;
  gender?: string;
  nationality?: string;
  current_address?: string;
  gang_affiliation?: string;

  known_associates?: string[];
  organization_ties?: string[];
  recent_contacts?: string[];
  suspected_informant?: 'yes' | 'no' | 'unknown';

  last_known_location?: string;
  known_vehicles?: { make: string; model: string; color: string; plate: string }[];
  radio_frequencies?: string[];
  tracked_devices?: string[];
  recent_movements?: string[];
  cctv_snapshots?: string[];
  intercepted_audio?: string[];

  personality_notes?: string;
  behavioral_patterns?: string;
  blackmail_material?: string;
  linked_reports?: string[];

  created_by?: string;
  last_updated?: string;
  internal_flags?: string[];
  access_level?: 'public' | 'agent-only' | 'handler-only';
};

/** Authenticated agent/operator shape used across the UI */
export type Agent = {
  id: string;
  name: string;
  rank: string;
  clearance: string;
};

/** Intel document as returned by the backend API */
export type Intel = {
  id: number;
  title: string;
  summary: string;
  linked_persons?: string[];
  linked_reports?: string[];
  operation_code?: string;
  status?: string;
  source?: string;
  created_by?: string;
  last_updated?: string;
};
