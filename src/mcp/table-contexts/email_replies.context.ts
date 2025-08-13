export const emailRepliesContext = `
-- Table: email_replies
-- Columns: id BIGINT (PK), email_message_id CHARACTER VARYING(512) (Unique), subject TEXT, body TEXT, reply_by CHARACTER VARYING(255), key_instructions TEXT, reply_date BIGINT, attachments TEXT, overview_data JSON, created_at BIGINT, updated_at BIGINT, email_id BIGINT (FK to emails.id), current_status CHARACTER VARYING(64)
-- Relationships:
-- email_replies.email_id -> emails.id
`;

