export const tasksContext = `
-- Table: tasks
-- Columns: id BIGINT (PK), task_identity BIGINT, row_version CHARACTER VARYING(100), language CHARACTER VARYING(100), creation_date BIGINT, modified_date BIGINT, created_by BIGINT (FK to users.id), modified_by BIGINT (FK to users.id), task_type_id BIGINT (FK to task_types.id), status CHARACTER VARYING(100), task_id CHARACTER VARYING(255), expected_tat_datetime BIGINT, total_number_of_pages INTEGER, proof_read_by_id BIGINT (FK to users.id), email_id BIGINT (FK to emails.id), task_completion_date BIGINT, previous_status BIGINT, tera_task_id BIGINT, created_at BIGINT, updated_at BIGINT, sub_task_type_id BIGINT (FK to sub_task_types.id), job_id BIGINT (FK to jobs.id)
-- Relationships:
-- tasks.created_by -> users.id
-- tasks.modified_by -> users.id
-- tasks.task_type_id -> task_types.id
-- tasks.proof_read_by_id -> users.id
-- tasks.email_id -> emails.id
-- tasks.sub_task_type_id -> sub_task_types.id
-- tasks.job_id -> jobs.id
`;

