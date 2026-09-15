import { auth } from "./auth";
import { tenancyRepo } from "@ai-agent/storage";
import type { CurrentContext } from "./session";

/** Same resolution as requireCurrentContext(), but returns null instead of redirecting — for use in API route handlers. */
export async function getApiContext(): Promise<CurrentContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const memberships = await tenancyRepo.listOrgsForUser(session.user.id);
  const first = memberships[0];
  if (!first) return null;

  return {
    userId: session.user.id,
    userEmail: session.user.email ?? "",
    userName: session.user.name ?? session.user.email ?? "User",
    orgId: first.org.id,
    orgName: first.org.name,
    role: first.role,
  };
}
