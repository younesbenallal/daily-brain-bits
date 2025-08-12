-- Ajouter une contrainte unique sur page_id pour permettre l'upsert
ALTER TABLE "notion_pages" ADD CONSTRAINT "notion_pages_page_id_unique" UNIQUE ("page_id"); 