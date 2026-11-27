-- PostgreSQL Row-Level Security (RLS) & Admin Audit Log
-- Note: For strict DB-level enforcement, connect with a non-superuser role and set
-- SET LOCAL app.current_user_id = '<uuid>'; SET LOCAL app.current_user_role = 'DRIVER' | 'ADMIN';

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action VARCHAR(80) NOT NULL,
  target_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drivers_isolation_select ON drivers;
CREATE POLICY drivers_isolation_select ON drivers FOR SELECT
  USING (current_setting('app.current_user_role', true) = 'ADMIN' OR id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS drivers_isolation_update ON drivers;
CREATE POLICY drivers_isolation_update ON drivers FOR UPDATE
  USING (id::text = current_setting('app.current_user_id', true))
  WITH CHECK (id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS drivers_isolation_delete ON drivers;
CREATE POLICY drivers_isolation_delete ON drivers FOR DELETE
  USING (id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS rides_isolation_all ON rides;
CREATE POLICY rides_isolation_all ON rides FOR ALL
  USING (current_setting('app.current_user_role', true) = 'ADMIN' OR driver_id::text = current_setting('app.current_user_id', true))
  WITH CHECK (driver_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS driver_locations_isolation_all ON driver_locations;
CREATE POLICY driver_locations_isolation_all ON driver_locations FOR ALL
  USING (current_setting('app.current_user_role', true) = 'ADMIN' OR driver_id::text = current_setting('app.current_user_id', true))
  WITH CHECK (driver_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS ride_history_isolation_all ON ride_location_history;
CREATE POLICY ride_history_isolation_all ON ride_location_history FOR ALL
  USING (current_setting('app.current_user_role', true) = 'ADMIN' OR driver_id::text = current_setting('app.current_user_id', true))
  WITH CHECK (driver_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS consent_records_isolation_all ON consent_records;
CREATE POLICY consent_records_isolation_all ON consent_records FOR ALL
  USING (user_id::text = current_setting('app.current_user_id', true))
  WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS privacy_prefs_isolation_all ON privacy_preferences;
CREATE POLICY privacy_prefs_isolation_all ON privacy_preferences FOR ALL
  USING (subject_key = current_setting('app.current_user_id', true))
  WITH CHECK (subject_key = current_setting('app.current_user_id', true));
