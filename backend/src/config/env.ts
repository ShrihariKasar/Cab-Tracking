import dotenv from 'dotenv';
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://cab_admin:changeme_in_env@localhost:5432/cab_tracking',
  jwtSecret: process.env.JWT_ACCESS_SECRET || 'dev-only-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'https://fleetpulse-backend-w864.onrender.com',
  companyName: process.env.COMPANY_NAME || 'FleetPulse Operations Inc.',
  companyPostalAddress:
    process.env.COMPANY_POSTAL_ADDRESS || '548 Market St, PMB 00000, San Francisco, CA 94104, USA',
  marketingFromEmail: process.env.MARKETING_FROM_EMAIL || 'updates@fleetpulse.example.com',
  unsubscribeSecret:
    process.env.UNSUBSCRIBE_SECRET || process.env.JWT_ACCESS_SECRET || 'dev-only-unsubscribe-secret',
};
