import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { tenancyRepo } from "@ai-agent/storage";

const bodySchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const tokenRow = await tenancyRepo.getValidPasswordResetToken(tokenHash);
  if (!tokenRow) return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await tenancyRepo.updateUserPassword(tokenRow.userId, passwordHash);
  await tenancyRepo.markPasswordResetTokenUsed(tokenRow.id);

  return NextResponse.json({ ok: true });
}
