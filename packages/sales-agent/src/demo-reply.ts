/** Realistic canned assistant reply for DEMO_MODE — never a real LLM call. See packages/storage/src/demo/store.ts for the matching seed data. */
export function demoAssistantReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes("price") || lower.includes("cost") || lower.includes("pricing")) {
    return "[Simulated demo reply] Our Growth tier runs $22k/mo and covers install plus 24/7 support — want me to check if that fits your warehouse size?";
  }
  if (lower.includes("demo") || lower.includes("meeting") || lower.includes("call")) {
    return "[Simulated demo reply] I can get you on the calendar with our automation engineer — would Thursday at 2pm or Friday at 10am work better?";
  }
  if (lower.includes("timeline") || lower.includes("how long") || lower.includes("install")) {
    return "[Simulated demo reply] Typical install is 6 weeks end-to-end: 1 week site survey, 3 weeks hardware install, 2 weeks staff training.";
  }
  return "[Simulated demo reply] Thanks for sharing that — in a live deployment this would be a real, context-aware response from the agent's configured LLM. Ask about pricing, timeline, or booking a demo to see more of the flow.";
}
