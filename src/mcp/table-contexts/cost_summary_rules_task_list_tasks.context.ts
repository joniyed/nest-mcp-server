export const costSummaryRulesTaskListTasksContext = `
-- Table: cost_summary_rules_task_list_tasks
-- Columns: costSummaryRulesId BIGINT (FK to cost_summary_rules.id), tasksId BIGINT (FK to tasks.id)
-- Relationships:
-- cost_summary_rules_task_list_tasks.costSummaryRulesId -> cost_summary_rules.id
-- cost_summary_rules_task_list_tasks.tasksId -> tasks.id
`;

