import { DEMO_ORG_ID, DEMO_USER_ID } from "@ai-agent/storage";
import type { CurrentContext } from "./session";

/**
 * Temporary demo-mode flag for live presentations when the real Supabase database is
 * unreachable. Never affects behavior unless DEMO_MODE=true is set. See
 * packages/storage/src/demo/{config,store}.ts for the data these bypass into.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export const DEMO_CONTEXT: CurrentContext = {
  userId: DEMO_USER_ID,
  userEmail: "demo@aurorarobotics.ai",
  userName: "Demo User",
  orgId: DEMO_ORG_ID,
  orgName: "Aurora Robotics",
  role: "owner",
};
