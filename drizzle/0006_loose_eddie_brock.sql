CREATE TYPE "public"."coaching_cause" AS ENUM('effort', 'leads', 'confidence', 'skill', 'script', 'other');--> statement-breakpoint
CREATE TYPE "public"."coaching_outcome" AS ENUM('pending', 'worked', 'partially_worked', 'not_worked', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."compliance_case_status" AS ENUM('open', 'under_review', 'resolved', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."compliance_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."open_thread_category" AS ENUM('commitment', 'follow_up', 'operational', 'other');--> statement-breakpoint
CREATE TYPE "public"."open_thread_status" AS ENUM('open', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."rep_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "coaching_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"rep_id" uuid NOT NULL,
	"manager_user_id" uuid,
	"session_date" timestamp with time zone DEFAULT now() NOT NULL,
	"diagnosed_cause" "coaching_cause",
	"summary" text,
	"agreed_focus" text NOT NULL,
	"follow_up_date" timestamp with time zone,
	"outcome" "coaching_outcome" DEFAULT 'pending' NOT NULL,
	"outcome_notes" text,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"rep_id" uuid NOT NULL,
	"flagged_by_user_id" uuid,
	"flagged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"severity" "compliance_severity" DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"status" "compliance_case_status" DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"rep_id" uuid,
	"manager_user_id" uuid,
	"description" text NOT NULL,
	"category" "open_thread_category" DEFAULT 'commitment' NOT NULL,
	"due_at" timestamp with time zone,
	"status" "open_thread_status" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rep_performance_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"rep_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"dials" integer DEFAULT 0 NOT NULL,
	"connects" integer DEFAULT 0 NOT NULL,
	"appointments" integer DEFAULT 0 NOT NULL,
	"sales" integer DEFAULT 0 NOT NULL,
	"talk_time_minutes" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"notes" text,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_reps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"team" text,
	"status" "rep_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp with time zone,
	"notes" text,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_focus_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"week_of" timestamp with time zone NOT NULL,
	"theme" text NOT NULL,
	"rationale" text,
	"adoption_notes" text,
	"created_by_user_id" uuid,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_rep_id_sales_reps_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_cases" ADD CONSTRAINT "compliance_cases_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_cases" ADD CONSTRAINT "compliance_cases_rep_id_sales_reps_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_cases" ADD CONSTRAINT "compliance_cases_flagged_by_user_id_users_id_fk" FOREIGN KEY ("flagged_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_cases" ADD CONSTRAINT "compliance_cases_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_threads" ADD CONSTRAINT "open_threads_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_threads" ADD CONSTRAINT "open_threads_rep_id_sales_reps_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_threads" ADD CONSTRAINT "open_threads_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rep_performance_snapshots" ADD CONSTRAINT "rep_performance_snapshots_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rep_performance_snapshots" ADD CONSTRAINT "rep_performance_snapshots_rep_id_sales_reps_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_reps" ADD CONSTRAINT "sales_reps_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_reps" ADD CONSTRAINT "sales_reps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_focus_areas" ADD CONSTRAINT "team_focus_areas_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_focus_areas" ADD CONSTRAINT "team_focus_areas_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rep_snapshots_rep_date_idx" ON "rep_performance_snapshots" USING btree ("rep_id","date");--> statement-breakpoint
CREATE INDEX "sales_reps_org_idx" ON "sales_reps" USING btree ("org_id");