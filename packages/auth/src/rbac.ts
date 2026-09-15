import { tenancyRepo } from "@ai-agent/storage";

const ROLE_RANK = { viewer: 0, member: 1, manager: 2, admin: 3, owner: 4 } as const;
export type OrgRole = keyof typeof ROLE_RANK;

export class ForbiddenError extends Error {}

/** Throws if the user isn't a member of the org, or their role ranks below `minRole`. */
export async function requireOrgRole(orgId: string, userId: string, minRole: OrgRole): Promise<OrgRole> {
  const membership = await tenancyRepo.getMembership(orgId, userId);
  if (!membership) throw new ForbiddenError(`User ${userId} is not a member of organization ${orgId}.`);
  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new ForbiddenError(`Role "${membership.role}" does not meet the required "${minRole}" for this action.`);
  }
  return membership.role;
}

export async function getOrgRole(orgId: string, userId: string): Promise<OrgRole | undefined> {
  const membership = await tenancyRepo.getMembership(orgId, userId);
  return membership?.role;
}
