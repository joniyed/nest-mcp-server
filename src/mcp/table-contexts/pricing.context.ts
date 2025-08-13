export const pricingContext = `
-- Table: pricing
-- Columns: id BIGINT (PK), package_price DOUBLE PRECISION, package_subtotal_price DOUBLE PRECISION, additional_subtotal_price DOUBLE PRECISION, discount DOUBLE PRECISION, total_price DOUBLE PRECISION, final_price DOUBLE PRECISION, external_cost_summary_id BIGINT (FK to external_cost_summaries.id)
-- Relationships:
-- pricing.external_cost_summary_id -> external_cost_summaries.id
`;

