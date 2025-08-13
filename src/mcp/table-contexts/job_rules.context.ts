export const jobRulesContext = `
-- Table: job_rules
-- Columns: id BIGINT (PK), rule_name CHARACTER VARYING(100), category CHARACTER VARYING(100), billing_unit CHARACTER VARYING(50), unit_price DOUBLE PRECISION, inclusive_qty DOUBLE PRECISION, waive_qty DOUBLE PRECISION, additional_qty DOUBLE PRECISION, created_at BIGINT, updated_at BIGINT, jobid BIGINT (FK to jobs.id), rule_details_id BIGINT (FK to rule_details.id)
-- Relationships:
-- job_rules.jobid -> jobs.id
-- job_rules.rule_details_id -> rule_details.id
`;

