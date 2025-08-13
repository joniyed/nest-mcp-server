export const ruleDetailsContext = `
-- Table: rule_details
-- Columns: id BIGINT (PK), rule_name CHARACTER VARYING(100), category CHARACTER VARYING(100), billing_unit CHARACTER VARYING(50), created_at BIGINT, updated_at BIGINT, created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id), template_id BIGINT (FK to rule_templates.id)
-- Relationships:
-- rule_details.created_by -> users.id
-- rule_details.updated_by -> users.id
-- rule_details.template_id -> rule_templates.id
`;

