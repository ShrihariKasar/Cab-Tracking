import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/pool.js';
import { signToken } from '../middleware/auth.js';

const loginSchema = z.object({
  mobileNumber: z.string().min(6).max(32),
  password: z.string().min(4),
  role: z.enum(['DRIVER', 'ADMIN']),
  fcmToken: z.string().optional(),
});

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
      `SELECT d.id, d.mobile_number, d.full_name, d.password_hash, d.photo_url, d.account_status, d.availability_status,
              v.id AS vehicle_id, v.registration_number, v.model, v.colour
       FROM drivers d
       LEFT JOIN vehicles v ON v.driver_id = d.id
       WHERE d.mobile_number = $1`,
      [mobileNumber]
    );
    const driver = r.rows[0];
    if (!driver || driver.account_status !== 'ACTIVE' || !(await bcrypt.compare(password, driver.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid driver credentials' });
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
