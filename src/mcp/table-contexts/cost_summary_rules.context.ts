export const costSummaryRulesContext = `
-- Table: cost_summary_rules
-- Columns: id BIGINT (PK), rule_name CHARACTER VARYING(100), category CHARACTER VARYING(100), billing_unit CHARACTER VARYING(50), unit_price DOUBLE PRECISION, inclusive_qty DOUBLE PRECISION, waive_qty DOUBLE PRECISION, additional_qty DOUBLE PRECISION, created_at BIGINT, updated_at BIGINT, rule_details_id BIGINT (FK to rule_details.id)
-- Relationships:
-- cost_summary_rules.rule_details_id -> rule_details.id
`;

