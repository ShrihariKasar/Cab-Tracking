export type AdminRole =
  | 'SUPER_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'DISPATCHER'
  | 'READ_ONLY_MONITOR';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  adminRole: AdminRole;
}

export interface FleetOverview {
  totalVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  availableVehicles: number;
  vehiclesOnTrips: number;
  completedTripsToday: number;
  pendingBookings: number;
  cancelledTrips: number;
}

export interface LiveVehicle {
  vehicleId: string;
  registrationNumber: string;
  model: string;
  driverId: string;
  driverName: string;
  tripId?: string | null;
  tripStatus?: string | null;
  latitude: number;
  longitude: number;
  speedMps: number;
  heading: number;
  lastUpdateAt: string;
  stale: boolean;
}

export interface DriverRecord {
  id: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  availabilityStatus: 'ONLINE' | 'OFFLINE' | 'ON_TRIP';
  vehicleRegistration?: string | null;
}

export interface VehicleRecord {
  id: string;
  registrationNumber: string;
  model: string;
  colour: string;
  category: string;
  status: string;
  assignedDriverName?: string | null;
  insuranceExpiry?: string | null;
  permitExpiry?: string | null;
  fitnessExpiry?: string | null;
}

export interface BookingRecord {
  id: string;
  bookingCode: string;
  customerName: string;
  pickupAddress: string;
  destinationAddress: string;
  scheduledAt: string;
  vehicleCategory: string;
  status: string;
  driverName?: string | null;
  vehicleRegistration?: string | null;
}
