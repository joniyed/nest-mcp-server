export const userRolesContext = `
-- Table: user_roles
-- Columns: user_id BIGINT (FK to users.id), role_id BIGINT (FK to roles.id)
-- Relationships:
-- user_roles.user_id -> users.id
-- user_roles.role_id -> roles.id
`;

