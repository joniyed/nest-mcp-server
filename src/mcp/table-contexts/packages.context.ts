export const packagesContext = `
-- Table: packages
-- Columns: id BIGINT (PK), external_cost_summary_id BIGINT (FK to external_cost_summaries.id)
-- Relationships:
-- packages.external_cost_summary_id -> external_cost_summaries.id
`;

