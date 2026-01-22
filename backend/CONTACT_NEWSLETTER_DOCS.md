# Contact Form & Newsletter API Documentation

## Overview

This documentation covers the contact form submissions and newsletter subscription endpoints for the Forza Built website.

### Key Decisions

**Double Opt-In (Recommended)**: We implement double opt-in for newsletter subscriptions because:
1. **GDPR Compliance**: Required in EU and increasingly expected globally
2. **List Quality**: Only engaged subscribers who confirm get added
3. **Spam Prevention**: Prevents abuse and fake signups
4. **Deliverability**: Better sender reputation with email providers
5. **Legal Protection**: Proof of consent for compliance audits

**Email Provider: Postmark**: Chosen for:
- Excellent deliverability rates
- Simple, clean API
- Good free tier (100 emails/month for testing)
- Transactional email focus
- Easy setup with custom domains

---

## Environment Variables

Add these to your Heroku config vars:

```bash
# Required for email functionality
POSTMARK_API_TOKEN=your-postmark-server-api-token

# Email addresses (customize for your domain)
EMAIL_FROM=noreply@forzabuilt.com
TEAM_EMAIL=team@forzabuilt.com

# Security salt for IP hashing (generate a random string)
IP_HASH_SALT=your-random-salt-here-change-in-production

# Frontend URL for email links
FRONTEND_URL=https://forzabuilt.com

# Database (Heroku provides this automatically)
DATABASE_URL=postgres://...
```

### Setting up Postmark

1. Create account at https://postmarkapp.com
2. Create a new Server for your project
3. Get the Server API Token from Server → API Tokens
4. Add domain/sender signature verification
5. Set the token in Heroku: `heroku config:set POSTMARK_API_TOKEN=your-token`

---

## API Endpoints

### POST /api/contact

Submit a contact form.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "message": "I'd like to learn more about your products.",
  "pageUrl": "https://forzabuilt.com/products",
  "honeypot": ""
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | string | Yes | Max 100 chars |
| lastName | string | Yes | Max 100 chars |
| email | string | Yes | Valid email format |
| message | string | Yes | Max 10000 chars |
| pageUrl | string | No | Page where form was submitted |
| honeypot | string | No | Anti-spam field (must be empty) |

**Success Response (200):**
```json
{ "ok": true }
```

**Error Response (400):**
```json
{ "ok": false, "error": "First name is required, Invalid email format" }
```

**Rate Limit Response (429):**
```json
{ "ok": false, "error": "Too many requests. Please try again later." }
```

**Behavior:**
- Validates all required fields
- If honeypot is filled: returns 200 but does NOT store/send (bot trap)
- Rate limits: 10 requests per minute per IP
- Stores submission in `contact_submissions` table
- Sends internal notification email to team
- Sends confirmation email to submitter

---

### POST /api/newsletter/subscribe

Subscribe to the newsletter (initiates double opt-in).

**Request:**
```json
{
  "email": "john@example.com",
  "source": "homepage_footer",
  "pageUrl": "https://forzabuilt.com",
  "honeypot": ""
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email format |
| source | string | No | Where subscription originated |
| pageUrl | string | No | Page where form was submitted |
| honeypot | string | No | Anti-spam field (must be empty) |

**Success Response (200):**
```json
{ "ok": true }
```

**Error Response (400):**
```json
{ "ok": false, "error": "Invalid email format" }
```

**Behavior:**
- Creates subscriber with status='pending'
- Generates confirmation token (expires in 24 hours)
- Sends confirmation email with link
- If already subscribed: returns success (doesn't leak info)
- If unsubscribed: resets for re-subscription flow

---

### GET /api/newsletter/confirm?token=...

Confirm newsletter subscription (complete double opt-in).

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Confirmation token from email |

**Success Response (200):**
```json
{ "ok": true, "message": "Your subscription has been confirmed!" }
```

**Error Responses:**
- Invalid/missing token (400): `{ "ok": false, "error": "Invalid confirmation link" }`
- Expired token (400): `{ "ok": false, "error": "Confirmation link has expired. Please subscribe again." }`

**Behavior:**
- Validates token exists and hasn't expired
- Updates status to 'subscribed'
- Clears confirmation token
- Sends welcome email

---

### GET /api/newsletter/unsubscribe?token=...

Unsubscribe from newsletter.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Unsubscribe token from emails |

**Success Response (200):**
```json
{ "ok": true, "message": "You have been successfully unsubscribed." }
```

**Error Response (400):**
```json
{ "ok": false, "error": "Invalid unsubscribe link or already unsubscribed" }
```

**Behavior:**
- Updates status to 'unsubscribed'
- Records unsubscribe timestamp
- User can re-subscribe later (goes through full opt-in again)

---

## Database Schema

### contact_submissions
```sql
CREATE TABLE contact_submissions (
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
```

### newsletter_subscribers
```sql
CREATE TABLE newsletter_subscribers (
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
```

### email_logs
```sql
CREATE TABLE email_logs (
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
```

---

## Test Commands (curl)

### Local Development

```bash
# Set your local server URL
API_URL="http://localhost:5000"
```

### Test Contact Form

```bash
# ✅ Valid submission
curl -X POST "$API_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "message": "Hello, I am interested in your products.",
    "pageUrl": "https://forzabuilt.com/contact"
  }'
# Expected: {"ok":true}

# ❌ Missing required fields
curl -X POST "$API_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "email": "invalid-email"
  }'
# Expected: {"ok":false,"error":"Last name is required, Invalid email format, Message is required"}

# 🤖 Honeypot triggered (bot trap - silent success)
curl -X POST "$API_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Bot",
    "lastName": "User",
    "email": "bot@spam.com",
    "message": "Buy now!",
    "honeypot": "filled-by-bot"
  }'
