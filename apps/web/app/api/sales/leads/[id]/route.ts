import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

const patchSchema = z.object({
  name: z.string().max(150).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(150).optional(),
  notes: z.string().max(4000).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const lead = await salesRepo.getLead(ctx.orgId, id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [qualificationHistory, meetings, conversations] = await Promise.all([
    salesRepo.listQualificationHistory(id),
    salesRepo.listMeetingsForLead(id),
    salesRepo.listConversations(ctx.orgId, {}),
  ]);
  const leadConversations = conversations.filter((c) => c.conversation.leadId === id);

  return NextResponse.json({ lead, qualificationHistory, meetings, conversations: leadConversations });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await salesRepo.getLead(ctx.orgId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const lead = await salesRepo.updateLeadFields(ctx.orgId, id, parsed.data);
  return NextResponse.json({ lead });
}
