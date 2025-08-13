export const jobs_context = `
-- Table: jobs
-- Columns: id BIGINT (PK), billing_status CHARACTER VARYING(50), job_id CHARACTER VARYING (Unique), created_at BIGINT, updated_at BIGINT, created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id), job_identity INTEGER, project_identity INTEGER, invoice_status CHARACTER VARYING(50), creation_date BIGINT, modification_date BIGINT, discount DOUBLE PRECISION, total_package_price DOUBLE PRECISION, billing_handler BIGINT (FK to users.id), job_name TEXT, job_status TEXT, project_id TEXT, text TEXT, sales TEXT, inactive_days CHARACTER VARYING(100)
-- Relationships:
-- jobs.created_by -> users.id
-- jobs.updated_by -> users.id
-- jobs.billing_handler -> users.id`;

