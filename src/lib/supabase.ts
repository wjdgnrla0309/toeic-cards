"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Project URL and the public "anon" key. Both are meant to be public: every
 * table is protected by row level security (supabase/migrations). Never put
 * the service_role key here.
 */
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

export const cloudEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!cloudEnabled) throw new Error("Supabase is not configured");
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
