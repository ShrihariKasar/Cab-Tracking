import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Car, ClipboardList, FileSpreadsheet, LayoutDashboard, LogOut, Map, Users } from 'lucide-react';
import { disconnectAdminSocket } from '../services/socket';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const role = sessionStorage.getItem('admin_role') || 'READ_ONLY_MONITOR';

  const logout = () => {
    disconnectAdminSocket();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>FleetPulse Admin</h2>
        <div style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 14px 8px' }}>Role: {role}</div>
        <NavLink to="/" end className="nav-link"><LayoutDashboard size={17} /> Overview</NavLink>
        <NavLink to="/live-map" className="nav-link"><Map size={17} /> Live Fleet Map</NavLink>
        <NavLink to="/drivers" className="nav-link"><Users size={17} /> Drivers</NavLink>
        <NavLink to="/vehicles" className="nav-link"><Car size={17} /> Vehicles</NavLink>
        <NavLink to="/bookings" className="nav-link"><ClipboardList size={17} /> Bookings</NavLink>
        <NavLink to="/trips" className="nav-link"><Activity size={17} /> Trip Monitoring</NavLink>
        <NavLink to="/reports" className="nav-link"><FileSpreadsheet size={17} /> Reports</NavLink>
        <button onClick={logout} className="btn btn-secondary" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogOut size={15} /> Log Out
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
};
