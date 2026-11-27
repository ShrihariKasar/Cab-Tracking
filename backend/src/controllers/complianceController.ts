import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/pool.js';
import {
  isEmailSuppressed,
  sendComplianceAwareEmail,
  suppressEmail,
  verifyUnsubscribeToken,
} from '../services/marketingEmailService.js';

const verifyParentalSchema = z.object({
  consentRecordId: z.string().uuid(),
  verificationCode: z.string().min(6).max(12),
});

const withdrawConsentSchema = z.object({
  verificationReference: z.string().min(4).max(64).optional(),
});

const privacyPrefsSchema = z.object({
  subjectKey: z.string().min(3).max(128),
  analyticsConsent: z.boolean(),
  sessionReplayConsent: z.boolean(),
});

export async function verifyParentalConsent(req: Request, res: Response, next: NextFunction) {
  try {
    const { consentRecordId, verificationCode } = verifyParentalSchema.parse(req.body);

    const r = await pool.query(
      `SELECT id, user_id, verification_code_hash, consent_status, verification_reference
       FROM consent_records
       WHERE id = $1`,
      [consentRecordId]
    );
    const record = r.rows[0];
    if (!record) {
      return res.status(404).json({ success: false, message: 'Consent record not found' });
    }
    if (record.consent_status === 'WITHDRAWN') {
      return res.status(409).json({ success: false, message: 'Consent has already been withdrawn' });
    }
    if (record.consent_status === 'GRANTED') {
      return res.json({
        success: true,
        data: { consentStatus: 'GRANTED', verificationReference: record.verification_reference },
      });
    }

    if (!record.verification_code_hash || !(await bcrypt.compare(verificationCode, record.verification_code_hash))) {
      return res.status(403).json({ success: false, message: 'Invalid parental verification code' });
    }

    await pool.query(
      `UPDATE consent_records
       SET consent_status = 'GRANTED', granted_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [consentRecordId]
    );
    await pool.query(
      `UPDATE drivers
       SET consent_status = 'GRANTED', account_status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1`,
      [record.user_id]
    );

    return res.json({
      success: true,
      data: {
        consentRecordId,
        consentStatus: 'GRANTED',
        verificationReference: record.verification_reference,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function withdrawConsent(req: Request, res: Response, next: NextFunction) {
  try {
    const body = withdrawConsentSchema.parse(req.body || {});
    let userId: string | null = req.user?.sub || null;

    if (!userId && body.verificationReference) {
      const refRes = await pool.query(
        `SELECT user_id FROM consent_records WHERE verification_reference = $1 LIMIT 1`,
        [body.verificationReference]
      );
      userId = refRes.rows[0]?.user_id || null;
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication or valid verificationReference is required to withdraw consent',
      });
    }

    await pool.query(
      `UPDATE consent_records
       SET consent_status = 'WITHDRAWN', withdrawn_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND consent_status <> 'WITHDRAWN'`,
      [userId]
    );
    await pool.query(
      `UPDATE drivers
       SET consent_status = 'WITHDRAWN', account_status = 'SUSPENDED', availability_status = 'OFFLINE', updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
    await pool.query(
      `UPDATE rides
       SET status = 'RIDE_ENDED', end_time = NOW(), updated_at = NOW()
       WHERE driver_id = $1 AND status = 'RIDE_STARTED'`,
      [userId]
    );

    return res.json({
      success: true,
      data: { consentStatus: 'WITHDRAWN', withdrawnAt: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function getPrivacyPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const subjectKey = String(req.query.subjectKey || '').trim();
    if (!subjectKey) {
      return res.json({
        success: true,
        data: {
          analyticsConsent: false,
          sessionReplayConsent: false,
          sessionReplayEnabledByDefault: false,
        },
      });
    }

    const r = await pool.query(
      `SELECT subject_key AS "subjectKey",
              analytics_consent AS "analyticsConsent",
              session_replay_consent AS "sessionReplayConsent",
              updated_at AS "updatedAt"
       FROM privacy_preferences
       WHERE subject_key = $1`,
      [subjectKey]
    );
    const row = r.rows[0];
    return res.json({
      success: true,
      data: row || {
        subjectKey,
        analyticsConsent: false,
        sessionReplayConsent: false,
        sessionReplayEnabledByDefault: false,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function savePrivacyPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const { subjectKey, analyticsConsent, sessionReplayConsent } = privacyPrefsSchema.parse(req.body);
    await pool.query(
      `INSERT INTO privacy_preferences (subject_key, analytics_consent, session_replay_consent, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (subject_key) DO UPDATE SET
         analytics_consent = EXCLUDED.analytics_consent,
         session_replay_consent = EXCLUDED.session_replay_consent,
         updated_at = NOW()`,
      [subjectKey, analyticsConsent, sessionReplayConsent]
    );
    return res.json({
      success: true,
      data: { subjectKey, analyticsConsent, sessionReplayConsent },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUnsubscribeGet(req: Request, res: Response, next: NextFunction) {
  try {
    const token = String(req.query.token || '').trim();
    const email = verifyUnsubscribeToken(token);
    if (!email) {
      return res
        .status(400)
        .type('html')
        .send('<!doctype html><html><body><h2>Invalid or expired unsubscribe link.</h2></body></html>');
    }

    await suppressEmail(email, 'USER_UNSUBSCRIBED');
    return res
      .status(200)
      .type('html')
      .send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Unsubscribed</title></head><body style="font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#111"><h2>You are unsubscribed</h2><p>Your email address has been added to our marketing suppression list. You will no longer receive promotional emails from FleetPulse.</p></body></html>`
      );
  } catch (err) {
    next(err);
  }
}

export async function handleUnsubscribePost(req: Request, res: Response, next: NextFunction) {
  try {
    const bodySchema = z.object({
      token: z.string().min(10).optional(),
      email: z.string().email().optional(),
    });
    const parsed = bodySchema.parse(req.body || {});
    let targetEmail: string | null = null;
    if (parsed.token) {
      targetEmail = verifyUnsubscribeToken(parsed.token);
    } else if (parsed.email) {
      targetEmail = parsed.email.trim().toLowerCase();
    }

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Valid unsubscribe token or email is required' });
    }

    await suppressEmail(targetEmail, 'USER_UNSUBSCRIBED');
    return res.json({
      success: true,
      data: { email: targetEmail, unsubscribed: true },
    });
  } catch (err) {
    next(err);
  }
}

export async function sendMarketingEmailEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      to: z.string().email(),
      subject: z.string().min(2).max(200),
      bodyHtml: z.string().min(2),
      campaignId: z.string().min(2).max(100),
      category: z.enum(['MARKETING', 'TRANSACTIONAL']).default('MARKETING'),
    });
    const payload = schema.parse(req.body);
    const result = await sendComplianceAwareEmail(payload);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function checkSuppressionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'email query parameter is required' });
    }
    const suppressed = await isEmailSuppressed(email);
    return res.json({ success: true, data: { email: email.toLowerCase(), suppressed } });
  } catch (err) {
    next(err);
  }
}
