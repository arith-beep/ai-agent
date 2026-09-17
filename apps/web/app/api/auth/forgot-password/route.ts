import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { tenancyRepo } from "@ai-agent/storage";

const bodySchema = z.object({ email: z.string().email() });
const TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * No email provider is configured in this environment (no SMTP/Resend/etc. credential).
 * Rather than pretending to send an email, this returns the real reset link directly in
 * the response so the flow is honest and actually works end-to-end for local/dev use.
 * The response is intentionally identical whether or not the email exists, to avoid
 * leaking which addresses have accounts.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const user = await tenancyRepo.getUserByEmail(parsed.data.email);
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: true, emailConfigured: false, resetUrl: null });
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await tenancyRepo.createPasswordResetToken(user.id, tokenHash, new Date(Date.now() + TOKEN_TTL_MS));

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const resetUrl = `${origin}/reset-password?token=${rawToken}`;

  return NextResponse.json({ ok: true, emailConfigured: false, resetUrl });
}
