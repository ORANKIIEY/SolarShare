-- GridGuard AI Master Seed Script (Template)
-- Use this to ensure your database structure is perfectly synced.

-- 1. FIX TABLE STRUCTURE (Safe Alterations)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) AFTER email;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'operator' AFTER password_hash;

-- 2. SEED DEMO USER (Template)
-- IMPORTANT: Replace with your own secure credentials
-- DELETE FROM users WHERE email = 'admin@yourdomain.com';
-- INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES
-- (UUID(), 'admin@yourdomain.com', 'Admin User', 'YOUR_BCRYPT_HASH_HERE', 'admin', NOW());

-- 3. SEED ASSETS (Placeholder)
-- INSERT INTO assets (id, name, type, location, status, `load`, lat, lng, last_inspection) VALUES
-- ('TR-01', 'Sample Transformer', 'Transformer', 'Zone A', 'healthy', 0.0, 0.0, 0.0, NOW());

-- 4. SEED INCIDENTS (Placeholder)
-- INSERT INTO incidents (id, time, location, type, status, confidence, created_at) VALUES
-- ('INC-001', '00:00', 'Location A', 'Sample Incident', 'active', 100, NOW());
