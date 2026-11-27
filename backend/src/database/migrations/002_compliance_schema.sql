ALTER TABLE drivers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS consent_status VARCHAR(32) NOT NULL DEFAULT 'GRANTED'
  CHECK (consent_status IN ('PENDING_PARENTAL_CONSENT', 'GRANTED', 'WITHDRAWN'));

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'DRIVER',
  user_age_years INTEGER NOT NULL,
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  parent_name VARCHAR(150),
  parent_contact VARCHAR(150),
  verification_method VARCHAR(40) NOT NULL,
  verification_code_hash TEXT,
  verification_reference VARCHAR(64) NOT NULL UNIQUE,
  consent_status VARCHAR(32) NOT NULL CHECK (consent_status IN ('PENDING_PARENTAL_CONSENT', 'GRANTED', 'WITHDRAWN')),
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_preferences (
  subject_key VARCHAR(128) PRIMARY KEY,
  analytics_consent BOOLEAN NOT NULL DEFAULT FALSE,
  session_replay_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_version VARCHAR(32) NOT NULL DEFAULT '1.0',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_email_suppressions (
  email VARCHAR(255) PRIMARY KEY,
  reason VARCHAR(64) NOT NULL DEFAULT 'USER_UNSUBSCRIBED',
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(100) NOT NULL,
  email_type VARCHAR(20) NOT NULL CHECK (email_type IN ('MARKETING', 'TRANSACTIONAL')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('QUEUED', 'SENT', 'SUPPRESSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records (user_id, created_at DESC);
