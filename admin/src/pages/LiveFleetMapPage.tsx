import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { adminApi } from '../services/api';
import { connectAdminSocket } from '../services/socket';
import { LiveVehicle } from '../types';

export const LiveFleetMapPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState<LiveVehicle | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    adminApi.get('/admin/fleet/live').then((res) => setVehicles(res.data.data || []));
    const socket = connectAdminSocket();
    if (!socket) return;

    const onLoc = (ping: any) => {
      setVehicles((prev) => {
        const idx = prev.findIndex((v) => v.vehicleId === ping.vehicleId);
        const updated: LiveVehicle = {
          vehicleId: ping.vehicleId,
          registrationNumber: ping.registrationNumber || prev[idx]?.registrationNumber || 'CAB',
          model: prev[idx]?.model || 'Fleet Cab',
          driverId: ping.driverId,
          driverName: prev[idx]?.driverName || 'Driver',
          tripId: ping.tripId,
          tripStatus: ping.tripStatus || prev[idx]?.tripStatus || 'ONLINE',
          latitude: ping.latitude,
          longitude: ping.longitude,
          speedMps: ping.speed || 0,
          heading: ping.heading || 0,
          lastUpdateAt: ping.serverTimestamp || new Date().toISOString(),
          stale: false,
        };
        if (idx === -1) return [...prev, updated];
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      });
    };

    socket.on('vehicle:location:updated', onLoc);
    return () => {
      socket.off('vehicle:location:updated', onLoc);
    };
  }, []);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
        v.driverName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || v.tripStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, search, statusFilter]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    const markers = filtered.map((v) => {
      const m = new google.maps.Marker({
        position: { lat: v.latitude, lng: v.longitude },
        title: `${v.registrationNumber} - ${v.driverName}`,
      });
      m.addListener('click', () => setSelected(v));
      return m;
    });
    clustererRef.current = new MarkerClusterer({ map: mapRef.current, markers });
  }, [filtered]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h1 style={{ margin: 0, flex: 1 }}>Live Fleet Tracking</h1>
        <input
          className="input"
          placeholder="Search vehicle reg or driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="DRIVER_ON_THE_WAY">Driver On The Way</option>
          <option value="TRIP_STARTED">Trip Started</option>
          <option value="ONLINE">Available / Online</option>
        </select>
      </div>

      <div className="card" style={{ height: 480, padding: 0, overflow: 'hidden' }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={{ lat: filtered[0]?.latitude || 12.9716, lng: filtered[0]?.longitude || 77.5946 }}
            zoom={12}
            onLoad={(map) => {
              mapRef.current = map;
            }}
          >
            {filtered.map((v) => (
              <Marker
                key={v.vehicleId}
                position={{ lat: v.latitude, lng: v.longitude }}
                onClick={() => setSelected(v)}
              />
            ))}
            {selected && (
              <InfoWindow
                position={{ lat: selected.latitude, lng: selected.longitude }}
                onCloseClick={() => setSelected(null)}
              >
                <div>
                  <strong>{selected.registrationNumber}</strong>
                  <div>Driver: {selected.driverName}</div>
                  <div>Speed: {(selected.speedMps * 3.6).toFixed(1)} km/h</div>
                  <div>Status: {selected.tripStatus || 'ONLINE'}</div>
                  <div>Last GPS: {new Date(selected.lastUpdateAt).toLocaleTimeString()}</div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div style={{ padding: 24 }}>Loading Google Maps...</div>
        )}
      </div>

      <div className="card">
        <h3>Active Vehicles ({filtered.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Speed</th>
              <th>Last GPS</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              const isStale = v.stale || Date.now() - new Date(v.lastUpdateAt).getTime() > 45000;
              return (
                <tr key={v.vehicleId} onClick={() => setSelected(v)} style={{ cursor: 'pointer' }}>
                  <td>{v.registrationNumber}</td>
                  <td>{v.driverName}</td>
                  <td>{v.tripStatus || 'ONLINE'}</td>
                  <td>{(v.speedMps * 3.6).toFixed(1)} km/h</td>
                  <td>{new Date(v.lastUpdateAt).toLocaleTimeString()}</td>
                  <td>
                    <span className={`badge ${isStale ? 'badge-stale' : 'badge-live'}`}>
                      {isStale ? 'STALE GPS' : 'LIVE'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