# Expected: {"ok":true} (but NOT stored)

# 🚫 Rate limit test (run this 11+ times quickly)
for i in {1..12}; do
  echo "Request $i:"
  curl -s -X POST "$API_URL/api/contact" \
    -H "Content-Type: application/json" \
    -d '{"firstName":"Test","lastName":"User","email":"test@test.com","message":"Test"}'
  echo ""
done
# Expected: First 10 succeed, then {"ok":false,"error":"Too many requests..."}

# 🚫 Wrong method
curl -X GET "$API_URL/api/contact"
# Expected: {"ok":false,"error":"Method not allowed"}
```

### Test Newsletter Subscribe

```bash
# ✅ Valid subscription
curl -X POST "$API_URL/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "subscriber@example.com",
    "source": "homepage_footer"
  }'
# Expected: {"ok":true}

# ❌ Invalid email
curl -X POST "$API_URL/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email"
  }'
# Expected: {"ok":false,"error":"Invalid email format"}

# 🤖 Honeypot triggered
curl -X POST "$API_URL/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bot@spam.com",
    "honeypot": "gotcha"
  }'
# Expected: {"ok":true} (but NOT stored)
```

### Test Newsletter Confirm

```bash
# Get the confirm_token from database first:
# SELECT confirm_token FROM newsletter_subscribers WHERE email = 'subscriber@example.com';

# ✅ Valid confirmation
curl "$API_URL/api/newsletter/confirm?token=YOUR_TOKEN_HERE"
# Expected: {"ok":true,"message":"Your subscription has been confirmed!"}

# ❌ Invalid token
curl "$API_URL/api/newsletter/confirm?token=invalid-token"
# Expected: {"ok":false,"error":"Invalid or expired confirmation link"}

# ❌ Missing token
curl "$API_URL/api/newsletter/confirm"
# Expected: {"ok":false,"error":"Invalid confirmation link"}
```

### Test Newsletter Unsubscribe

```bash
# Get the unsubscribe_token from database first:
# SELECT unsubscribe_token FROM newsletter_subscribers WHERE email = 'subscriber@example.com';

# ✅ Valid unsubscribe
curl "$API_URL/api/newsletter/unsubscribe?token=YOUR_UNSUBSCRIBE_TOKEN"
# Expected: {"ok":true,"message":"You have been successfully unsubscribed."}

# ❌ Invalid token
curl "$API_URL/api/newsletter/unsubscribe?token=invalid"
# Expected: {"ok":false,"error":"Invalid unsubscribe link or already unsubscribed"}
```

### Production Testing

```bash
# Set production URL
API_URL="https://your-heroku-app.herokuapp.com"

# Then run the same curl commands above
```

---

## Heroku Deployment Checklist

1. **Set environment variables:**
   ```bash
   heroku config:set POSTMARK_API_TOKEN=your-token
   heroku config:set EMAIL_FROM=noreply@forzabuilt.com
   heroku config:set TEAM_EMAIL=team@forzabuilt.com
   heroku config:set IP_HASH_SALT=$(openssl rand -hex 32)
   heroku config:set FRONTEND_URL=https://forzabuilt.com
   ```

2. **Deploy:**
   ```bash
   git push heroku main
   ```

3. **Tables are auto-created** on server startup via `databaseService.initializePostgres()`

4. **Verify with curl tests** (see above)

5. **Check logs:**
   ```bash
   heroku logs --tail
   ```

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| Input Validation | All fields validated for type, length, format |
| Email Validation | Regex + length check |
| Honeypot | Silent success if filled (traps bots) |
| Rate Limiting | 10 req/min per IP (contact form) |
| IP Hashing | SHA-256 with salt (privacy) |
| Content Sanitization | HTML escaping, length limits |
| HTTPS | Required in production |
| SQL Injection | Parameterized queries |
| XSS Prevention | No user content in email subjects |

---

## Compliance

- **GDPR**: Double opt-in, one-click unsubscribe, no tracking without consent
- **CAN-SPAM**: Unsubscribe link in all emails, physical address in email footer
- **Unsubscribe Honored**: Once unsubscribed, user won't receive emails unless they re-subscribe

---

## Email Templates

All emails include:
- Plain text version (for accessibility/fallback)
- HTML version (styled)
- Unsubscribe link (newsletters)
- Company branding
- Mobile-responsive design

### Email Types
1. **contact-internal** - Team notification when someone submits contact form
2. **contact-confirmation** - User receipt after contact form submission
3. **newsletter-confirm** - Double opt-in confirmation request
4. **newsletter-welcome** - Welcome email after subscription confirmed

---

## Troubleshooting

### Emails not sending?
1. Check `POSTMARK_API_TOKEN` is set correctly
2. Verify sender domain in Postmark
3. Check email_logs table for errors
4. Check Heroku logs: `heroku logs --tail`

### Rate limit too aggressive?
- Adjust `RATE_LIMIT_MAX_REQUESTS` in `contact.ts`
- Current: 10 requests per minute per IP

### Confirmation emails not arriving?
1. Check spam folder
2. Verify `EMAIL_FROM` domain is verified in Postmark
3. Check email_logs for delivery status

