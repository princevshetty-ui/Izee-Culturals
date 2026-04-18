-- ============================================================================
-- ACTUAL SUPABASE SCHEMA (AS USED BY backend/routes/volunteers.py)
-- ============================================================================
-- Run these statements in Supabase SQL editor.
-- This file intentionally uses only the confirmed columns.
-- ============================================================================

-- ============================================================================
-- TABLE: volunteers
-- ============================================================================
CREATE TABLE IF NOT EXISTS volunteers (
  id TEXT PRIMARY KEY,
  name TEXT,
  roll_no TEXT,
  course TEXT,
  year TEXT,
  email TEXT,
  phone TEXT,
  motivation TEXT,
  team_id TEXT,
  team_label TEXT,
  registered_at TEXT,
  qr_code TEXT,
  approved_at TIMESTAMPTZ
);

-- ============================================================================
-- TABLE: group_registrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_registrations (
  id TEXT PRIMARY KEY,
  team_name TEXT,
  event_id TEXT,
  event_name TEXT,
  event_type TEXT,
  category_id TEXT,
  leader_name TEXT,
  leader_roll_no TEXT,
  leader_course TEXT,
  leader_year TEXT,
  leader_email TEXT,
  leader_phone TEXT,
  registered_at TEXT,
  qr_code TEXT,
  approved_at TIMESTAMPTZ
);

-- ============================================================================
-- TABLE: group_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES group_registrations(id),
  name TEXT,
  roll_no TEXT,
  course TEXT,
  year TEXT
);

-- ============================================================================
-- ALTER TABLE (FOR EXISTING TABLES WITHOUT approved_at)
-- ============================================================================
ALTER TABLE volunteers
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE group_registrations
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
