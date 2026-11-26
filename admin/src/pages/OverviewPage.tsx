import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { FleetOverview } from '../types';

export const OverviewPage: React.FC = () => {
  const [data, setData] = useState<FleetOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .get('/admin/overview')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load fleet overview.'));
  }, []);

  if (error) return <div className="card">{error}</div>;
  if (!data) return <div className="card">Loading overview...</div>;

  const cards = [
    { label: 'Total Vehicles', value: data.totalVehicles },
    { label: 'Total Registered Drivers', value: data.totalDrivers },
    { label: 'Active Drivers', value: data.activeDrivers },
    { label: 'Available Vehicles', value: data.availableVehicles },
    { label: 'Vehicles on Trips', value: data.vehiclesOnTrips },
    { label: 'Completed Trips Today', value: data.completedTripsToday },
    { label: 'Pending Bookings', value: data.pendingBookings },
    { label: 'Cancelled Trips', value: data.cancelledTrips },
  ];

  return (
    <div>
      <h1>Fleet Operations Overview</h1>
      <div className="grid-4">
        {cards.map((c) => (
          <div className="card" key={c.label}>
            <div className="kpi-val">{c.value}</div>
            <div className="kpi-lbl">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
