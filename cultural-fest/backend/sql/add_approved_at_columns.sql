-- Run this in Supabase SQL editor.
-- Adds approval timestamp columns used for accurate "Approved Today" metrics.

ALTER TABLE students
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE participants
ADD COLUMN IF NOT EXISTS approved_at timestamptz;
