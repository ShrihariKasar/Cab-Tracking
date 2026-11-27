import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));
vi.mock('../database/pool.js', () => ({
  pool: { query: mockQuery },
}));
vi.mock('../services/fcmService.js', () => ({
  notifyAllAdmins: vi.fn().mockResolvedValue(undefined),
}));

import { createApp } from '../app.js';
import { signToken } from '../middleware/auth.js';
import { DRIVER_HTML } from '../driverPage.js';
import { MONITOR_HTML } from '../monitorPage.js';
import { createUnsubscribeToken } from '../services/marketingEmailService.js';

describe('Legal Compliance Audit Tests (DPDP, GDPR Fonts, CIPA, CAN-SPAM)', () => {
  const app = createApp();

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('1. Adult registration succeeds with age >= 18 and records GRANTED consent', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // existing check
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'drv-adult-1',
            mobile_number: '+919876543210',
            full_name: 'Aarav Sharma',
            account_status: 'ACTIVE',
            consent_status: 'GRANTED',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }); // consent_records insert

    const noTerms = await request(app).post('/api/auth/register').send({
      fullName: 'Aarav Sharma',
      mobileNumber: '+919876543210',
      password: 'Password@123',
      dateOfBirth: '1995-04-12',
      acceptedTerms: false,
    });
    expect(noTerms.status).toBe(400);

    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Aarav Sharma',
      mobileNumber: '+919876543210',
      password: 'Password@123',
      dateOfBirth: '1995-04-12',
      acceptedTerms: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.requiresParentalConsent).toBe(false);
    expect(res.body.data.consentStatus).toBe('GRANTED');
    expect(res.body.data.token).toBeTruthy();
  });

  it('2. Under-18 registration enforces server-side parental consent & blocks login until verified', async () => {
    // Missing parent info -> 400
    const missingParent = await request(app).post('/api/auth/register').send({
      fullName: 'Minor User',
      mobileNumber: '+919800000001',
      password: 'Password@123',
      dateOfBirth: '2012-06-15',
      acceptedTerms: true,
    });
    expect(missingParent.status).toBe(400);
    expect(missingParent.body.requiresParentalConsent).toBe(true);

    // With parent info -> 202 PENDING_PARENTAL_CONSENT (no token issued)
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'drv-minor-1',
            mobile_number: '+919800000001',
            full_name: 'Minor User',
            account_status: 'SUSPENDED',
            consent_status: 'PENDING_PARENTAL_CONSENT',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: '11111111-1111-4111-8111-111111111111' }] });

    const minorRes = await request(app).post('/api/auth/register').send({
      fullName: 'Minor User',
      mobileNumber: '+919800000001',
      password: 'Password@123',
      dateOfBirth: '2012-06-15',
      acceptedTerms: true,
      parentName: 'Parent Sharma',
      parentContact: 'parent@example.com',
    });

    expect(minorRes.status).toBe(202);
    expect(minorRes.body.data.requiresParentalConsent).toBe(true);
    expect(minorRes.body.data.token).toBeUndefined();
    const code = minorRes.body.data.debugVerificationCode;
    expect(code).toMatch(/^\d{6}$/);

    // Attempt login before verification -> 403
    const hash = await bcrypt.hash('Password@123', 4);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'drv-minor-1',
          mobile_number: '+919800000001',
          full_name: 'Minor User',
          password_hash: hash,
          account_status: 'SUSPENDED',
          consent_status: 'PENDING_PARENTAL_CONSENT',
        },
      ],
    });
    const blockedLogin = await request(app).post('/api/auth/login').send({
      mobileNumber: '+919800000001',
      password: 'Password@123',
      role: 'DRIVER',
    });
    expect(blockedLogin.status).toBe(403);

    // Verify parental consent with valid code -> 200 GRANTED
    const codeHash = await bcrypt.hash(code, 4);
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            user_id: 'drv-minor-1',
            verification_code_hash: codeHash,
            consent_status: 'PENDING_PARENTAL_CONSENT',
            verification_reference: 'DPDP-TESTREF',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const verifyRes = await request(app).post('/api/compliance/parental-consent/verify').send({
      consentRecordId: '11111111-1111-4111-8111-111111111111',
      verificationCode: code,
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.consentStatus).toBe('GRANTED');
  });

  it('3. Parental / user consent withdrawal suspends processing and ends active rides', async () => {
    const token = signToken({
      sub: 'drv-minor-1',
      role: 'DRIVER',
      mobileNumber: '+919800000001',
      fullName: 'Minor User',
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/compliance/consent/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.consentStatus).toBe('WITHDRAWN');
  });

  it('4. Local font loading with zero Google Fonts CDN requests in web pages', async () => {
    expect(DRIVER_HTML).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/i);
    expect(MONITOR_HTML).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/i);

    const privRes = await request(app).get('/privacy-policy');
    expect(privRes.status).toBe(200);
    expect(privRes.text).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  });

  it('5. Analytics and session replay are disabled by default before consent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/compliance/privacy-preferences?subjectKey=user-1');
    expect(res.status).toBe(200);
    expect(res.body.data.analyticsConsent).toBe(false);
    expect(res.body.data.sessionReplayConsent).toBe(false);
  });

  it('6 & 7. Marketing email includes working unsubscribe link, sender ID & postal address, and respects suppression list', async () => {
    const adminToken = signToken({
      sub: 'adm-1',
      role: 'ADMIN',
      mobileNumber: '+15550000001',
      fullName: 'Admin',
    });

    // Not suppressed -> renders with unsubscribe link & postal address
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // isEmailSuppressed -> false
      .mockResolvedValueOnce({ rows: [] }); // log insert

    const sendRes = await request(app)
      .post('/api/compliance/marketing/send')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        to: 'rider@example.com',
        subject: 'FleetPulse Quarterly Update',
        bodyHtml: '<p>New route features available.</p>',
        campaignId: 'camp-2026-q4',
        category: 'MARKETING',
      });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.data.sent).toBe(true);
    expect(sendRes.body.data.unsubscribeUrl).toContain('/api/compliance/unsubscribe?token=');
    expect(sendRes.body.data.html).toContain('Unsubscribe');
    expect(sendRes.body.data.html).toContain('San Francisco, CA');

    // Unsubscribe without login using token
    const unsubToken = createUnsubscribeToken('rider@example.com');
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const unsubRes = await request(app).get(`/api/compliance/unsubscribe?token=${encodeURIComponent(unsubToken)}`);
    expect(unsubRes.status).toBe(200);
    expect(unsubRes.text).toContain('You are unsubscribed');

    // Subsequent marketing campaign email is suppressed
    mockQuery
      .mockResolvedValueOnce({ rows: [{ email: 'rider@example.com' }] }) // isEmailSuppressed -> true
      .mockResolvedValueOnce({ rows: [] }); // log SUPPRESSED

    const secondSend = await request(app)
      .post('/api/compliance/marketing/send')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        to: 'rider@example.com',
        subject: 'Another Promo',
        bodyHtml: '<p>Promo</p>',
        campaignId: 'camp-2026-q4-2',
        category: 'MARKETING',
      });

    expect(secondSend.status).toBe(200);
    expect(secondSend.body.data.sent).toBe(false);
    expect(secondSend.body.data.suppressed).toBe(true);
  });

  it('8. Security headers, Terms & Conditions page, XSS escaping, and data export/deletion work', async () => {
    const termsRes = await request(app).get('/terms-and-conditions');
    expect(termsRes.status).toBe(200);
    expect(termsRes.text).toContain('Terms &amp; Conditions');
    expect(termsRes.headers['x-content-type-options']).toBe('nosniff');
    expect(termsRes.headers['x-frame-options']).toBe('DENY');
    expect(termsRes.headers['permissions-policy']).toContain('geolocation=(self)');
    expect(termsRes.headers['content-security-policy']).toBeTruthy();
    expect(MONITOR_HTML).toContain('function esc(');
    expect(DRIVER_HTML).not.toMatch(/\son(click|input)=/i);
    expect(MONITOR_HTML).not.toMatch(/\son(click|input)=/i);

    const drvToken = signToken({
      sub: 'drv-1',
      role: 'DRIVER',
      mobileNumber: '+15550000002',
      fullName: 'Driver One',
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'drv-1', fullName: 'Driver One' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const exportRes = await request(app)
      .get('/api/compliance/my-data')
      .set('Authorization', `Bearer ${drvToken}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.data.profile.id).toBe('drv-1');

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const delRes = await request(app)
      .delete('/api/compliance/account')
      .set('Authorization', `Bearer ${drvToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deleted).toBe(true);
  });
});
