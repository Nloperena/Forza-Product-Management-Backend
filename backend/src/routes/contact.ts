/**
 * Contact Form Routes
 * 
 * POST /api/contact - Submit contact form
 * 
 * Features:
 * - Input validation
 * - Honeypot spam protection
 * - IP-based rate limiting
 * - Email notifications (internal + confirmation)
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { contactSubmissionModel } from '../models/ContactSubmission';
import { emailService } from '../services/emailService';

const router = express.Router();

// In-memory rate limit store (consider Redis for production at scale)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit config: 10 requests per minute per IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

/**
 * Hash an IP address for privacy
 */
function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'forza-contact-salt';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);
}

/**
 * Get client IP from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Check rate limit for an IP
 */
function checkRateLimit(ipHash: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ipHash);

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    // New window
    rateLimitStore.set(ipHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetAt - now };
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Sanitize input string
 */
function sanitize(input: string | undefined): string {
  if (!input) return '';
  return input.trim().substring(0, 10000);
}

/**
 * POST /api/contact
 * Submit a contact form
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, message, pageUrl, honeypot } = req.body;

    // Honeypot check - if filled, return silent success (bot trap)
    if (honeypot && honeypot.trim() !== '') {
      console.log('[Contact] Honeypot triggered - silent success returned');
      return res.status(200).json({ ok: true });
    }

    // Validate required fields
    const sanitizedFirstName = sanitize(firstName);
    const sanitizedLastName = sanitize(lastName);
    const sanitizedEmail = sanitize(email)?.toLowerCase();
    const sanitizedMessage = sanitize(message);

    const errors: string[] = [];

    if (!sanitizedFirstName || sanitizedFirstName.length < 1) {
      errors.push('First name is required');
    }
    if (sanitizedFirstName.length > 100) {
      errors.push('First name must be less than 100 characters');
    }

    if (!sanitizedLastName || sanitizedLastName.length < 1) {
      errors.push('Last name is required');
    }
    if (sanitizedLastName.length > 100) {
      errors.push('Last name must be less than 100 characters');
    }

    if (!sanitizedEmail) {
      errors.push('Email is required');
    } else if (!isValidEmail(sanitizedEmail)) {
      errors.push('Invalid email format');
    }

    if (!sanitizedMessage || sanitizedMessage.length < 1) {
      errors.push('Message is required');
    }
    if (sanitizedMessage.length > 10000) {
      errors.push('Message must be less than 10000 characters');
    }

    if (errors.length > 0) {
      return res.status(400).json({ ok: false, error: errors.join(', ') });
    }

    // Rate limiting by IP
    const clientIp = getClientIp(req);
    const ipHash = hashIp(clientIp);
    const rateLimit = checkRateLimit(ipHash);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetIn / 1000));

    if (!rateLimit.allowed) {
      console.log(`[Contact] Rate limit exceeded for IP hash: ${ipHash}`);
      return res.status(429).json({ 
        ok: false, 
        error: 'Too many requests. Please try again later.' 
      });
    }

    // Store submission in database
    const submission = await contactSubmissionModel.create({
      first_name: sanitizedFirstName,
      last_name: sanitizedLastName,
      email: sanitizedEmail,
      message: sanitizedMessage,
      page_url: sanitize(pageUrl) || undefined,
      ip_hash: ipHash
    });

    console.log(`[Contact] New submission created: ${submission.id}`);

    // Send emails asynchronously (don't block the response)
    setImmediate(async () => {
      let internalSent = false;
      let confirmationSent = false;
      let emailError: string | undefined;

      try {
        // Send internal notification to team
        const internalResult = await emailService.sendContactInternalNotification({
          submissionId: submission.id,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          email: sanitizedEmail,
          message: sanitizedMessage,
          pageUrl: sanitize(pageUrl)
        });
        internalSent = internalResult.success;
        if (!internalResult.success) {
          emailError = internalResult.errorMessage;
        }
      } catch (err: any) {
        console.error('[Contact] Failed to send internal notification:', err.message);
        emailError = err.message;
      }

      try {
        // Send confirmation email to user
        const confirmResult = await emailService.sendContactConfirmation({
          submissionId: submission.id,
          firstName: sanitizedFirstName,
          email: sanitizedEmail
        });
        confirmationSent = confirmResult.success;
        if (!confirmResult.success && !emailError) {
          emailError = confirmResult.errorMessage;
        }
      } catch (err: any) {
        console.error('[Contact] Failed to send confirmation email:', err.message);
        if (!emailError) emailError = err.message;
      }

      // Update submission with email status
      try {
        await contactSubmissionModel.updateEmailStatus(submission.id, {
          internal_email_sent: internalSent,
          confirmation_email_sent: confirmationSent,
          email_error: emailError
        });
      } catch (err: any) {
        console.error('[Contact] Failed to update email status:', err.message);
      }
    });

    // Return success immediately
    return res.status(200).json({ ok: true });

  } catch (error: any) {
    console.error('[Contact] Error processing submission:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'An error occurred. Please try again later.' 
    });
  }
});

// Handle unsupported methods
router.all('/', (_req: Request, res: Response) => {
  res.status(405).json({ ok: false, error: 'Method not allowed' });
});

export default router;

