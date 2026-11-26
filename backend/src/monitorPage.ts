export const MONITOR_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FleetPulse — Laptop Admin Live Monitor</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #f5f5f5; color: #111; display: flex; flex-direction: column; height: 100vh; }
    header { background: #000; color: #fff; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .brand { font-weight: 800; font-size: 18px; }
    .pill { padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #262626; color: #fff; }
    .pill.live { background: #16a34a; color: #fff; }
    .pill.offline { background: #dc2626; color: #fff; }
    main { flex: 1; display: flex; min-height: 0; }
    #sidebar { width: 320px; background: #fff; border-right: 1px solid #e5e5e5; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    #map { flex: 1; }
    .card { background: #f8fafc; border: 1px solid #e5e5e5; border-radius: 14px; padding: 14px; cursor: pointer; }
    .card.active { border-color: #000; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .btn { background: #000; color: #fff; border: none; border-radius: 10px; padding: 10px 14px; font-weight: 700; cursor: pointer; width: 100%; }
    input { width: 100%; padding: 10px; border: 1px solid #d4d4d4; border-radius: 10px; margin-bottom: 8px; }
    .muted { font-size: 12px; color: #717171; }
    .car-icon { background: #000; color: #fff; width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 3px 10px rgba(0,0,0,0.35); }
    .start-pin { background: #16a34a; color: #fff; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
    @media (max-width: 768px) { main { flex-direction: column; } #sidebar { width: 100%; max-height: 40vh; } }
  </style>
</head>
<body>
  <header>
    <div class="brand">FleetPulse • Live Admin Monitor</div>
    <div id="connBadge" class="pill">Disconnected</div>
  </header>
  <main>
    <aside id="sidebar">
      <div id="loginBox">
        <h3 style="margin:0 0 10px">Admin Sign In</h3>
        <input id="mobile" value="+15550000001" placeholder="Admin Mobile" />
        <input id="pass" type="password" value="Admin@1234" placeholder="Password" />
        <button class="btn" onclick="login()">Sign In &amp; Watch Live</button>
        <div id="loginErr" class="muted" style="color:#dc2626;margin-top:6px"></div>
      </div>
      <div id="driversList" style="display:none;flex-direction:column;gap:10px"></div>
    </aside>
    <div id="map"></div>
  </main>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const map = L.map('map').setView([19.88, 74.48], 13);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri', maxZoom: 19 }).addTo(map);
    const markers = {};
    const startMarkers = {};
    const routes = {};
    let token = '';
    let drivers = [];

    const carIcon = L.divIcon({ className: '', html: '<div class="car-icon">🚕</div>', iconSize: [34, 34], iconAnchor: [17, 17] });
    const startIcon = L.divIcon({ className: '', html: '<div class="start-pin">START</div>', iconSize: [54, 24], iconAnchor: [27, 12] });

    async function login() {
      const mobileNumber = document.getElementById('mobile').value.trim();
      const password = document.getElementById('pass').value;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, password, role: 'ADMIN' })
      });
      const json = await res.json();
      if (!res.ok) {
        document.getElementById('loginErr').textContent = json.message || 'Login failed';
        return;
      }
      token = json.data.token;
      document.getElementById('loginBox').style.display = 'none';
      document.getElementById('driversList').style.display = 'flex';
      await loadDrivers();
      connectSocket();
    }

    async function loadDrivers() {
      const res = await fetch('/api/drivers', { headers: { Authorization: 'Bearer ' + token } });
      const json = await res.json();
      drivers = json.data || [];
      renderDrivers();
      for (const d of drivers) {
        if (d.activeRideId) {
          await loadRideRoute(d.id, d.activeRideId);
        }
        if (d.latitude && d.longitude) {
          updateMarker(d.id, d.fullName, d.vehicleRegistration, d.latitude, d.longitude, d.capturedAt);
        }
      }
    }

    async function loadRideRoute(driverId, rideId) {
      const res = await fetch('/api/rides/' + rideId + '/route', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) return;
      const json = await res.json();
      const r = json.data;
      const coords = [];
      if (r.startLat && r.startLng) {
        coords.push([r.startLat, r.startLng]);
        if (!startMarkers[driverId]) {
          startMarkers[driverId] = L.marker([r.startLat, r.startLng], { icon: startIcon }).addTo(map);
        } else {
          startMarkers[driverId].setLatLng([r.startLat, r.startLng]);
        }
      }
      (r.points || []).forEach((p) => coords.push([p.latitude, p.longitude]));
      if (routes[driverId]) {
        routes[driverId].setLatLngs(coords);
      } else {
        routes[driverId] = L.polyline(coords, { color: '#000000', weight: 4, opacity: 0.85 }).addTo(map);
      }
    }

    function updateMarker(id, name, reg, lat, lng, ts) {
      const label = '<b>' + name + '</b><br/>' + (reg || '') + '<br/>Updated: ' + new Date(ts).toLocaleTimeString();
      if (markers[id]) {
        markers[id].setLatLng([lat, lng]).setPopupContent(label);
      } else {
        markers[id] = L.marker([lat, lng], { icon: carIcon }).addTo(map).bindPopup(label).openPopup();
      }
      if (routes[id]) {
        routes[id].addLatLng([lat, lng]);
      }
      map.panTo([lat, lng]);
    }

    function renderDrivers() {
      const el = document.getElementById('driversList');
      el.innerHTML = drivers.map((d) => {
        const isLive = d.rideStatus === 'RIDE_STARTED';
        return '<div class="card ' + (isLive ? 'active' : '') + '" onclick="focusDriver(\\'' + d.id + '\\')">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<strong>' + d.fullName + '</strong>' +
            '<span class="pill ' + (isLive ? 'live' : '') + '">' + (isLive ? 'ACTIVE RIDE' : d.availabilityStatus) + '</span>' +
          '</div>' +
          '<div class="muted">' + (d.vehicleRegistration || 'No Vehicle') + ' • ' + (d.vehicleModel || '') + '</div>' +
          (isLive && (d.pickupAddress || d.destinationAddress)
            ? '<div class="muted" style="color:#111;font-weight:600;margin-top:2px">' + (d.pickupAddress || 'GPS') + (d.destinationAddress ? ' → ' + d.destinationAddress : '') + '</div>'
            : '') +
          '<div class="muted">Last GPS: ' + (d.capturedAt ? new Date(d.capturedAt).toLocaleTimeString() : 'Waiting...') + '</div>' +
        '</div>';
      }).join('');
    }

    function focusDriver(id) {
      if (markers[id]) {
        map.setView(markers[id].getLatLng(), 16);
        markers[id].openPopup();
      }
    }

    function connectSocket() {
      const badge = document.getElementById('connBadge');
      const socket = io('/', { auth: { token } });
      socket.on('connect', () => { badge.textContent = 'LIVE SOCKET'; badge.className = 'pill live'; });
      socket.on('disconnect', () => { badge.textContent = 'DISCONNECTED'; badge.className = 'pill offline'; });
      socket.on('driver:ride:started', () => loadDrivers());
      socket.on('driver:ride:ended', () => loadDrivers());
      socket.on('admin:location:updated', (p) => {
        const d = drivers.find((x) => x.id === p.driverId);
        if (d) {
          d.latitude = p.latitude; d.longitude = p.longitude; d.capturedAt = p.capturedAt;
          renderDrivers();
          updateMarker(d.id, d.fullName, d.vehicleRegistration, p.latitude, p.longitude, p.capturedAt);
        } else {
          loadDrivers();
        }
      });
    }
  </script>
</body>
</html>`;
