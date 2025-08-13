export const emailFilesContext = `
-- Table: email_files
-- Columns: id BIGINT (PK), file_name CHARACTER VARYING(5048), total_pages INTEGER, no_of_words INTEGER, total_changes INTEGER, change_details TEXT, created_at BIGINT, updated_at BIGINT, email_id BIGINT (FK to emails.id), email_reply_id BIGINT (FK to email_replies.id), current_status CHARACTER VARYING(64)
-- Relationships:
-- email_files.email_id -> emails.id
-- email_files.email_reply_id -> email_replies.id
`;

