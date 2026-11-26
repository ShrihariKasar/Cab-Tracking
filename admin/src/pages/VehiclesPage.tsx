import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { VehicleRecord } from '../types';

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [reg, setReg] = useState('');
  const [model, setModel] = useState('');
  const [colour, setColour] = useState('');
  const [category, setCategory] = useState('SEDAN');

  const load = () => adminApi.get('/admin/vehicles').then((r) => setVehicles(r.data.data || []));
  useEffect(() => {
    load();
  }, []);

  const addVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminApi.post('/admin/vehicles', {
      registrationNumber: reg,
      model,
      colour,
      category,
    });
    setReg('');
    setModel('');
    setColour('');
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Vehicle Management</h1>
      <form onSubmit={addVehicle} className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Registration #" value={reg} onChange={(e) => setReg(e.target.value)} required />
        <input className="input" placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} required />
        <input className="input" placeholder="Colour" value={colour} onChange={(e) => setColour(e.target.value)} required />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="SEDAN">SEDAN</option>
          <option value="SUV">SUV</option>
          <option value="HATCHBACK">HATCHBACK</option>
          <option value="LUXURY">LUXURY</option>
          <option value="VAN">VAN</option>
        </select>
        <button className="btn btn-primary" type="submit">Add Vehicle</button>
      </form>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Registration</th>
              <th>Model</th>
              <th>Colour</th>
              <th>Category</th>
              <th>Status</th>
              <th>Assigned Driver</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td>{v.registrationNumber}</td>
                <td>{v.model}</td>
                <td>{v.colour}</td>
                <td>{v.category}</td>
                <td><span className="badge">{v.status}</span></td>
                <td>{v.assignedDriverName || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
