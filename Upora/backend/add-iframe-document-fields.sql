-- Add iframe document fields to interaction_types table
ALTER TABLE interaction_types
ADD COLUMN IF NOT EXISTS iframe_document_url VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS iframe_document_file_name VARCHAR(255) NULL;

-- Add comment
COMMENT ON COLUMN interaction_types.iframe_document_url IS 'URL to uploaded document for iframe interactions';
COMMENT ON COLUMN interaction_types.iframe_document_file_name IS 'Original filename of uploaded document';

