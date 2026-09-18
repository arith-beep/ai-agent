export * as tenancyRepo from "./tenancy";
export * as agentsRepo from "./agents";
import * as toolsRepoReal from "./tools";
export * as knowledgeRepo from "./knowledge";
export * as memoryRepo from "./memory";
export * as runsRepo from "./runs";
export * as messagingRepo from "./messaging";
export * as workflowsRepo from "./workflows";
export * as tasksRepo from "./tasks";
export * as policyRepo from "./policy";
export * as schedulingRepo from "./scheduling";
export * as credentialsRepo from "./credentials";
export * as auditRepo from "./audit";
import * as salesRepoReal from "./sales";
import { isDemoMode } from "../demo/config";
import { demoSalesRepo, demoToolsRepo } from "../demo/store";

/**
 * DEMO_MODE indirection: when active, calls to functions implemented in the demo store
 * are served from in-memory demo data instead of the real Supabase-backed repository.
 * Any function NOT implemented in the demo store still calls through to the real one
 * (so it fails honestly against the real DB rather than silently faking success).
 * See packages/storage/src/demo/{config,store}.ts. Production code paths are untouched
 * when DEMO_MODE is unset.
 */
function demoAware<T extends object>(real: T, demo: Record<string, unknown>): T {
  return new Proxy(real, {
    get(target, prop, receiver) {
      if (isDemoMode() && prop in demo) return demo[prop as string];
      return Reflect.get(target, prop, receiver);
    },
  }) as T;
}

export const salesRepo = demoAware(salesRepoReal, demoSalesRepo);
export const toolsRepo = demoAware(toolsRepoReal, demoToolsRepo);
