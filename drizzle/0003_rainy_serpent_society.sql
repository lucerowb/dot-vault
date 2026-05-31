CREATE TABLE "access_request" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"requested_role" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp,
	"expires_at" timestamp,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "access_request_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"scopes" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "api_key_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "emergency_access" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"emergency_type" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approver1_user_id" text,
	"approver1_approved_at" timestamp,
	"approver2_user_id" text,
	"approver2_approved_at" timestamp,
	"expires_at" timestamp,
	"used_at" timestamp,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "emergency_access_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "env_sync_approval" (
	"id" text PRIMARY KEY NOT NULL,
	"sync_config_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"approver_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "env_sync_approval_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "env_sync_config" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"source_env_label" text NOT NULL,
	"target_env_label" text NOT NULL,
	"sync_mode" text DEFAULT 'manual' NOT NULL,
	"require_approval" boolean DEFAULT true NOT NULL,
	"approvers" text,
	"last_sync_at" timestamp,
	"last_sync_status" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret_rotation" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"env_id" text NOT NULL,
	"secret_key" text NOT NULL,
	"interval_days" text DEFAULT '90' NOT NULL,
	"last_rotated_at" timestamp,
	"next_rotation_at" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"provider" text,
	"provider_config" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_config" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_error" text,
	"last_success_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"billing_email" text,
	"sso_config" text,
	"sso_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "workspace_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_project" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "ip_allowlist" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "require_2fa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_backup_codes" text;--> statement-breakpoint
ALTER TABLE "access_request" ADD CONSTRAINT "access_request_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_request" ADD CONSTRAINT "access_request_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_request" ADD CONSTRAINT "access_request_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_access" ADD CONSTRAINT "emergency_access_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_access" ADD CONSTRAINT "emergency_access_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_access" ADD CONSTRAINT "emergency_access_approver1_user_id_user_id_fk" FOREIGN KEY ("approver1_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_access" ADD CONSTRAINT "emergency_access_approver2_user_id_user_id_fk" FOREIGN KEY ("approver2_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "env_sync_approval" ADD CONSTRAINT "env_sync_approval_sync_config_id_env_sync_config_id_fk" FOREIGN KEY ("sync_config_id") REFERENCES "public"."env_sync_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "env_sync_approval" ADD CONSTRAINT "env_sync_approval_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "env_sync_approval" ADD CONSTRAINT "env_sync_approval_approver_user_id_user_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "env_sync_config" ADD CONSTRAINT "env_sync_config_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_rotation" ADD CONSTRAINT "secret_rotation_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_rotation" ADD CONSTRAINT "secret_rotation_env_id_project_env_id_fk" FOREIGN KEY ("env_id") REFERENCES "public"."project_env"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_config" ADD CONSTRAINT "webhook_config_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_project" ADD CONSTRAINT "workspace_project_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_project" ADD CONSTRAINT "workspace_project_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_member_workspace_user_idx" ON "workspace_member" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_project_workspace_project_idx" ON "workspace_project" USING btree ("workspace_id","project_id");