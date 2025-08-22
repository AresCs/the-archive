// Local type for the Intel Files feature (richer than the shared "Intel")
export type IntelDoc = {
  id: number;
  title: string;
  summary: string;

  // Entities / links
  linked_persons: string[];
  linked_reports?: string[];

  // Evidence & context
  blackmail_material?: string; // "Evidance" in UI
  source?: string;
  collection_method?: string;
  classification?: string;
  linked_organizations?: string[];
  linked_operations?: string[];

  // Ops / meta
  operation_code?: string;
  status?: string;

  // Meta
  created_by?: string;
  last_updated?: string;

  // Present in API but not shown
  incident_date?: string;
  location?: unknown;
  attachments?: unknown;
};
