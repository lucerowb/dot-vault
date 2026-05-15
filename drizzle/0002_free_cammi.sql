CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_env_version" (
	"id" text PRIMARY KEY NOT NULL,
	"project_env_id" text NOT NULL,
	"project_id" text NOT NULL,
	"label" text NOT NULL,
	"iv" text NOT NULL,
	"ciphertext" text NOT NULL,
	"version" text NOT NULL,
	"change_type" text NOT NULL,
	"changed_by_user_id" text NOT NULL,
	"comment" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_env_version" ADD CONSTRAINT "project_env_version_project_env_id_project_env_id_fk" FOREIGN KEY ("project_env_id") REFERENCES "public"."project_env"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_env_version" ADD CONSTRAINT "project_env_version_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_env_version" ADD CONSTRAINT "project_env_version_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;