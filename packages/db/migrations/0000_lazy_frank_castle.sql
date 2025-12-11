CREATE TYPE "public"."card_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."card_type" AS ENUM('text', 'url', 'pdf', 'youtube', 'tweet', 'spotify');--> statement-breakpoint
CREATE TABLE "card_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards_to_tags" (
	"card_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "cards_to_tags_card_id_tag_id_pk" PRIMARY KEY("card_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "index_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"index_id" uuid NOT NULL,
	"type" "card_type" NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"shareable_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"processed_content" text DEFAULT '',
	"status" "card_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"storage_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "index_cards_shareable_id_unique" UNIQUE("shareable_id")
);
--> statement-breakpoint
CREATE TABLE "indexes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"user_id" uuid NOT NULL,
	"cover_image_url" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"shareable_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "indexes_shareable_id_unique" UNIQUE("shareable_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	CONSTRAINT "tags_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "card_chunks" ADD CONSTRAINT "card_chunks_card_id_index_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."index_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards_to_tags" ADD CONSTRAINT "cards_to_tags_card_id_index_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."index_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards_to_tags" ADD CONSTRAINT "cards_to_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "index_cards" ADD CONSTRAINT "index_cards_index_id_indexes_id_fk" FOREIGN KEY ("index_id") REFERENCES "public"."indexes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexes" ADD CONSTRAINT "indexes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tag_idx" ON "cards_to_tags" USING btree ("tag_id");