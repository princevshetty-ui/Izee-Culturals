-- Add scan tracking columns to all registration tables
-- This enables persistent scan tracking without in-memory fallback
-- Run this in Supabase SQL editor BEFORE event

-- Students table
ALTER TABLE students
ADD COLUMN scan_count INT DEFAULT 0,
ADD COLUMN last_scanned_at TIMESTAMPTZ;

-- Participants table
ALTER TABLE participants
ADD COLUMN scan_count INT DEFAULT 0,
ADD COLUMN last_scanned_at TIMESTAMPTZ;

-- Volunteers table
ALTER TABLE volunteers
ADD COLUMN scan_count INT DEFAULT 0,
ADD COLUMN last_scanned_at TIMESTAMPTZ;

-- Group registrations table
ALTER TABLE group_registrations
ADD COLUMN scan_count INT DEFAULT 0,
ADD COLUMN last_scanned_at TIMESTAMPTZ;

-- Group members table
ALTER TABLE group_members
ADD COLUMN scan_count INT DEFAULT 0,
ADD COLUMN last_scanned_at TIMESTAMPTZ;

-- Create indexes for faster scan lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_students_last_scanned 
  ON students(last_scanned_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_participants_last_scanned 
  ON participants(last_scanned_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_volunteers_last_scanned 
  ON volunteers(last_scanned_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_group_registrations_last_scanned 
  ON group_registrations(last_scanned_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_group_members_last_scanned 
  ON group_members(last_scanned_at DESC NULLS LAST);

-- Verify columns added
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'students' AND column_name LIKE '%scan%';
