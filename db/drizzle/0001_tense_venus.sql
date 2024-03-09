ALTER TABLE "integrations" RENAME TO "sources";--> statement-breakpoint
ALTER TABLE "sources" DROP CONSTRAINT "integrations_user_id_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sources" ADD CONSTRAINT "sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
