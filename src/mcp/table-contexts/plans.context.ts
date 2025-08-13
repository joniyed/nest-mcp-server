export const plansContext = `
-- Table: plans
-- Columns: id BIGINT (PK), name CHARACTER VARYING(100), created_at BIGINT, updated_at BIGINT, created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id)
-- Relationships:
-- plans.created_by -> users.id
-- plans.updated_by -> users.id
`;

