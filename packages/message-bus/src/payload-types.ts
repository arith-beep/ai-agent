import type { z } from "zod";
import type { taskMessagePayloadSchema, responseMessagePayloadSchema } from "@ai-agent/shared-types";

export type TaskMessagePayload = z.infer<typeof taskMessagePayloadSchema>;
export type ResponseMessagePayload = z.infer<typeof responseMessagePayloadSchema>;
