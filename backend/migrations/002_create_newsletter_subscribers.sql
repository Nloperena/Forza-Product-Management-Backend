-- Migration: Create newsletter_subscribers table
-- Purpose: Store newsletter subscriptions with double opt-in support
-- Created: 2026-01-22

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    source VARCHAR(100),
    page_url TEXT,
    ip_hash VARCHAR(64),
    
    -- Double opt-in fields
    confirm_token VARCHAR(64),
    confirm_expires_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    
    -- Unsubscribe fields
    unsubscribe_token VARCHAR(64) NOT NULL,
    unsubscribed_at TIMESTAMP,
    
    -- Email tracking
    welcome_email_sent BOOLEAN DEFAULT false,
    welcome_email_sent_at TIMESTAMP,
    email_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created_at ON newsletter_subscribers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirm_token ON newsletter_subscribers(confirm_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);

-- Add constraint for valid status values
ALTER TABLE newsletter_subscribers 
ADD CONSTRAINT chk_subscriber_status 
CHECK (status IN ('pending', 'subscribed', 'unsubscribed'));

-- Add comment
COMMENT ON TABLE newsletter_subscribers IS 'Stores newsletter subscriptions with double opt-in and unsubscribe support';

