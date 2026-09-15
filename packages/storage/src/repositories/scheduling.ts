import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function createScheduledJob(input: {
  orgId: string;
  targetType: "agent" | "workflow";
  targetId: string;
  cronExpression?: string;
  runOnceAt?: Date;
  nextRunAt?: Date;
  createdBy: string;
}) {
  const db = getDb();
  const [job] = await db
    .insert(schema.scheduledJobs)
    .values({
      orgId: input.orgId,
      targetType: input.targetType,
      targetId: input.targetId,
      cronExpression: input.cronExpression,
      runOnceAt: input.runOnceAt,
      nextRunAt: input.nextRunAt,
      createdBy: input.createdBy,
      status: "active",
    })
    .returning();
  if (!job) throw new Error("Failed to create scheduled job");
  return job;
}

export async function listScheduledJobs(orgId: string) {
  const db = getDb();
  return db.query.scheduledJobs.findMany({ where: eq(schema.scheduledJobs.orgId, orgId) });
}

export async function getScheduledJob(id: string) {
  const db = getDb();
  return db.query.scheduledJobs.findFirst({ where: eq(schema.scheduledJobs.id, id) });
}

export async function setScheduledJobStatus(id: string, status: (typeof schema.scheduledJobStatusEnum.enumValues)[number]) {
  const db = getDb();
  await db.update(schema.scheduledJobs).set({ status }).where(eq(schema.scheduledJobs.id, id));
}

export async function recordScheduledJobFired(id: string, lastRunAt: Date, nextRunAt?: Date) {
  const db = getDb();
  await db.update(schema.scheduledJobs).set({ lastRunAt, nextRunAt }).where(eq(schema.scheduledJobs.id, id));
}

export async function deleteScheduledJob(id: string) {
  const db = getDb();
  await db.delete(schema.scheduledJobs).where(eq(schema.scheduledJobs.id, id));
}
