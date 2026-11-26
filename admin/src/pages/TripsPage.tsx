import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';

interface TripRow {
  id: string;
  bookingCode: string;
  status: string;
  driverName?: string;
  vehicleRegistration?: string;
  distanceMeters?: number;
  startedAt?: string;
  completedAt?: string;
}

export const TripsPage: React.FC = () => {
  const [trips, setTrips] = useState<TripRow[]>([]);

  useEffect(() => {
    adminApi.get('/trips/history').then((r) => setTrips(r.data.data || []));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Trip Monitoring & History</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Status</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Distance</th>
              <th>Started</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td>{t.bookingCode}</td>
                <td><span className="badge">{t.status}</span></td>
                <td>{t.driverName || '-'}</td>
                <td>{t.vehicleRegistration || '-'}</td>
                <td>{t.distanceMeters ? `${(t.distanceMeters / 1000).toFixed(2)} km` : '-'}</td>
                <td>{t.startedAt ? new Date(t.startedAt).toLocaleString() : '-'}</td>
                <td>{t.completedAt ? new Date(t.completedAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
