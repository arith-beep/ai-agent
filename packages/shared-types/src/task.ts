import { z } from "zod";
import { participantTypeSchema, messagePrioritySchema } from "./message";

export const taskStatusSchema = z.enum(["open", "in_progress", "blocked", "in_review", "done", "cancelled"]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const createTaskInputSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  ownerType: participantTypeSchema,
  ownerId: z.string().uuid(),
  createdByType: participantTypeSchema,
  createdById: z.string().uuid(),
  priority: messagePrioritySchema.default("normal"),
  departmentId: z.string().uuid().optional(),
  project: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  dependsOnTaskIds: z.array(z.string().uuid()).default([]),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
