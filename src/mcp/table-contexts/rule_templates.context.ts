export const ruleTemplatesContext = `
-- Table: rule_templates
-- Columns: id BIGINT (PK), name CHARACTER VARYING(100), product_type CHARACTER VARYING(50), version INTEGER, created_at BIGINT, updated_at BIGINT, plan_id BIGINT (FK to plans.id), created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id), job_id BIGINT (FK to jobs.id)
-- Relationships:
-- rule_templates.plan_id -> plans.id
-- rule_templates.created_by -> users.id
-- rule_templates.updated_by -> users.id
-- rule_templates.job_id -> jobs.id
`;

