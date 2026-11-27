import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../database/pool.js';
import { signToken } from '../middleware/auth.js';

const loginSchema = z.object({
  mobileNumber: z.string().min(6).max(32),
  password: z.string().min(4),
  role: z.enum(['DRIVER', 'ADMIN']),
  fcmToken: z.string().optional(),
});

const registerSchema = z.object({
  fullName: z.string().min(2).max(150),
  mobileNumber: z.string().min(6).max(32),
  password: z.string().min(6).max(128),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD'),
  parentName: z.string().min(2).max(150).optional(),
  parentContact: z.string().min(5).max(150).optional(),
});

export function calculateAgeYears(dateOfBirth: string, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(dob.getTime()) ||
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== month - 1 ||
    dob.getUTCDate() !== day
  ) {
    return null;
  }
  if (dob.getTime() > now.getTime()) return null;

  let age = now.getUTCFullYear() - year;
  const monthDiff = now.getUTCMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < day)) {
    age--;
  }
  return age;
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body);
    const age = calculateAgeYears(body.dateOfBirth);
    if (age === null || age < 5 || age > 120) {
      return res.status(400).json({ success: false, message: 'Valid dateOfBirth is required' });
    }

    const isMinor = age < 18;
    if (isMinor && (!body.parentName?.trim() || !body.parentContact?.trim())) {
      return res.status(400).json({
        success: false,
        requiresParentalConsent: true,
        message: 'Under-18 registration requires parent/guardian name and contact for verifiable consent.',
      });
    }

    const existing = await pool.query(`SELECT id FROM drivers WHERE mobile_number = $1`, [body.mobileNumber.trim()]);
    if (existing.rows[0]) {
      return res.status(409).json({ success: false, message: 'Mobile number is already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const initialAccountStatus = isMinor ? 'SUSPENDED' : 'ACTIVE';
    const initialConsentStatus = isMinor ? 'PENDING_PARENTAL_CONSENT' : 'GRANTED';

    const drvRes = await pool.query(
      `INSERT INTO drivers (mobile_number, full_name, password_hash, date_of_birth, account_status, consent_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, mobile_number, full_name, account_status, consent_status`,
      [body.mobileNumber.trim(), body.fullName.trim(), passwordHash, body.dateOfBirth, initialAccountStatus, initialConsentStatus]
    );
    const driver = drvRes.rows[0];
    const verificationReference = `DPDP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    if (isMinor) {
      const code = String(crypto.randomInt(100000, 999999));
      const codeHash = await bcrypt.hash(code, 10);
      const consentRes = await pool.query(
        `INSERT INTO consent_records
         (user_id, role, user_age_years, is_minor, parent_name, parent_contact, verification_method, verification_code_hash, verification_reference, consent_status)
         VALUES ($1, 'DRIVER', $2, TRUE, $3, $4, 'OTP_VERIFICATION', $5, $6, 'PENDING_PARENTAL_CONSENT')
         RETURNING id`,
        [driver.id, age, body.parentName!.trim(), body.parentContact!.trim(), codeHash, verificationReference]
      );

      return res.status(202).json({
        success: true,
        data: {
          requiresParentalConsent: true,
          consentRecordId: consentRes.rows[0].id,
          verificationReference,
          consentStatus: 'PENDING_PARENTAL_CONSENT',
          // Exposed only in automated test environment; production requires SMS/Email OTP gateway
          ...(env.nodeEnv === 'test' ? { debugVerificationCode: code } : {}),
          message: 'Verifiable parental/guardian consent is required before activating this under-18 account.',
        },
      });
    }

    await pool.query(
      `INSERT INTO consent_records
       (user_id, role, user_age_years, is_minor, verification_method, verification_reference, consent_status, granted_at)
       VALUES ($1, 'DRIVER', $2, FALSE, 'ADULT_SELF_ATTESTATION', $3, 'GRANTED', NOW())`,
      [driver.id, age, verificationReference]
    );

    const token = signToken({
      sub: driver.id,
      role: 'DRIVER',
      mobileNumber: driver.mobile_number,
      fullName: driver.full_name,
    });

    return res.status(201).json({
      success: true,
      data: {
        requiresParentalConsent: false,
        consentStatus: 'GRANTED',
        verificationReference,
        token,
        user: {
          id: driver.id,
          role: 'DRIVER',
          mobileNumber: driver.mobile_number,
          fullName: driver.full_name,
          accountStatus: driver.account_status,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { mobileNumber, password, role, fcmToken } = loginSchema.parse(req.body);

    if (role === 'ADMIN') {
      const r = await pool.query(
        `SELECT id, mobile_number, full_name, password_hash, is_active FROM admins WHERE mobile_number = $1`,
        [mobileNumber]
      );
      const admin = r.rows[0];
      if (!admin || !admin.is_active || !(await bcrypt.compare(password, admin.password_hash))) {
        return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      }
      if (fcmToken) {
        await pool.query(`UPDATE admins SET fcm_token = $1, updated_at = NOW() WHERE id = $2`, [fcmToken, admin.id]);
      }
      const token = signToken({
        sub: admin.id,
        role: 'ADMIN',
        mobileNumber: admin.mobile_number,
        fullName: admin.full_name,
      });
      return res.json({
        success: true,
        data: {
          token,
          user: { id: admin.id, role: 'ADMIN', mobileNumber: admin.mobile_number, fullName: admin.full_name },
        },
      });
    }

    const r = await pool.query(
      `SELECT d.id, d.mobile_number, d.full_name, d.password_hash, d.photo_url, d.account_status, d.availability_status, d.consent_status,
              v.id AS vehicle_id, v.registration_number, v.model, v.colour
       FROM drivers d
       LEFT JOIN vehicles v ON v.driver_id = d.id
       WHERE d.mobile_number = $1`,
      [mobileNumber]
    );
    const driver = r.rows[0];
    if (!driver || !(await bcrypt.compare(password, driver.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid driver credentials' });
    }
    if (driver.consent_status === 'PENDING_PARENTAL_CONSENT') {
      return res.status(403).json({
        success: false,
        message: 'Verifiable parental/guardian consent is required before signing in.',
      });
    }
    if (driver.consent_status === 'WITHDRAWN') {
      return res.status(403).json({
        success: false,
        message: 'Data processing consent has been withdrawn for this account.',
      });
    }
    if (driver.account_status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Driver account is suspended' });
    }
    if (fcmToken) {
      await pool.query(`UPDATE drivers SET fcm_token = $1, updated_at = NOW() WHERE id = $2`, [fcmToken, driver.id]);
    }
    const token = signToken({
      sub: driver.id,
      role: 'DRIVER',
      mobileNumber: driver.mobile_number,
      fullName: driver.full_name,
    });
    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: driver.id,
          role: 'DRIVER',
          mobileNumber: driver.mobile_number,
          fullName: driver.full_name,
          photoUrl: driver.photo_url,
          accountStatus: driver.account_status,
          availabilityStatus: driver.availability_status,
          vehicle: driver.vehicle_id
            ? {
                id: driver.vehicle_id,
                registrationNumber: driver.registration_number,
                model: driver.model,
                colour: driver.colour,
              }
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
