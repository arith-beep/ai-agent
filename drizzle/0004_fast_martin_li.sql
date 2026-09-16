CREATE TYPE "public"."sales_agent_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."sales_conversation_status" AS ENUM('active', 'handoff', 'closed');--> statement-breakpoint
CREATE TYPE "public"."sales_handoff_status" AS ENUM('pending', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."sales_knowledge_source_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sales_knowledge_source_type" AS ENUM('text', 'url', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."sales_lead_status" AS ENUM('new', 'engaged', 'qualified', 'unqualified', 'meeting_requested', 'meeting_booked', 'human_handoff');--> statement-breakpoint
CREATE TYPE "public"."sales_max_autonomy" AS ENUM('suggest_only', 'act_with_confirmation', 'full_autonomy');--> statement-breakpoint
CREATE TYPE "public"."sales_meeting_status" AS ENUM('requested', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sales_message_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TABLE "sales_agent_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"tool_id" uuid NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_agent_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"config_snapshot" jsonb NOT NULL,
	"generated_system_prompt" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"company_name" text NOT NULL,
	"role" text NOT NULL,
	"description" text,
	"language" text DEFAULT 'en' NOT NULL,
	"tone" text DEFAULT 'professional' NOT NULL,
	"personality" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"playbook" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"guardrails" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_provider" "model_provider" DEFAULT 'openai' NOT NULL,
	"model_name" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"temperature" real DEFAULT 0.5 NOT NULL,
	"max_tokens" integer DEFAULT 2048 NOT NULL,
	"status" "sales_agent_status" DEFAULT 'draft' NOT NULL,
	"avatar_url" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"lead_id" uuid,
	"channel" text DEFAULT 'playground' NOT NULL,
	"status" "sales_conversation_status" DEFAULT 'active' NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_handoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"lead_id" uuid,
	"reason" text NOT NULL,
	"status" "sales_handoff_status" DEFAULT 'pending' NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"chunk_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_knowledge_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "sales_knowledge_source_type" NOT NULL,
	"source_uri" text NOT NULL,
	"status" "sales_knowledge_source_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_lead_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"conversation_id" uuid,
	"status" "sales_lead_status" NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"agent_id" uuid,
	"name" text,
	"email" text,
	"phone" text,
	"company" text,
	"interest" text,
	"budget" text,
	"timeline" text,
	"status" "sales_lead_status" DEFAULT 'new' NOT NULL,
	"status_reason" text,
	"notes" text,
	"source" text DEFAULT 'agent_conversation' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"conversation_id" uuid,
	"agent_id" uuid,
	"proposed_time" timestamp with time zone,
	"duration_minutes" integer DEFAULT 30,
	"status" "sales_meeting_status" DEFAULT 'requested' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "sales_message_role" NOT NULL,
	"content" text NOT NULL,
	"debug" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_agent_tools" ADD CONSTRAINT "sales_agent_tools_agent_id_sales_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."sales_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_agent_tools" ADD CONSTRAINT "sales_agent_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_agent_versions" ADD CONSTRAINT "sales_agent_versions_agent_id_sales_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."sales_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_agent_versions" ADD CONSTRAINT "sales_agent_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_agents" ADD CONSTRAINT "sales_agents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_agents" ADD CONSTRAINT "sales_agents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_conversations" ADD CONSTRAINT "sales_conversations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_conversations" ADD CONSTRAINT "sales_conversations_agent_id_sales_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."sales_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_conversations" ADD CONSTRAINT "sales_conversations_lead_id_sales_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."sales_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_handoffs" ADD CONSTRAINT "sales_handoffs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_handoffs" ADD CONSTRAINT "sales_handoffs_conversation_id_sales_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."sales_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_handoffs" ADD CONSTRAINT "sales_handoffs_lead_id_sales_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."sales_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_handoffs" ADD CONSTRAINT "sales_handoffs_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_knowledge_chunks" ADD CONSTRAINT "sales_knowledge_chunks_source_id_sales_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sales_knowledge_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_knowledge_sources" ADD CONSTRAINT "sales_knowledge_sources_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_knowledge_sources" ADD CONSTRAINT "sales_knowledge_sources_agent_id_sales_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."sales_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_knowledge_sources" ADD CONSTRAINT "sales_knowledge_sources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_lead_qualifications" ADD CONSTRAINT "sales_lead_qualifications_lead_id_sales_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."sales_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_lead_qualifications" ADD CONSTRAINT "sales_lead_qualifications_conversation_id_sales_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."sales_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_leads" ADD CONSTRAINT "sales_leads_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_leads" ADD CONSTRAINT "sales_leads_agent_id_sales_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."sales_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_meetings" ADD CONSTRAINT "sales_meetings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_meetings" ADD CONSTRAINT "sales_meetings_lead_id_sales_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."sales_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_meetings" ADD CONSTRAINT "sales_meetings_conversation_id_sales_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."sales_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_meetings" ADD CONSTRAINT "sales_meetings_agent_id_sales_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."sales_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_messages" ADD CONSTRAINT "sales_messages_conversation_id_sales_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."sales_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_agent_tools_unique_idx" ON "sales_agent_tools" USING btree ("agent_id","tool_id");--> statement-breakpoint
CREATE INDEX "sales_knowledge_chunks_embedding_idx" ON "sales_knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);