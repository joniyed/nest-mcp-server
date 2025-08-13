export const packageCostSummaryRulesContext = `
-- Table: package_cost_summary_rules
-- Columns: packagesId BIGINT (FK to packages.id), costSummaryRulesId BIGINT (FK to cost_summary_rules.id)
-- Relationships:
-- package_cost_summary_rules.packagesId -> packages.id
-- package_cost_summary_rules.costSummaryRulesId -> cost_summary_rules.id
`;

