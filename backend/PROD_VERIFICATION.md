# Production Verification Checklist

This document provides exact commands and expected outputs to verify the contact form and newsletter features are working correctly in production.

**Production URL**: `https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com`

---

## Prerequisites

Set these Heroku config vars before verification:

```bash
# Core email configuration
heroku config:set EMAIL_FEATURES_ENABLED=true -a forza-product-managementsystem
heroku config:set POSTMARK_API_TOKEN=your-postmark-token -a forza-product-managementsystem
heroku config:set EMAIL_FROM=noreply@forzabuilt.com -a forza-product-managementsystem
heroku config:set TEAM_EMAIL=team@forzabuilt.com -a forza-product-managementsystem
heroku config:set FRONTEND_URL=https://forzabuilt.com -a forza-product-managementsystem

# Security configuration (use actual random values)
heroku config:set IP_HASH_SALT=$(openssl rand -hex 32) -a forza-product-managementsystem
heroku config:set ADMIN_TOKEN=$(openssl rand -hex 32) -a forza-product-managementsystem

# Restart to apply
heroku restart -a forza-product-managementsystem
```

**Note**: Save your ADMIN_TOKEN somewhere secure - you'll need it for admin endpoints.

---

## 1. Deploy & Run Migrations

### Deploy
```bash
git add .
git commit -m "Production hardening"
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
✅ Applied: 001_create_contact_submissions.sql
✅ Applied: 002_create_newsletter_subscribers.sql
✅ Applied: 003_create_email_logs.sql
🎉 Successfully applied 3 migrations.
```

---

## 2. Verify Migrations (Admin Endpoint)

### PowerShell
```powershell
$token = "YOUR_ADMIN_TOKEN_HERE"
Invoke-RestMethod -Method Get `
  -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/admin/migrations" `
  -Headers @{ "X-Admin-Token" = $token } | ConvertTo-Json -Depth 3
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
Invoke-RestMethod -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/health" | ConvertTo-Json
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
Invoke-RestMethod -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/ready" | ConvertTo-Json
```

**Expected Output (EMAIL_FEATURES_ENABLED=true and Postmark configured)**:
```json
{
  "ok": true,
  "status": "Ready",
  "checks": {
    "database": true,
    "postmark": true
  },
  "emailFeaturesEnabled": true
}
```

**Expected Output (EMAIL_FEATURES_ENABLED=true but Postmark NOT configured)**:
- HTTP Status: `503`
```json
{
  "ok": false,
  "status": "Not Ready - Email configuration missing",
  "checks": { "database": true, "postmark": false },
  "emailFeaturesEnabled": true
}
```

### Admin Health Details (GET /admin/health/details)
```powershell
$token = "YOUR_ADMIN_TOKEN_HERE"
Invoke-RestMethod -Method Get `
  -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/admin/health/details" `
  -Headers @{ "X-Admin-Token" = $token } | ConvertTo-Json -Depth 3
