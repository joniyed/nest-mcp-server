export const jobActivityContext = `
-- Table: job_activity
-- Columns: id BIGINT (PK), category CHARACTER VARYING(50), source CHARACTER VARYING(100), details CHARACTER VARYING(255), created_at BIGINT, updated_at BIGINT, email_reply_id BIGINT (FK to email_replies.id), job_id BIGINT (FK to jobs.id)
-- Relationships:
-- job_activity.email_reply_id -> email_replies.id
-- job_activity.job_id -> jobs.id
`;

