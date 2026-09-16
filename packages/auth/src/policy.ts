import { policyRepo } from "@ai-agent/storage";

/** Simple glob-style match: "email.*" matches "email.send"; "*" matches everything. */
export function matchesActionPattern(pattern: string, action: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith(".*")) return action.startsWith(pattern.slice(0, -1));
  return pattern === action;
}

export async function findMatchingPolicy(orgId: string, action: string) {
  const policies = await policyRepo.listPoliciesForOrg(orgId);
  return policies.find((p) => matchesActionPattern(p.actionPattern, action));
}

export async function actionRequiresApproval(orgId: string, action: string): Promise<boolean> {
  const policy = await findMatchingPolicy(orgId, action);
  return policy?.requiresApproval ?? false;
}

export interface AgentPermissionLike {
  actionPattern: string;
  requiresApproval: boolean;
  approverRole?: string | null;
}

export interface ApprovalRequirement {
  requiresApproval: boolean;
  approverRole?: string;
  policyId?: string;
}

/**
 * Resolves whether an action needs approval and who may grant it, checking
 * the agent's own permission overrides first (more specific) and falling
 * back to org-wide policy. A `false` from either source doesn't clear a
 * `true` from the other — approval requirements only ever add up, never
 * cancel out, so a stricter org policy can't be bypassed by a looser
 * per-agent permission.
 */
export async function resolveApprovalRequirement(
  orgId: string,
  action: string,
  agentPermissions: AgentPermissionLike[] = [],
): Promise<ApprovalRequirement> {
  const matchedPermission = agentPermissions.find((p) => matchesActionPattern(p.actionPattern, action));
  const policy = await findMatchingPolicy(orgId, action);

  const requiresApproval = Boolean(matchedPermission?.requiresApproval) || Boolean(policy?.requiresApproval);
  const approverRole = matchedPermission?.approverRole ?? policy?.approverRole ?? undefined;

  return { requiresApproval, approverRole: approverRole ?? undefined, policyId: policy?.id };
}

export { policyRepo };
