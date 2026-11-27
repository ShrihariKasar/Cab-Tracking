import crypto from 'crypto';
import { env } from '../config/env.js';
import { pool } from '../database/pool.js';

export type EmailCategory = 'MARKETING' | 'TRANSACTIONAL';

export interface MarketingEmailInput {
  to: string;
  subject: string;
  bodyHtml: string;
  campaignId: string;
  category: EmailCategory;
}

export interface RenderedEmailResult {
  sent: boolean;
  suppressed: boolean;
  subject: string;
  from: string;
  html: string;
  unsubscribeUrl?: string;
  headers: Record<string, string>;
  deliveryNote: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createUnsubscribeToken(email: string): string {
  const normalized = normalizeEmail(email);
  const sig = crypto
    .createHmac('sha256', env.unsubscribeSecret)
    .update(normalized)
    .digest('hex');
  return `${Buffer.from(normalized, 'utf8').toString('base64url')}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  let email: string;
  try {
    email = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const normalized = normalizeEmail(email);
  const expectedSig = crypto
    .createHmac('sha256', env.unsubscribeSecret)
    .update(normalized)
    .digest('hex');

  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  return normalized;
}

export function buildUnsubscribeUrl(email: string): string {
  const token = createUnsubscribeToken(email);
  return `${env.publicBaseUrl}/api/compliance/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function isEmailSuppressed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const res = await pool.query(
    `SELECT email FROM marketing_email_suppressions WHERE email = $1 LIMIT 1`,
    [normalized]
  );
  return res.rows.length > 0;
}

export async function suppressEmail(email: string, reason = 'USER_UNSUBSCRIBED'): Promise<void> {
  const normalized = normalizeEmail(email);
  await pool.query(
    `INSERT INTO marketing_email_suppressions (email, reason, unsubscribed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason, unsubscribed_at = NOW()`,
    [normalized, reason]
  );
}

export function renderMarketingEmailHtml(input: {
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
}): { html: string; unsubscribeUrl: string } {
  const unsubscribeUrl = buildUnsubscribeUrl(input.recipientEmail);
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(input.subject)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px;line-height:1.5">
  <div>${input.bodyHtml}</div>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 16px" />
  <footer style="font-size:12px;color:#6b7280">
    <p style="margin:0 0 6px"><strong>${escapeHtml(env.companyName)}</strong></p>
    <p style="margin:0 0 10px">${escapeHtml(env.companyPostalAddress)}</p>
    <p style="margin:0">
      You received this promotional message from ${escapeHtml(env.companyName)}.
      <a href="${unsubscribeUrl}" style="color:#111;font-weight:700">Unsubscribe</a> at any time — no login or fee required.
    </p>
  </footer>
</body>
</html>`;
  return { html, unsubscribeUrl };
}

export async function sendComplianceAwareEmail(input: MarketingEmailInput): Promise<RenderedEmailResult> {
  const normalized = normalizeEmail(input.to);
  const from = `${env.companyName} <${env.marketingFromEmail}>`;

  if (input.category === 'MARKETING') {
    const suppressed = await isEmailSuppressed(normalized);
    if (suppressed) {
      await pool.query(
        `INSERT INTO marketing_email_logs (recipient_email, campaign_id, email_type, status)
         VALUES ($1, $2, 'MARKETING', 'SUPPRESSED')`,
        [normalized, input.campaignId]
      );
      return {
        sent: false,
        suppressed: true,
        subject: input.subject,
        from,
        html: '',
        headers: {},
        deliveryNote: 'Recipient is on the CAN-SPAM suppression list; email was not sent.',
      };
    }

    const { html, unsubscribeUrl } = renderMarketingEmailHtml({
      recipientEmail: normalized,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
    });

    await pool.query(
      `INSERT INTO marketing_email_logs (recipient_email, campaign_id, email_type, status)
       VALUES ($1, $2, 'MARKETING', 'QUEUED')`,
      [normalized, input.campaignId]
    );

    return {
      sent: true,
      suppressed: false,
      subject: input.subject,
      from,
      html,
      unsubscribeUrl,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      deliveryNote:
        'Rendered & queued with CAN-SPAM footer and List-Unsubscribe header (configure SMTP provider credentials for external dispatch).',
    };
  }

  // Transactional email (not blocked by marketing suppression)
  await pool.query(
    `INSERT INTO marketing_email_logs (recipient_email, campaign_id, email_type, status)
     VALUES ($1, $2, 'TRANSACTIONAL', 'QUEUED')`,
    [normalized, input.campaignId]
  );

  return {
    sent: true,
    suppressed: false,
    subject: input.subject,
    from,
    html: input.bodyHtml,
    headers: {},
    deliveryNote: 'Transactional email queued.',
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
