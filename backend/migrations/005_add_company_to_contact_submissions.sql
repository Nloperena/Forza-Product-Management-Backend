-- Migration: Add company field to contact_submissions
-- Purpose: Persist submitted company values for Dataclips/reporting
-- Created: 2026-03-03

ALTER TABLE contact_submissions
  ADD COLUMN IF NOT EXISTS company VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_company
  ON contact_submissions(company);

