USE library_system;

-- Add permanent user roles to existing installations.
ALTER TABLE users ADD COLUMN role TINYINT NOT NULL DEFAULT 1 AFTER gmail;

-- Existing users become Students by default.
UPDATE users SET role = 1 WHERE role IS NULL OR role = 0;

-- Create/repair the system settings row.
INSERT INTO settings (id, library_name, fine_per_day)
VALUES (1, 'Library Management System', 10.00)
ON DUPLICATE KEY UPDATE id = id;
