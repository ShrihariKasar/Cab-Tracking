import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await adminApi.post('/auth/admin/login', { email, password });
      const { accessToken, refreshToken, user } = res.data.data;
      sessionStorage.setItem('admin_access_token', accessToken);
      sessionStorage.setItem('admin_refresh_token', refreshToken);
      sessionStorage.setItem('admin_role', user.adminRole || 'READ_ONLY_MONITOR');
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0 }}>FleetPulse Admin Login</h2>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        <input className="input" type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};
