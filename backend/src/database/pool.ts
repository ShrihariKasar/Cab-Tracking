import fs from 'fs';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { env } from '../config/env.js';

export interface DbPool {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
  end: () => Promise<void>;
}

function createPool(): DbPool {
  if (env.databaseUrl.startsWith('pglite://')) {
    const dataDir = env.databaseUrl.replace('pglite://', '') || './data/pgdata';
    fs.mkdirSync(dataDir, { recursive: true });
    const pg = new PGlite(dataDir);
    return {
      query: async (text: string, params?: unknown[]) => {
        // PGlite executes single statements with params, or multi-statement DDL via exec()
        if (!params || params.length === 0) {
          const trimmed = text.trim();
          if (trimmed.includes(';') && trimmed.indexOf(';') < trimmed.length - 1) {
            await pg.exec(text);
            return { rows: [] };
          }
        }
        const res = await pg.query(text, params as any[]);
        return { rows: res.rows as any[] };
      },
      end: async () => {
        await pg.close();
      },
    };
  }

  const needsSsl = env.databaseUrl.includes('sslmode=require') || env.databaseUrl.includes('neon.tech');
  return new Pool({
    connectionString: env.databaseUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 15,
    idleTimeoutMillis: 30000,
  });
}

export const pool = createPool();
