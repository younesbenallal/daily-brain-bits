-- Migration: Create integrations table
-- This table will replace the notion_token field in the user table
-- and allow multiple integrations per user

CREATE TABLE IF NOT EXISTS integrations (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Foreign key constraint
  CONSTRAINT fk_integrations_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES "user"(id) 
    ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_user_type ON integrations(user_id, type);
CREATE INDEX IF NOT EXISTS idx_integrations_is_active ON integrations(is_active);

-- Migrate existing notion_token data from user table to integrations table
INSERT INTO integrations (user_id, type, name, access_token, is_active, created_at, updated_at)
SELECT 
  id as user_id,
  'notion' as type,
  'Notion Workspace' as name,
  notion_token as access_token,
  true as is_active,
  "createdAt" as created_at,
  "updatedAt" as updated_at
FROM "user" 
WHERE notion_token IS NOT NULL AND notion_token != '';

-- Note: Don't drop the notion_token column yet - we'll do that in a separate migration
-- after ensuring everything works correctly 