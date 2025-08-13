export const costSummaryRuleTasksContext = `
-- Table: cost_summary_rule_tasks
-- Columns: cost_summary_rule_id BIGINT (FK to cost_summary_rules.id), task_id BIGINT (FK to tasks.id)
-- Relationships:
-- cost_summary_rule_tasks.cost_summary_rule_id -> cost_summary_rules.id
-- cost_summary_rule_tasks.task_id -> tasks.id
`;

