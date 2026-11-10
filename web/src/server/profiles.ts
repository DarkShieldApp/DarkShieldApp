/** Persisted public.profiles row. UUIDs and TIMESTAMPTZ arrive as JSON strings. */
export type Profile = {
  id: string;
  display_name: string | null;
  /** Integer from 1 to 100; enforced by PostgreSQL, not by this static type. */
  trust_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
