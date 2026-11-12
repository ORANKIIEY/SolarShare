-- infrastructure/init.sql
-- Drops and recreates all tables for a clean start

-- Original tables
CREATE TABLE IF NOT EXISTS telemetry (
    device_id TEXT NOT NULL,
    current DOUBLE PRECISION NOT NULL,
    voltage DOUBLE PRECISION NOT NULL DEFAULT 230.0,
    supply_current DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    meter_sum DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    differential DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    time TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (time, device_id)
);

CREATE TABLE IF NOT EXISTS theft_history_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    house_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL
);

-- Phase 1: New tables

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'healthy',
    load DOUBLE PRECISION NOT NULL DEFAULT 0,
    lat DOUBLE PRECISION NOT NULL DEFAULT 0,
    lng DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_inspection TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    confidence INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time TEXT NOT NULL,
    event TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);