import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_mvp_schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('MVP database schema applied successfully.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
