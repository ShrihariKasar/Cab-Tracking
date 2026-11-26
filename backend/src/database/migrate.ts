import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_mvp_schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('MVP database schema applied successfully.');

  const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM admins`);
  if ((countRes.rows[0]?.cnt ?? 0) === 0) {
    const adminPass = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin@1234', 10);
    const driverPass = await bcrypt.hash(process.env.SEED_DRIVER_PASSWORD || 'Driver@1234', 10);

    await pool.query(
      `INSERT INTO admins (mobile_number, full_name, password_hash)
       VALUES ($1, $2, $3) ON CONFLICT (mobile_number) DO NOTHING`,
      ['+15550000001', 'Fleet Operations Admin', adminPass]
    );

    const drvRes = await pool.query(
      `INSERT INTO drivers (mobile_number, full_name, password_hash, availability_status)
       VALUES ($1, $2, $3, 'AVAILABLE')
       ON CONFLICT (mobile_number) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['+15550000002', 'Rajesh Kumar', driverPass]
    );

    await pool.query(
      `INSERT INTO vehicles (driver_id, registration_number, model, colour)
       VALUES ($1, $2, $3, $4) ON CONFLICT (registration_number) DO NOTHING`,
      [drvRes.rows[0].id, 'KA-01-AB-1234', 'Toyota Innova Crysta', 'White']
    );
    console.log('Seeded initial admin (+15550000001) and driver (+15550000002).');
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
