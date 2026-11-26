import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { DriverRecord } from '../types';

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const load = () => adminApi.get('/admin/drivers').then((r) => setDrivers(r.data.data || []));
  useEffect(() => {
    load();
  }, []);

  const addDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminApi.post('/admin/drivers', { fullName, phone, licenseNumber });
    setFullName('');
    setPhone('');
    setLicenseNumber('');
    load();
  };

  const updateVerification = async (id: string, verificationStatus: 'APPROVED' | 'SUSPENDED') => {
    await adminApi.patch(`/admin/drivers/${id}`, { verificationStatus });
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Driver Management</h1>
      <form onSubmit={addDriver} className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className="input" placeholder="Phone (+1...)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <input className="input" placeholder="License Number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required />
        <button className="btn btn-primary" type="submit">Add Driver</button>
      </form>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>License</th>
              <th>Verification</th>
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id}>
                <td>{d.fullName}</td>
                <td>{d.phone}</td>
                <td>{d.licenseNumber}</td>
                <td><span className="badge">{d.verificationStatus}</span></td>
                <td>{d.availabilityStatus}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => updateVerification(d.id, 'APPROVED')}>Approve</button>
                  <button className="btn btn-danger" onClick={() => updateVerification(d.id, 'SUSPENDED')}>Suspend</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
