CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "paywall_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"price_point" numeric(10, 2) NOT NULL,
	"background_color" varchar(50) NOT NULL,
	"title_text" varchar(255) NOT NULL,
	"cta_text" varchar(255) NOT NULL,
	"conversion_rate" double precision NOT NULL,
	"failure_condition" varchar(255) NOT NULL,
	"embedding" vector(384) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "embedding_idx" ON "paywall_history" USING hnsw ("embedding" vector_cosine_ops);