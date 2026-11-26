import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { BookingRecord, DriverRecord, VehicleRecord } from '../types';

export const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const load = () => {
    adminApi.get('/bookings').then((r) => setBookings(r.data.data || []));
    adminApi.get('/admin/drivers').then((r) => setDrivers(r.data.data || []));
    adminApi.get('/admin/vehicles').then((r) => setVehicles(r.data.data || []));
  };

  useEffect(() => {
    load();
  }, []);

  const assign = async (bookingId: string) => {
    if (!selectedDriverId || !selectedVehicleId) return;
    await adminApi.post(`/bookings/${bookingId}/assign`, {
      driverId: selectedDriverId,
      vehicleId: selectedVehicleId,
    });
    setAssigningId(null);
    load();
  };

  const cancel = async (bookingId: string) => {
    await adminApi.patch(`/bookings/${bookingId}/cancel`, { reason: 'Cancelled by dispatcher' });
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Booking & Dispatch Management</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer</th>
              <th>Pickup</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Driver / Vehicle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.bookingCode}</td>
                <td>{b.customerName}</td>
                <td>{b.pickupAddress}</td>
                <td>{b.destinationAddress}</td>
                <td><span className="badge">{b.status}</span></td>
                <td>{b.driverName ? `${b.driverName} (${b.vehicleRegistration || ''})` : 'Unassigned'}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => setAssigningId(b.id)}>Assign</button>
                  <button className="btn btn-danger" onClick={() => cancel(b.id)}>Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assigningId && (
        <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Assign Driver & Vehicle</strong>
          <select className="input" value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)}>
            <option value="">Select Driver</option>
            {drivers.filter((d) => d.verificationStatus === 'APPROVED').map((d) => (
              <option key={d.id} value={d.id}>{d.fullName} ({d.availabilityStatus})</option>
            ))}
          </select>
          <select className="input" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}>
            <option value="">Select Vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber} ({v.model})</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => assign(assigningId)}>Confirm Assignment</button>
          <button className="btn btn-secondary" onClick={() => setAssigningId(null)}>Close</button>
        </div>
      )}
    </div>
  );
};
