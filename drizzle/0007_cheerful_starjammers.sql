CREATE TYPE "public"."manager_brief_type" AS ENUM('morning_brief', 'coaching_prep', 'eod_report');--> statement-breakpoint
CREATE TABLE "manager_agent_config" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"model_provider" "model_provider" NOT NULL,
	"model_name" text NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" "manager_brief_type" NOT NULL,
	"rep_id" uuid,
	"model_provider" "model_provider" NOT NULL,
	"model_name" text NOT NULL,
	"content" jsonb NOT NULL,
	"evidence_rep_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_case_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_thread_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dropped_claims_count" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manager_agent_config" ADD CONSTRAINT "manager_agent_config_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_agent_config" ADD CONSTRAINT "manager_agent_config_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_briefs" ADD CONSTRAINT "manager_briefs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_briefs" ADD CONSTRAINT "manager_briefs_rep_id_sales_reps_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manager_briefs_org_type_idx" ON "manager_briefs" USING btree ("org_id","type","generated_at");--> statement-breakpoint
CREATE INDEX "manager_briefs_rep_idx" ON "manager_briefs" USING btree ("rep_id");