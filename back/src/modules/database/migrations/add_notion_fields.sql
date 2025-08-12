ALTER TABLE users 
ADD COLUMN notion_access_token TEXT,
ADD COLUMN notion_refresh_token TEXT,
ADD COLUMN notion_token_expiry TIMESTAMP,
ADD COLUMN notion_workspace_id VARCHAR(255),
ADD COLUMN notion_workspace_name VARCHAR(255); 