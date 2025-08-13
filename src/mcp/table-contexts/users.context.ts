export const usersContext = `
-- Table: users
-- Columns: id BIGINT (PK), name TEXT, email TEXT
-- Relationships:
-- users.id -> jobs.created_by
-- users.id -> jobs.updated_by
-- users.id -> jobs.billing_handler
-- users.id -> tasks.created_by
-- users.id -> tasks.modified_by
-- users.id -> tasks.proof_read_by_id
-- users.id -> job_rule_conditions.created_by
-- users.id -> job_rule_conditions.updated_by
-- users.id -> conditions.created_by
-- users.id -> conditions.updated_by
-- users.id -> rule_templates.created_by
-- users.id -> rule_templates.updated_by
-- users.id -> rule_details.created_by
-- users.id -> rule_details.updated_by
-- users.id -> plans.created_by
-- users.id -> plans.updated_by
`;

