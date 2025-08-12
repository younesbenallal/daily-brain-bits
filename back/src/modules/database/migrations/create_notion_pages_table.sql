CREATE TABLE IF NOT EXISTS "notion_pages" (
	"id" varchar PRIMARY KEY NOT NULL,
	"integration_id" varchar(255) NOT NULL,
	"database_id" varchar(255) NOT NULL,
	"page_id" varchar(255) NOT NULL,
	"page_title" text,
	"page_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "notion_pages" ADD CONSTRAINT "notion_pages_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "notion_pages_integration_id_idx" ON "notion_pages" ("integration_id");
CREATE INDEX IF NOT EXISTS "notion_pages_database_id_idx" ON "notion_pages" ("database_id");
CREATE INDEX IF NOT EXISTS "notion_pages_page_id_idx" ON "notion_pages" ("page_id"); 