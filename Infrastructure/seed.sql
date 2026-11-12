-- infrastructure/seed.sql (Template)
-- Use this file to seed initial data into your database.

-- Default admin user (Placeholder)
-- INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES
-- (UUID(), 'admin@example.com', 'Admin', 'YOUR_HASH_HERE', 'admin', NOW())
-- ON DUPLICATE KEY UPDATE id=id;

-- Assets (Template)
-- INSERT INTO assets (id, name, type, location, status, `load`, lat, lng, last_inspection) VALUES
-- ('TR-01', 'Transformer 01', 'Transformer', 'Location A', 'healthy', 0.0, 0.0, 0.0, NOW())
-- ON DUPLICATE KEY UPDATE id=id;

-- System config defaults
INSERT INTO system_config (`key`, `value`, `updated_at`) VALUES
('sensitivity',  '95', NOW()),
('auto_isolate', 'true', NOW())
ON DUPLICATE KEY UPDATE `key`=`key`;
