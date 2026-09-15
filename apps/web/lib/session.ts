import { redirect } from "next/navigation";
import { auth } from "./auth";
import { tenancyRepo } from "@ai-agent/storage";

export interface CurrentContext {
  userId: string;
  userEmail: string;
  userName: string;
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "manager" | "member" | "viewer";
}

/**
 * Resolves the signed-in user and their organization. MVP simplification:
 * a user's *first* organization membership is treated as "current" — there
 * is no org switcher yet, so every account effectively has one active org.
 */
export async function requireCurrentContext(): Promise<CurrentContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await tenancyRepo.listOrgsForUser(session.user.id);
  const first = memberships[0];
  if (!first) redirect("/signup");

  return {
    userId: session.user.id,
    userEmail: session.user.email ?? "",
    userName: session.user.name ?? session.user.email ?? "User",
    orgId: first.org.id,
    orgName: first.org.name,
    role: first.role,
  };
}
