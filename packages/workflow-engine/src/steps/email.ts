import type { NodeHandler } from "../types";

/**
 * Sends via the Resend API (https://resend.com). Requires RESEND_API_KEY and
 * RESEND_FROM_ADDRESS to be configured platform-wide; fails clearly rather
 * than silently no-op'ing when they aren't, since a workflow author needs
 * to know their email step didn't actually send anything.
 */
export const sendEmailStepHandler: NodeHandler = async (node) => {
  if (node.type !== "send_email") throw new Error("sendEmailStepHandler received a non-send_email node");
  const config = node.config as { to: string; subject: string; body: string };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_ADDRESS;
  if (!apiKey || !from) {
    throw new Error("Email sending is not configured. Set RESEND_API_KEY and RESEND_FROM_ADDRESS to enable send_email steps.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: config.to, subject: config.subject, text: config.body }),
  });
  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { id: string };
  return { type: "ok", output: { emailId: data.id } };
};