```

**Expected Output**:
```json
{
  "ok": true,
  "app": { "version": "1.0.0", "nodeVersion": "v20.x.x", "environment": "production" },
  "database": { "connected": true, "type": "postgresql" },
  "migrations": { "count": 3, "latest": "003_create_email_logs.sql" },
  "email": { 
    "featuresEnabled": true, 
    "postmarkConfigured": true, 
    "fromEmail": "(set)", 
    "teamEmail": "(set)" 
  },
  "security": { 
    "ipHashSaltConfigured": true, 
    "adminTokenConfigured": true,
    "frontendUrlConfigured": true
  }
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
  -Body $body | ConvertTo-Json
```

**Expected Output**: `{"ok":true}` (silent success)

**Verification**: Check Postmark Activity - there should be NO email sent for this submission.

---

## 6. Admin Auth Test (Negative)

### Without Token (Should fail)
```powershell
try {
    Invoke-RestMethod -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/admin/migrations"
} catch {
    Write-Host "Status: $([int]$_.Exception.Response.StatusCode)"
    Write-Host "Body: $($_.ErrorDetails.Message)"
}
```

**Expected Output**:
```
Status: 401
Body: {"ok":false,"error":"Unauthorized"}
```

### With Wrong Token (Should fail)
```powershell
try {
    Invoke-RestMethod -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/admin/migrations" `
      -Headers @{ "X-Admin-Token" = "wrong-token" }
} catch {
    Write-Host "Status: $([int]$_.Exception.Response.StatusCode)"
    Write-Host "Body: $($_.ErrorDetails.Message)"
}
```

**Expected Output**:
```
Status: 401
Body: {"ok":false,"error":"Unauthorized"}
```

---

## 7. Invalid Token Test (Negative)

### PowerShell
```powershell
try {
    Invoke-RestMethod -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/newsletter/confirm?token=invalid_token_12345"
} catch {
    Write-Host "Status: $([int]$_.Exception.Response.StatusCode)"
    Write-Host "Body: $($_.ErrorDetails.Message)"
}
```

**Expected Output**:
```
Status: 400
Body: {"ok":false,"error":"Invalid or expired confirmation link"}
```

---

## 8. Newsletter Double Opt-In Flow (Positive)

### Step 1: Subscribe
```powershell
$body = @{ email = "realuser@example.com"; source = "prod_verification" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/newsletter/subscribe" `
  -ContentType "application/json" `
  -Body $body | ConvertTo-Json
```

**Expected Output**: `{"ok":true}`

**Verification**: Check Postmark Activity - a "Confirm your subscription" email should be sent.

### Step 2: Confirm (use token from email or DB)
```bash
# Get token from Heroku Postgres:
heroku pg:psql -a forza-product-managementsystem
SELECT confirm_token FROM newsletter_subscribers WHERE email = 'realuser@example.com';
```

```powershell
Invoke-RestMethod -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/newsletter/confirm?token=TOKEN_FROM_DB" | ConvertTo-Json
```

**Expected Output**: `{"ok":true,"message":"Your subscription has been confirmed!"}`

### Step 3: Unsubscribe (use token from email or DB)
```bash
# Get token from Heroku Postgres:
heroku pg:psql -a forza-product-managementsystem
SELECT unsubscribe_token FROM newsletter_subscribers WHERE email = 'realuser@example.com';
```

```powershell
Invoke-RestMethod -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/newsletter/unsubscribe?token=UNSUBSCRIBE_TOKEN" | ConvertTo-Json
```

**Expected Output**: `{"ok":true,"message":"You have been successfully unsubscribed."}`

---

## 9. Contact Form (Positive)

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
  -Body $body | ConvertTo-Json
```

**Expected Output**: `{"ok":true}`

**Verification**:
1. Check Postmark Activity - internal notification sent to TEAM_EMAIL.
2. Check Postmark Activity - confirmation receipt sent to john.doe@example.com.

---

## Summary Checklist

| Test | Status | Notes |
|------|--------|-------|
| Migrations run | ⬜ | 3 migrations applied |
| /health returns 200 | ⬜ | database: true |
| /ready returns 200 with checks | ⬜ | database: true, postmark: true |
| /admin/migrations returns list | ⬜ | With X-Admin-Token header |
| /admin/health/details returns info | ⬜ | With X-Admin-Token header |
| Admin without token returns 401 | ⬜ | |
| Rate limit triggers at 11th request | ⬜ | Returns 429 with retryAfter |
| Honeypot returns 200, no email | ⬜ | Field: website |
| Invalid token returns 400 | ⬜ | |
| Newsletter subscribe sends email | ⬜ | |
| Newsletter confirm works | ⬜ | |
| Newsletter unsubscribe works | ⬜ | Idempotent |
| Contact form sends 2 emails | ⬜ | Internal + confirmation |
