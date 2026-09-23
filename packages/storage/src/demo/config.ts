/**
 * DEMO_MODE is a temporary, explicitly-isolated fallback for live demos when the real
 * Supabase database is unreachable. It never touches production code paths unless this
 * flag is set — see repositories/index.ts for where it's wired in.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
