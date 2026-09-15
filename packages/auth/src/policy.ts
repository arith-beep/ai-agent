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

export { policyRepo };
