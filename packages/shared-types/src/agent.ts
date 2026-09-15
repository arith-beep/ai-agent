import { z } from "zod";
import { modelRefSchema } from "./model";

export const agentStatusSchema = z.enum(["draft", "enabled", "disabled"]);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const agentPermissionSchema = z.object({
  actionPattern: z.string().min(1),
  requiresApproval: z.boolean(),
  approverRole: z.string().optional(),
});
export type AgentPermission = z.infer<typeof agentPermissionSchema>;

export const createAgentInputSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  departmentId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  objective: z.string().max(2000).optional(),
  systemPrompt: z.string().min(1),
  model: modelRefSchema,
  fallbackModel: modelRefSchema.partial({ temperature: true, maxTokens: true }).optional(),
  managerAgentId: z.string().uuid().optional(),
  humanManagerId: z.string().uuid().optional(),
  toolIds: z.array(z.string().uuid()).default([]),
  knowledgeBaseIds: z.array(z.string().uuid()).default([]),
  permissions: z.array(agentPermissionSchema).default([]),
});
export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;

export const updateAgentInputSchema = createAgentInputSchema.partial().extend({
  status: agentStatusSchema.optional(),
});
export type UpdateAgentInput = z.infer<typeof updateAgentInputSchema>;

export const agentConnectionTypeSchema = z.enum(["peer", "reports_to", "manages", "delegates_to"]);
export type AgentConnectionType = z.infer<typeof agentConnectionTypeSchema>;
