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

## Health & Readiness Endpoints

### GET /health (Liveness)
Checks if the server is up and the database is reachable. Use this for basic uptime monitoring.

**Success Response (200):**
```json
{
  "ok": true,
  "status": "OK",
  "checks": { "database": true }
}
```

### GET /ready (Readiness)
Checks if all dependencies (Database + Postmark) are properly configured and reachable.

**Success Response (200):**
```json
{
  "ok": true,
  "status": "Ready",
  "checks": {
    "database": true,
    "postmark": true
  }
}
```

---

## Database Migrations

We use a version-tracked migration system for production safety.

### Running Migrations on Heroku

After deploying your code, run the following command to apply any pending SQL migrations:

```bash
heroku run npm run migrate
```

This will:
1. Create a `schema_migrations` table if it doesn't exist.
2. Read all `.sql` files in `backend/migrations/`.
3. Apply each file in order (sorted by filename) if it hasn't been run before.
4. Log each applied migration.

**Note**: Auto-initialization is disabled in production by default. To force auto-init on startup, set `DB_AUTO_INITIALIZE=true`.

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

---

## API Endpoints

### POST /api/contact
Submit a contact form.

**Fields:** `firstName`, `lastName`, `email`, `message`, `pageUrl`, `honeypot`

### POST /api/newsletter/subscribe
Subscribe to the newsletter (initiates double opt-in).

**Fields:** `email`, `source`, `pageUrl`, `honeypot`

### GET /api/newsletter/confirm?token=...
Confirm newsletter subscription (complete double opt-in).

### GET /api/newsletter/unsubscribe?token=...
Unsubscribe from newsletter (Idempotent).

---

## Production Test Commands

### 1. Liveness & Readiness
**curl:**
```bash
curl -X GET "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/health"
curl -X GET "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/ready"
```
**PowerShell:**
```powershell
Invoke-RestMethod -Method Get -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/health"
Invoke-RestMethod -Method Get -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/ready"
```

### 2. Rate Limit Test (Negative)
**curl:**
```bash
for i in {1..11}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" -X POST "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/contact" \
    -H "Content-Type: application/json" \
    -d '{"firstName":"Test","lastName":"User","email":"test@test.com","message":"Test"}'
done
```
**Expected Output**: Request 11 should return `429`.

### 3. Honeypot Test (Negative)
**curl:**
```bash
curl -i -X POST "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/contact" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Bot","lastName":"Spam","email":"bot@spam.com","message":"Buy!","honeypot":"trap"}'
```
**Expected Output**: `200 OK` with `{"ok":true}`, but no data is stored or emailed.

### 4. Token Expiry/Invalid Test (Negative)
**curl:**
```bash
curl -i "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/newsletter/confirm?token=invalid_token"
```
**Expected Output**: `400 Bad Request` with `{"ok":false,"error":"Invalid or expired confirmation link"}`.

---

## Privacy & Security Confirmation

- **Request Bodies**: Never logged in production console or error logs.
- **Raw IPs**: Never logged. access logs use hashed IPs.
- **Error Logs**: Production error logs only show error names and messages.
- **SQL Security**: All queries use parameterized inputs.
- **Unsubscribe**: Honored immediately.
