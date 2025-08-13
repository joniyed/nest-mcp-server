export const externalCostSummariesContext = `
-- Table: external_cost_summaries
-- Columns: id BIGINT (PK), job_id BIGINT (FK to jobs.id)
-- Relationships:
-- external_cost_summaries.job_id -> jobs.id
`;

