export const aiModelVersionsContext = `
-- Table: ai_model_versions
-- Columns: id BIGINT (PK), model_id BIGINT (FK to ai_models.id), version_number CHARACTER VARYING(50), release_date BIGINT
-- Relationships:
-- ai_model_versions.model_id -> ai_models.id
`;

