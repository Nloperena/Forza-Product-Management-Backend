-- Migration: Create contact_submissions table
-- Purpose: Store contact form submissions from the website
-- Created: 2026-01-22

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    page_url TEXT,
    ip_hash VARCHAR(64),
    status VARCHAR(50) DEFAULT 'pending',
    internal_email_sent BOOLEAN DEFAULT false,
    confirmation_email_sent BOOLEAN DEFAULT false,
    internal_email_sent_at TIMESTAMP,
    confirmation_email_sent_at TIMESTAMP,
    email_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_ip_hash ON contact_submissions(ip_hash);

-- Add comment
COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from the website';

