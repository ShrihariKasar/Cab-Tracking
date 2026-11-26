import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { BookingsPage } from './pages/BookingsPage';
import { DriversPage } from './pages/DriversPage';
import { LiveFleetMapPage } from './pages/LiveFleetMapPage';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { ReportsPage } from './pages/ReportsPage';
import { TripsPage } from './pages/TripsPage';
import { VehiclesPage } from './pages/VehiclesPage';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = sessionStorage.getItem('admin_access_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="live-map" element={<LiveFleetMapPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App;
