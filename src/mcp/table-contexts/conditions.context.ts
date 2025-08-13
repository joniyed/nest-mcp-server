export const conditionsContext = `
-- Table: conditions
-- Columns: id BIGINT (PK), key CHARACTER VARYING(50), value CHARACTER VARYING(255), operator CHARACTER VARYING(10), name CHARACTER VARYING(255), position INTEGER, created_at BIGINT, updated_at BIGINT, rule_detail_id BIGINT (FK to rule_details.id), created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id)
-- Relationships:
-- conditions.rule_detail_id -> rule_details.id
-- conditions.created_by -> users.id
-- conditions.updated_by -> users.id
`;

