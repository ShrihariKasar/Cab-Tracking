export type UserRole = 'DRIVER' | 'ADMIN';

export interface VehicleInfo {
  id?: string;
  registrationNumber: string;
  model: string;
  colour: string;
}

export interface AuthUser {
  id: string;
  role: UserRole;
  mobileNumber: string;
  fullName: string;
  photoUrl?: string | null;
  accountStatus?: 'ACTIVE' | 'SUSPENDED';
  availabilityStatus?: 'AVAILABLE' | 'ON_RIDE' | 'OFFLINE';
  vehicle?: VehicleInfo | null;
}

export interface DriverListItem {
  id: string;
  mobileNumber: string;
  fullName: string;
  photoUrl?: string | null;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  availabilityStatus: 'AVAILABLE' | 'ON_RIDE' | 'OFFLINE';
  internetConnected: boolean;
  gpsEnabled: boolean;
  vehicleRegistration?: string | null;
  vehicleModel?: string | null;
  vehicleColour?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  capturedAt?: string | null;
  lastSyncedAt?: string | null;
  activeRideId?: string | null;
  rideStatus?: 'RIDE_STARTED' | 'RIDE_ENDED' | null;
  rideStartTime?: string | null;
}

export interface ActiveRideItem {
  rideId: string;
  driverId: string;
  startTime: string;
  driverName: string;
  mobileNumber: string;
  photoUrl?: string | null;
  vehicleRegistration?: string | null;
  vehicleModel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string | null;
  lastSyncedAt?: string | null;
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}
