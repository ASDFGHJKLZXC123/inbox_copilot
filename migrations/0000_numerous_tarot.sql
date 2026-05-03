CREATE TYPE "public"."provider" AS ENUM('google', 'microsoft');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired', 'error');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('needs_reply', 'waiting_on', 'done');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"provider" "provider" NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"provider" "provider" NOT NULL,
	"provider_account_id" text,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires" integer,
	"scope" text,
	"token_type" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"subject" text NOT NULL,
	"from_address" text NOT NULL,
	"to_addresses" jsonb NOT NULL,
	"snippet" text NOT NULL,
	"body_preview" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"is_unread" boolean NOT NULL,
	"labels" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"email" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"delivered_at" timestamp with time zone,
	"delivery_attempts" integer DEFAULT 0 NOT NULL,
	"last_delivery_error" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "provider" NOT NULL,
	"email" text NOT NULL,
	"external_id" text,
	"resource_id" text,
	"notification_url" text NOT NULL,
	"client_state" text,
	"status" "subscription_status" NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threads" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"participants" jsonb NOT NULL,
	"message_ids" jsonb NOT NULL,
	"last_message_at" timestamp with time zone NOT NULL,
	"status" "thread_status" NOT NULL,
	"waiting_on" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "provider" NOT NULL,
	"email" text,
	"received_at" timestamp with time zone NOT NULL,
	"event_type" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_email_provider_uniq" ON "accounts" USING btree ("email","provider");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "connections_email_provider_uniq" ON "connections" USING btree ("email","provider");