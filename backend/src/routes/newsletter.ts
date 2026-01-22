/**
 * Newsletter Routes
 * 
 * POST /api/newsletter/subscribe - Subscribe to newsletter (double opt-in)
 * GET  /api/newsletter/confirm   - Confirm subscription
 * GET  /api/newsletter/unsubscribe - Unsubscribe from newsletter
 * 
 * Features:
 * - Double opt-in for GDPR compliance
 * - Honeypot spam protection
 * - Unsubscribe token for one-click unsubscribe
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { newsletterSubscriberModel } from '../models/NewsletterSubscriber';
import { emailService } from '../services/emailService';

const router = express.Router();

/**
 * Hash an IP address for privacy
 */
function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'forza-newsletter-salt';
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
  return input.trim().substring(0, 1000);
}

/**
 * POST /api/newsletter/subscribe
 * Subscribe to the newsletter (initiates double opt-in)
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { email, source, pageUrl, website } = req.body;

    // Honeypot check - if filled, return silent success (bot trap)
    // Field named "website" to appear legitimate but hidden on frontend
    if (website && website.trim() !== '') {
      console.log('[Newsletter] Honeypot triggered - silent success returned');
      return res.status(200).json({ ok: true });
    }

    // Validate email
    const sanitizedEmail = sanitize(email)?.toLowerCase();

    if (!sanitizedEmail) {
      return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ ok: false, error: 'Invalid email format' });
    }

    // Get client info
    const clientIp = getClientIp(req);
    const ipHash = hashIp(clientIp);

    // Upsert subscriber (handles re-subscription of unsubscribed users)
    const { subscriber, created } = await newsletterSubscriberModel.upsert({
      email: sanitizedEmail,
      source: sanitize(source) || undefined,
      page_url: sanitize(pageUrl) || undefined,
      ip_hash: ipHash
    });

    console.log(`[Newsletter] Subscriber ${created ? 'created' : 'updated'}: ${subscriber.email} (status: ${subscriber.status})`);

    // Send confirmation email if pending (new or re-subscribing)
    if (subscriber.status === 'pending' && subscriber.confirm_token) {
      setImmediate(async () => {
        try {
          const result = await emailService.sendNewsletterConfirmation({
            email: subscriber.email,
            confirmToken: subscriber.confirm_token!
          });

          if (!result.success) {
            console.error('[Newsletter] Failed to send confirmation email:', result.errorMessage);
            await newsletterSubscriberModel.updateEmailStatus(subscriber.id, {
              email_error: result.errorMessage
            });
          }
        } catch (err: any) {
          console.error('[Newsletter] Error sending confirmation email:', err.message);
          await newsletterSubscriberModel.updateEmailStatus(subscriber.id, {
            email_error: err.message
          });
        }
      });
    }

    // Always return success (even for already subscribed - don't leak info)
    return res.status(200).json({ ok: true });

  } catch (error: any) {
    console.error('[Newsletter] Error processing subscription:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'An error occurred. Please try again later.' 
    });
  }
});

/**
 * GET /api/newsletter/confirm
 * Confirm newsletter subscription (complete double opt-in)
 */
router.get('/confirm', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid confirmation link' });
    }

    // Find subscriber by token
    const subscriber = await newsletterSubscriberModel.findByConfirmToken(token);

    if (!subscriber) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid or expired confirmation link' 
      });
    }

    // Check if token expired
    if (subscriber.confirm_expires_at && new Date(subscriber.confirm_expires_at) < new Date()) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Confirmation link has expired. Please subscribe again.' 
      });
    }

    // Confirm the subscription
    const confirmed = await newsletterSubscriberModel.confirmSubscription(token);

    if (!confirmed) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Unable to confirm subscription. Please try again.' 
      });
    }

    console.log(`[Newsletter] Subscription confirmed: ${confirmed.email}`);

    // Send welcome email asynchronously
    setImmediate(async () => {
      try {
        const result = await emailService.sendNewsletterWelcome({
          email: confirmed.email,
          unsubscribeToken: confirmed.unsubscribe_token
        });

        await newsletterSubscriberModel.updateEmailStatus(confirmed.id, {
          welcome_email_sent: result.success,
          email_error: result.success ? undefined : result.errorMessage
        });
      } catch (err: any) {
        console.error('[Newsletter] Error sending welcome email:', err.message);
        await newsletterSubscriberModel.updateEmailStatus(confirmed.id, {
          email_error: err.message
        });
      }
    });

    return res.status(200).json({ 
      ok: true, 
      message: 'Your subscription has been confirmed!' 
    });

  } catch (error: any) {
    console.error('[Newsletter] Error confirming subscription:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'An error occurred. Please try again later.' 
    });
  }
});

/**
 * GET /api/newsletter/unsubscribe
 * Unsubscribe from newsletter
 */
router.get('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid unsubscribe link' });
    }

    // Find and unsubscribe
    const unsubscribed = await newsletterSubscriberModel.unsubscribe(token);

    if (!unsubscribed) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid unsubscribe link' 
      });
    }

    console.log(`[Newsletter] Unsubscribed: ${unsubscribed.email}`);

    return res.status(200).json({ 
      ok: true, 
      message: 'You have been successfully unsubscribed.' 
    });

  } catch (error: any) {
    console.error('[Newsletter] Error processing unsubscribe:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'An error occurred. Please try again later.' 
    });
  }
});

/**
 * POST /api/newsletter/unsubscribe
 * Also support POST for unsubscribe (some email clients/forms prefer this)
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const token = req.body.token || req.query.token;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid unsubscribe link' });
    }

    const unsubscribed = await newsletterSubscriberModel.unsubscribe(token);

    if (!unsubscribed) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid unsubscribe link' 
      });
    }

    console.log(`[Newsletter] Unsubscribed (POST): ${unsubscribed.email}`);

    return res.status(200).json({ 
      ok: true, 
      message: 'You have been successfully unsubscribed.' 
    });

  } catch (error: any) {
    console.error('[Newsletter] Error processing unsubscribe:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'An error occurred. Please try again later.' 
    });
  }
});

// Handle unsupported methods on /subscribe
router.all('/subscribe', (_req: Request, res: Response) => {
  res.status(405).json({ ok: false, error: 'Method not allowed' });
});

export default router;

