export const userRequestsContext = `
-- Table: user_requests
-- Columns: id BIGINT (PK), user_id BIGINT (FK to users.id), request_type CHARACTER VARYING(100), request_details TEXT, requested_at BIGINT
-- Relationships:
-- user_requests.user_id -> users.id
`;

