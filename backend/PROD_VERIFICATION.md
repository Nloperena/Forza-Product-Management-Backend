# Production Verification Checklist

This document provides exact commands and expected outputs to verify the contact form and newsletter features are working correctly in production.

**Production URL**: `https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com`

---

## Prerequisites

Set these Heroku config vars before verification:

```bash
heroku config:set POSTMARK_API_TOKEN=your-postmark-token -a forza-product-managementsystem
heroku config:set EMAIL_FROM=noreply@forzabuilt.com -a forza-product-managementsystem
heroku config:set TEAM_EMAIL=team@forzabuilt.com -a forza-product-managementsystem
heroku config:set IP_HASH_SALT=$(openssl rand -hex 32) -a forza-product-managementsystem
heroku config:set FRONTEND_URL=https://forzabuilt.com -a forza-product-managementsystem
heroku config:set ADMIN_TOKEN=$(openssl rand -hex 32) -a forza-product-managementsystem
```

---

## 1. Deploy & Run Migrations

### Deploy
```bash
git add .
git commit -m "Final hardening: admin endpoints, rate limit headers, honeypot standardization"
git push heroku main
```

### Run Migrations
```bash
heroku run npm run migrate -a forza-product-managementsystem
```

**Expected Output**:
```
🚀 Starting database migrations...
🔍 Found 3 migration files.
➡️  Applying migration: 001_create_contact_submissions.sql...
✅ Applied: 001_create_contact_submissions.sql
➡️  Applying migration: 002_create_newsletter_subscribers.sql...
✅ Applied: 002_create_newsletter_subscribers.sql
➡️  Applying migration: 003_create_email_logs.sql...
✅ Applied: 003_create_email_logs.sql
🎉 Successfully applied 3 migrations.
```

---

## 2. Verify Migrations (Admin Endpoint)

### PowerShell
```powershell
$token = "YOUR_ADMIN_TOKEN_HERE"
Invoke-RestMethod -Method Get -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/admin/migrations" `
  -Headers @{ "X-Admin-Token" = $token }
```

### curl
```bash
curl -H "X-Admin-Token: YOUR_ADMIN_TOKEN_HERE" \
  "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/admin/migrations"
```

**Expected Output**:
```json
{
  "ok": true,
  "count": 3,
  "migrations": [
    { "name": "003_create_email_logs.sql", "appliedAt": "2026-01-22T..." },
    { "name": "002_create_newsletter_subscribers.sql", "appliedAt": "2026-01-22T..." },
    { "name": "001_create_contact_submissions.sql", "appliedAt": "2026-01-22T..." }
  ]
}
```

---

## 3. Health & Readiness Checks

### Liveness (GET /health)
```powershell
Invoke-RestMethod -Method Get -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/health"
```

**Expected Output**:
```json
{
  "ok": true,
  "status": "OK",
  "checks": { "database": true }
}
```

### Readiness (GET /ready)
```powershell
Invoke-RestMethod -Method Get -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/ready"
```

**Expected Output**:
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

### Admin Health Details (GET /admin/health/details)
```powershell
$token = "YOUR_ADMIN_TOKEN_HERE"
Invoke-RestMethod -Method Get -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/admin/health/details" `
  -Headers @{ "X-Admin-Token" = $token }
