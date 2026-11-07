import { env, useSupabase, assertConfigured } from "../env";
import { localRepo } from "./local";
import { supabaseRepo } from "./supabase";
import type { Repo } from "./types";
export type { Repo } from "./types";

/** Data access for this request. */
export async function getRepo(): Promise<Repo> {
  assertConfigured();
  if (!useSupabase) return localRepo();
  const { supabaseUser, supabaseService } = await import("../supabase/server");
  return supabaseRepo(await supabaseUser(), supabaseService());
}
export { env };
