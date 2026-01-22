-- =============================================
-- FORZA BUILT - CONTACT & NEWSLETTER MIGRATIONS
-- Run this file to set up all required tables
-- =============================================

-- Enable UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. CONTACT SUBMISSIONS TABLE
-- =============================================
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

CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_ip_hash ON contact_submissions(ip_hash);

COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from the website';

-- =============================================
-- 2. NEWSLETTER SUBSCRIBERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    source VARCHAR(100),
    page_url TEXT,
    ip_hash VARCHAR(64),
    confirm_token VARCHAR(64),
    confirm_expires_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    unsubscribe_token VARCHAR(64) NOT NULL,
    unsubscribed_at TIMESTAMP,
    welcome_email_sent BOOLEAN DEFAULT false,
    welcome_email_sent_at TIMESTAMP,
    email_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created_at ON newsletter_subscribers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirm_token ON newsletter_subscribers(confirm_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);

-- Add constraint for valid status values (ignore if already exists)
DO $$ 
BEGIN
    ALTER TABLE newsletter_subscribers 
    ADD CONSTRAINT chk_subscriber_status 
    CHECK (status IN ('pending', 'subscribed', 'unsubscribed'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE newsletter_subscribers IS 'Stores newsletter subscriptions with double opt-in and unsubscribe support';

-- =============================================
-- 3. EMAIL LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    provider_message_id VARCHAR(255),
    provider_response TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);

COMMENT ON TABLE email_logs IS 'Tracks all sent emails for debugging and compliance';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
SELECT 'Migration complete!' as status;

