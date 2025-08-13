export const aiModelVersionChangeHistoryContext = `
-- Table: ai_model_version_change_history
-- Columns: id BIGINT (PK), version_id BIGINT (FK to ai_model_versions.id), change_details TEXT, changed_at BIGINT
-- Relationships:
-- ai_model_version_change_history.version_id -> ai_model_versions.id
`;

