-- Enforce at database level that a single driver can never have more than one active ride
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_ride_per_driver
  ON rides (driver_id)
  WHERE status = 'RIDE_STARTED';
