import { NextResponse } from "next/server";
import { schedulingRepo } from "@ai-agent/storage";
import { deleteScheduledJob } from "@ai-agent/scheduler";
import { getApiContext } from "@/lib/api-session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const job = await schedulingRepo.getScheduledJob(id);
  if (!job || job.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteScheduledJob(id);
  return NextResponse.json({ ok: true });
}
