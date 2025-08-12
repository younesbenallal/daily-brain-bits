-- Migration: Create notion_databases table
-- Cette table stocke les bases de données Notion sélectionnées par chaque utilisateur
-- Chaque ligne représente une base de données Notion associée à une intégration

CREATE TABLE IF NOT EXISTS "notion_databases" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "integration_id" VARCHAR(255) NOT NULL,
  "database_id" VARCHAR(255) NOT NULL,
  "database_title" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Contrainte de clé étrangère vers la table integrations
  CONSTRAINT "fk_notion_databases_integration"
    FOREIGN KEY ("integration_id") 
    REFERENCES "integrations"("id") 
    ON DELETE CASCADE,
    
  -- Index pour améliorer les performances des requêtes
  CONSTRAINT "unique_integration_database" 
    UNIQUE ("integration_id", "database_id")
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS "idx_notion_databases_integration_id" 
ON "notion_databases" ("integration_id");

CREATE INDEX IF NOT EXISTS "idx_notion_databases_database_id" 
ON "notion_databases" ("database_id");

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_notion_databases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notion_databases_updated_at
  BEFORE UPDATE ON "notion_databases"
  FOR EACH ROW
  EXECUTE FUNCTION update_notion_databases_updated_at(); 