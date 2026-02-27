-- Migration: Add Salesforce sync tracking to contact_submissions
-- Purpose: Store Salesforce lead sync status for contact form submissions
-- Created: 2026-02-27

ALTER TABLE contact_submissions
  ADD COLUMN IF NOT EXISTS salesforce_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS salesforce_lead_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS salesforce_error TEXT,
  ADD COLUMN IF NOT EXISTS salesforce_synced_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_contact_submissions_salesforce_synced
  ON contact_submissions(salesforce_synced);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_salesforce_lead_id
  ON contact_submissions(salesforce_lead_id);
