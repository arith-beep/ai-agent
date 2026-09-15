import { pgTable, uuid, timestamp, pgEnum, customType, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations, users } from "./tenancy";
import { modelProviderEnum } from "./agents";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const modelCredentials = pgTable(
  "model_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: modelProviderEnum("provider").notNull(),
    encryptedApiKey: bytea("encrypted_api_key").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("model_credentials_org_provider_idx").on(table.orgId, table.provider)],
);