```

**Expected Output**:
```json
{
  "ok": true,
  "app": { "version": "1.0.0", "nodeVersion": "v20.x.x", "environment": "production" },
  "database": { "connected": true, "type": "postgresql" },
  "migrations": { "count": 3, "latest": "003_create_email_logs.sql" },
  "email": { "postmarkConfigured": true, "fromEmail": "noreply@forzabuilt.com" },
  "security": { "ipHashSaltConfigured": true, "adminTokenConfigured": true }
}
```

---

## 4. Rate Limit Test (Negative)

### PowerShell
```powershell
for ($i=1; $i -le 12; $i++) {
  try {
    $res = Invoke-WebRequest -Method Post `
      -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/contact" `
      -ContentType "application/json" `
      -Body '{"firstName":"Test","lastName":"User","email":"test@test.com","message":"Rate limit test"}' `
      -ErrorAction Stop
    Write-Host "Request $i : $($res.StatusCode) - $($res.Content)"
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    $body = $_.ErrorDetails.Message
    Write-Host "Request $i : $status - $body"
  }
}
```

**Expected Output**:
```
Request 1 : 200 - {"ok":true}
Request 2 : 200 - {"ok":true}
...
Request 10 : 200 - {"ok":true}
Request 11 : 429 - {"ok":false,"error":"Too many requests. Please try again later.","retryAfter":XX}
Request 12 : 429 - {"ok":false,"error":"Too many requests. Please try again later.","retryAfter":XX}
```

---

## 5. Honeypot Test (Negative)

The honeypot field is named `website`. If filled, the request returns 200 but NO email is sent.

### PowerShell
```powershell
$body = @{
    firstName = "Bot"
    lastName = "Spam"
    email = "bot@spam.com"
    message = "Buy now!"
    website = "http://spam.com"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/contact" `
  -ContentType "application/json" `
  -Body $body
```

**Expected Output**: `{"ok":true}` (silent success)

**Verification**: Check Postmark Activity - there should be NO email sent for this submission.

---

## 6. Invalid Token Test (Negative)

### PowerShell
```powershell
Invoke-RestMethod -Method Get `
  -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/newsletter/confirm?token=invalid_token_12345"
```

**Expected Output**:
```json
{ "ok": false, "error": "Invalid or expired confirmation link" }
```
With HTTP Status: `400 Bad Request`

---

## 7. Newsletter Double Opt-In Flow (Positive)

### Step 1: Subscribe
```powershell
$body = @{ email = "realuser@example.com"; source = "prod_verification" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/newsletter/subscribe" `
  -ContentType "application/json" `
  -Body $body
```

**Expected Output**: `{"ok":true}`

**Verification**: Check Postmark Activity - a "Confirm your subscription" email should be sent.

### Step 2: Confirm (use token from email or DB)
```powershell
# Get token from Heroku Postgres:
# heroku pg:psql -a forza-product-managementsystem
# SELECT confirm_token FROM newsletter_subscribers WHERE email = 'realuser@example.com';

Invoke-RestMethod -Method Get `
  -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/newsletter/confirm?token=TOKEN_FROM_DB"
```

**Expected Output**: `{"ok":true,"message":"Your subscription has been confirmed!"}`

**Verification**: Check Postmark Activity - a "Welcome" email should be sent.

### Step 3: Unsubscribe (use token from email or DB)
```powershell
# Get token from Heroku Postgres:
# SELECT unsubscribe_token FROM newsletter_subscribers WHERE email = 'realuser@example.com';

Invoke-RestMethod -Method Get `
  -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/newsletter/unsubscribe?token=UNSUBSCRIBE_TOKEN"
```

**Expected Output**: `{"ok":true,"message":"You have been successfully unsubscribed."}`

---

## 8. Contact Form (Positive)

### PowerShell
```powershell
$body = @{
    firstName = "John"
    lastName = "Doe"
    email = "john.doe@example.com"
    message = "I am interested in your industrial adhesives."
    pageUrl = "https://forzabuilt.com/contact"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/contact" `
  -ContentType "application/json" `
  -Body $body
```

**Expected Output**: `{"ok":true}`

**Verification**:
1. Check Postmark Activity - internal notification sent to TEAM_EMAIL.
2. Check Postmark Activity - confirmation receipt sent to john.doe@example.com.

---

## 9. Log Privacy Check

Run this after testing to confirm no PII leakage:

```bash
heroku logs --tail -a forza-product-managementsystem | grep -E "(email|message|firstName|192\.|10\.)"
```

**Expected Output**: No matches containing raw email addresses, message content, or raw IP addresses.

---

## Summary Checklist

| Test | Status | Notes |
|------|--------|-------|
| Migrations run | ⬜ | |
| /health returns 200 | ⬜ | |
| /ready returns 200 with checks | ⬜ | |
| /admin/migrations returns list | ⬜ | |
| Rate limit triggers at 11th request | ⬜ | |
| Honeypot returns 200, no email | ⬜ | |
| Invalid token returns 400 | ⬜ | |
| Newsletter subscribe sends email | ⬜ | |
| Newsletter confirm works | ⬜ | |
| Newsletter unsubscribe works | ⬜ | |
| Contact form sends 2 emails | ⬜ | |
| Logs contain no PII | ⬜ | |

