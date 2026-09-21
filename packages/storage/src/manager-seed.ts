import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import * as schema from "./schema/index";

/**
 * Seeds realistic demo data for the AI Sales Manager, matching the exact
 * "Agent 1/2/3/4" scenario from the product's own requirements roleplay:
 * a rep with a single zero-sales day, a rep trending below their own
 * baseline for 3 days, a top performer, and a rep with an open compliance
 * flag. Every row this script writes has isSeed=true so it is always
 * identifiable and removable, and it deletes only its OWN prior seed rows
 * for this org before reseeding — it never touches real (isSeed=false) data.
 *
 * Usage: MANAGER_SEED_ORG_ID=<uuid> DATABASE_URL=... pnpm --filter @ai-agent/storage db:seed:manager
 */

async function main() {
  const url = process.env.DATABASE_URL;
  const rawOrgId = process.env.MANAGER_SEED_ORG_ID;
  if (!url) throw new Error("DATABASE_URL is not set.");
  if (!rawOrgId) throw new Error("MANAGER_SEED_ORG_ID is not set — refusing to guess which org to seed into.");
  // Rebound to a definite `string` — a `const` narrowed by the check above doesn't stay narrowed inside nested closures below.
  const orgId: string = rawOrgId;

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql, { schema });

  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) });
  if (!org) throw new Error(`No organization found with id ${orgId}.`);

  console.log(`Seeding AI Sales Manager demo data into org "${org.name}" (${orgId})...`);

  // Idempotent: remove this org's own prior seed rows (cascades to snapshots/coaching/threads/compliance for seeded reps) before reseeding.
  await db.delete(schema.salesReps).where(and(eq(schema.salesReps.orgId, orgId), eq(schema.salesReps.isSeed, true)));
  await db.delete(schema.openThreads).where(and(eq(schema.openThreads.orgId, orgId), eq(schema.openThreads.isSeed, true)));
  await db.delete(schema.complianceCases).where(and(eq(schema.complianceCases.orgId, orgId), eq(schema.complianceCases.isSeed, true)));
  await db.delete(schema.teamFocusAreas).where(and(eq(schema.teamFocusAreas.orgId, orgId), eq(schema.teamFocusAreas.isSeed, true)));

  const REP_NAMES = [
    "Priya Anand", // Agent 1: one zero-sales day, otherwise normal
    "Marcus Webb", // Agent 2: trending below own baseline for 3 days
    "Dana Osei", // Agent 3: top performer this week
    "Jordan Lee", // Agent 4: has an open compliance flag
    "Sam Rivera",
    "Taylor Brooks",
    "Casey Kim",
    "Morgan Diaz",
    "Alex Chen",
    "Riley Foster",
  ];

  const reps: (typeof schema.salesReps.$inferSelect)[] = [];
  for (const name of REP_NAMES) {
    const [rep] = await db
      .insert(schema.salesReps)
      .values({ orgId, name, team: "Team A", isSeed: true })
      .returning();
    if (!rep) throw new Error(`Failed to insert rep "${name}".`);
    reps.push(rep);
  }
  const byName = new Map(reps.map((r) => [r.name, r]));
  function repByName(name: string): typeof schema.salesReps.$inferSelect {
    const rep = byName.get(name);
    if (!rep) throw new Error(`Seeded rep "${name}" not found.`);
    return rep;
  }
  const priya = repByName("Priya Anand");
  const marcus = repByName("Marcus Webb");
  const dana = repByName("Dana Osei");
  const jordan = repByName("Jordan Lee");
  const rest = reps.filter((r) => ![priya.id, marcus.id, dana.id, jordan.id].includes(r.id));

  function daysAgo(n: number): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - n);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  async function snapshot(repId: string, dayOffset: number, values: { dials: number; connects: number; appointments: number; sales: number; talkTimeMinutes: number }) {
    await db.insert(schema.repPerformanceSnapshots).values({ orgId, repId, date: daysAgo(dayOffset), ...values, isSeed: true });
  }

  // 14 days of history per rep, with the specific scenarios baked in for days 0-2 (most recent 3 days).
  for (const rep of reps) {
    for (let day = 13; day >= 3; day--) {
      // Baseline weeks: everyone performs normally, with small natural variance.
      const base = 8 + Math.floor(Math.random() * 4);
      await snapshot(rep.id, day, {
        dials: 40 + Math.floor(Math.random() * 15),
        connects: 12 + Math.floor(Math.random() * 6),
        appointments: 3 + Math.floor(Math.random() * 3),
        sales: base > 9 ? 2 : 1,
        talkTimeMinutes: 90 + Math.floor(Math.random() * 30),
      });
    }
  }

  // Last 3 days: the exact scenario.
  for (let day = 2; day >= 0; day--) {
    // Priya: one zero-sales day (day 2, i.e. "Friday"), otherwise recovers.
    await snapshot(priya.id, day, {
      dials: 42,
      connects: 13,
      appointments: day === 2 ? 3 : 3,
      sales: day === 2 ? 0 : 1,
      talkTimeMinutes: 95,
    });

    // Marcus: below his own baseline for all 3 recent days — normal dials, weak conversion.
    await snapshot(marcus.id, day, { dials: 44, connects: 11, appointments: 1, sales: 0, talkTimeMinutes: 80 });

    // Dana: strong week, clearly above baseline.
    await snapshot(dana.id, day, { dials: 50, connects: 18, appointments: 6, sales: 3, talkTimeMinutes: 110 });

    // Jordan: normal performance (the issue this week is compliance, not output).
    await snapshot(jordan.id, day, { dials: 43, connects: 13, appointments: 3, sales: 1, talkTimeMinutes: 92 });

    for (const rep of rest) {
      await snapshot(rep.id, day, { dials: 41, connects: 12, appointments: 3, sales: 1, talkTimeMinutes: 90 });
    }
  }

  // Coaching session for Marcus, matching the roleplay's diagnosis and outcome tracking.
  await db.insert(schema.coachingSessions).values({
    orgId,
    repId: marcus.id,
    diagnosedCause: "confidence",
    summary: "Compared a strong call from two weeks ago against this week's calls — same technique, less conviction. Leads and effort both checked out normal.",
    agreedFocus: "Let the customer finish their objection before responding, instead of jumping in early.",
    followUpDate: daysAgo(-4),
    outcome: "pending",
    isSeed: true,
  });

  // Open threads — including one already resolved, to show the tracker isn't just a todo list.
  await db.insert(schema.openThreads).values([
    { orgId, repId: priya.id, description: "Quiet check-in after Friday's zero-sales day.", category: "follow_up", isSeed: true },
    { orgId, description: "Confirm the fresh lead batch loaded correctly before the floor starts.", category: "operational", status: "done", resolvedAt: new Date(), isSeed: true },
  ]);

  // Compliance case for Jordan — open, awaiting human review.
  await db.insert(schema.complianceCases).values({
    orgId,
    repId: jordan.id,
    source: "qa_review",
    severity: "high",
    description: "QA sampling flagged possible overstatement of the guaranteed payout clause on a recorded call — needs a human listen before any conclusion.",
    isSeed: true,
  });

  // This week's team focus.
  const monday = daysAgo(2);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  await db.insert(schema.teamFocusAreas).values({
    orgId,
    weekOf: monday,
    theme: "Let objections breathe before responding",
    rationale: "Surfaced independently in coaching with Marcus this week — worth watching for elsewhere before calling it team-wide.",
    isSeed: true,
  });

  console.log(`Seeded ${reps.length} reps, 14 days of performance history, 1 coaching session, 2 open threads, 1 compliance case, 1 focus area.`);
  console.log("All rows are tagged isSeed=true and can be identified/removed independently of real data.");

  await sql.end();
}

main().catch((error) => {
  console.error("Manager seed failed:", error);
  process.exit(1);
});
