import { z } from "zod";

/**
 * Structured configuration for the Sales Agent Builder — kept as discrete
 * fields (not one giant prompt string) so the builder UI can render a real
 * form and the runtime can deterministically compile a system prompt from
 * it. See packages/sales-agent's system-prompt.ts for the compiler.
 */

export const salesIdentitySchema = z.object({
  name: z.string().min(1).max(100),
  companyName: z.string().min(1).max(150),
  role: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  language: z.string().min(2).max(10).default("en"),
  tone: z.enum(["professional", "friendly", "consultative", "direct", "enthusiastic"]).default("professional"),
  personality: z.array(z.string().max(60)).max(10).default([]),
});
export type SalesIdentity = z.infer<typeof salesIdentitySchema>;

export const qualificationCriterionSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(400).optional(),
});
export type QualificationCriterion = z.infer<typeof qualificationCriterionSchema>;

export const objectionHandlingEntrySchema = z.object({
  objection: z.string().min(1).max(300),
  response: z.string().min(1).max(1000),
});

export const salesPlaybookSchema = z.object({
  primaryObjective: z.string().min(1).max(500),
  targetCustomer: z.string().max(1000).optional(),
  salesProcess: z.string().max(2000).optional(),
  qualificationCriteria: z.array(qualificationCriterionSchema).max(20).default([]),
  qualificationQuestions: z.array(z.string().max(300)).max(20).default([]),
  discoveryQuestions: z.array(z.string().max(300)).max(20).default([]),
  valueProposition: z.string().max(2000).optional(),
  productPositioning: z.string().max(2000).optional(),
  objectionHandling: z.array(objectionHandlingEntrySchema).max(30).default([]),
  cta: z.string().max(500).optional(),
  closingBehavior: z.string().max(1000).optional(),
  followUpBehavior: z.string().max(1000).optional(),
});
export type SalesPlaybook = z.infer<typeof salesPlaybookSchema>;

export const maxAutonomySchema = z.enum(["suggest_only", "act_with_confirmation", "full_autonomy"]);

export const requiredInfoBeforeActionSchema = z.object({
  action: z.string().min(1).max(150),
  requiredFields: z.array(z.string().max(80)).min(1),
});

export const salesGuardrailsSchema = z.object({
  allowedTopics: z.array(z.string().max(150)).max(30).default([]),
  disallowedTopics: z.array(z.string().max(150)).max(30).default([]),
  escalationTriggers: z.array(z.string().max(300)).max(20).default([]),
  prohibitedClaims: z.array(z.string().max(300)).max(20).default([]),
  requiredInfoBeforeActions: z.array(requiredInfoBeforeActionSchema).max(20).default([]),
  maxAutonomy: maxAutonomySchema.default("act_with_confirmation"),
});
export type SalesGuardrails = z.infer<typeof salesGuardrailsSchema>;

export const salesAgentConfigSchema = z.object({
  identity: salesIdentitySchema,
  playbook: salesPlaybookSchema,
  guardrails: salesGuardrailsSchema,
  modelProvider: z.enum(["openai", "anthropic", "google"]).default("openai"),
  modelName: z.string().min(1).default("gpt-4o-mini"),
  temperature: z.number().min(0).max(2).default(0.5),
  maxTokens: z.number().int().positive().max(200_000).default(2048),
});
export type SalesAgentConfig = z.infer<typeof salesAgentConfigSchema>;

// ---------------------------------------------------------------------------
// Tool input contracts (validated server-side in packages/tools/src/builtin)
// ---------------------------------------------------------------------------

export const salesLeadStatusValues = [
  "new",
  "engaged",
  "qualified",
  "unqualified",
  "meeting_requested",
  "meeting_booked",
  "human_handoff",
] as const;
export const salesLeadStatusSchema = z.enum(salesLeadStatusValues);
export type SalesLeadStatus = z.infer<typeof salesLeadStatusSchema>;

export const upsertLeadToolInputSchema = z.object({
  name: z.string().max(150).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(150).optional(),
  interest: z.string().max(500).optional(),
  budget: z.string().max(150).optional(),
  timeline: z.string().max(150).optional(),
  notes: z.string().max(2000).optional(),
  qualificationStatus: salesLeadStatusSchema.optional(),
  qualificationCriteria: z.record(z.string(), z.unknown()).optional(),
  statusReason: z
    .string()
    .max(500)
    .optional()
    .describe("Required when setting qualificationStatus: why the lead reached this status, based only on what they actually said."),
});
export type UpsertLeadToolInput = z.infer<typeof upsertLeadToolInputSchema>;

export const bookMeetingToolInputSchema = z.object({
  proposedTime: z.string().datetime().describe("ISO-8601 timestamp the lead proposed or agreed to — never invent a time they didn't state."),
  durationMinutes: z.number().int().positive().max(240).default(30),
  notes: z.string().max(1000).optional(),
});
export type BookMeetingToolInput = z.infer<typeof bookMeetingToolInputSchema>;

export const requestHandoffToolInputSchema = z.object({
  reason: z.string().min(1).max(1000),
  urgency: z.enum(["low", "normal", "high"]).default("normal"),
});
export type RequestHandoffToolInput = z.infer<typeof requestHandoffToolInputSchema>;
