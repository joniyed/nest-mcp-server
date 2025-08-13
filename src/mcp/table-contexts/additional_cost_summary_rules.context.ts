export const additionalCostSummaryRulesContext = `
-- Table: additional_cost_summary_rules
-- Columns: additionalId BIGINT, costSummaryRulesId BIGINT (FK to cost_summary_rules.id)
-- Relationships:
-- additional_cost_summary_rules.costSummaryRulesId -> cost_summary_rules.id
`;

