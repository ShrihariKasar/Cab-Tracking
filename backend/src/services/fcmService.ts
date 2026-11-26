import admin from 'firebase-admin';
import { env } from '../config/env.js';
import { pool } from '../database/pool.js';

let initialized = false;
if (env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey,
    }),
  });
  initialized = true;
}

export async function notifyAllAdmins(params: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!initialized) return;

  const res = await pool.query(`SELECT fcm_token FROM admins WHERE is_active = TRUE AND fcm_token IS NOT NULL`);
  const tokens = res.rows.map((r) => r.fcm_token).filter(Boolean) as string[];
  if (tokens.length === 0) return;

  await admin
    .messaging()
    .sendEachForMulticast({
      tokens,
      notification: { title: params.title, body: params.body },
      data: params.data ?? {},
    })
    .catch((err) => console.warn('[FCM] admin multicast failed:', err.message));
}
