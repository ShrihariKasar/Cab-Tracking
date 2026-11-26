export const DRIVER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>FleetPulse — Driver Live Tracker</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #f5f5f5; color: #111; min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #000; color: #fff; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-weight: 800; font-size: 18px; }
    .pill { padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #262626; color: #fff; }
    .pill.live { background: #16a34a; }
    .pill.err { background: #dc2626; }
    main { flex: 1; padding: 16px; max-width: 440px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
    .card { background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 10px; }
    input { width: 100%; padding: 12px; border: 1px solid #d4d4d4; border-radius: 10px; font-size: 15px; }
    .btn { width: 100%; min-height: 52px; border: none; border-radius: 12px; font-size: 16px; font-weight: 800; cursor: pointer; color: #fff; background: #000; }
    .btn.end { background: #dc2626; }
    .row { display: flex; justify-content: space-between; font-size: 14px; }
    .muted { font-size: 12px; color: #717171; }
  </style>
</head>
<body>
  <header>
    <div class="brand">FleetPulse Driver</div>
    <div id="statusBadge" class="pill">Idle</div>
  </header>
  <main>
    <div id="loginCard" class="card">
      <h2 style="margin:0">Driver Sign In</h2>
      <input id="mobile" value="+15550000002" placeholder="Mobile Number" />
      <input id="pass" type="password" value="Driver@1234" placeholder="Password" />
      <button class="btn" onclick="login()">Sign In</button>
      <div id="loginErr" class="muted" style="color:#dc2626"></div>
    </div>

    <div id="rideCard" class="card" style="display:none">
      <strong id="drvName" style="font-size:18px">Driver</strong>
      <div id="drvVeh" class="muted">Vehicle</div>
      <div class="row"><span>GPS Signal</span><strong id="gpsState">Waiting</strong></div>
      <div class="row"><span>Coordinates</span><strong id="coords">-</strong></div>
      <div class="row"><span>Last Synced</span><strong id="syncTime">-</strong></div>
      <div id="routeInputs" style="display:flex;flex-direction:column;gap:8px;margin-top:4px;position:relative">
        <input id="pickupInput" placeholder="From (type to search or leave blank for GPS)" oninput="searchPlaces('pickup', this.value)" autocomplete="off" />
        <input id="destInput" placeholder="To (type destination e.g. Pune Airport)" oninput="searchPlaces('dest', this.value)" autocomplete="off" />
        <div id="suggestions" style="display:none;flex-direction:column;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;background:#fff"></div>
      </div>
      <div id="routeSummary" class="muted" style="display:none;font-weight:700;color:#111"></div>
      <button id="startBtn" class="btn" onclick="startRide()">START RIDE</button>
      <button id="endBtn" class="btn end" style="display:none" onclick="endRide()">END RIDE</button>
      <div id="msg" class="muted" style="color:#dc2626"></div>
    </div>
  </main>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    let token = '';
    let socket = null;
    let watchId = null;
    let lastPt = null;
    let lastEmit = 0;
    let selectedDestCoords = null;
    let searchTimer = null;

    function searchPlaces(target, query) {
      clearTimeout(searchTimer);
      const box = document.getElementById('suggestions');
      if (!query || query.trim().length < 3) { box.style.display = 'none'; return; }
      searchTimer = setTimeout(async () => {
        try {
          const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&q=' + encodeURIComponent(query.trim()));
          const list = await r.json();
          if (!list.length) { box.style.display = 'none'; return; }
          box.innerHTML = '';
          list.forEach((item) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.style = 'text-align:left;padding:10px 12px;border:none;border-bottom:1px solid #f0f0f0;background:#fff;cursor:pointer;font-size:13px;color:#111';
            btn.textContent = item.display_name;
            btn.onclick = () => {
              if (target === 'pickup') {
                document.getElementById('pickupInput').value = item.display_name;
              } else {
                document.getElementById('destInput').value = item.display_name;
                selectedDestCoords = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
              }
              box.style.display = 'none';
            };
            box.appendChild(btn);
          });
          box.style.display = 'flex';
        } catch {}
      }, 350);
    }

    async function login() {
      const mobileNumber = document.getElementById('mobile').value.trim();
      const password = document.getElementById('pass').value;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, password, role: 'DRIVER' })
      });
      const json = await res.json();
      if (!res.ok) {
        document.getElementById('loginErr').textContent = json.message || 'Login failed';
        return;
      }
      token = json.data.token;
      const u = json.data.user;
      document.getElementById('drvName').textContent = u.fullName;
      document.getElementById('drvVeh').textContent = u.vehicle ? (u.vehicle.registrationNumber + ' • ' + u.vehicle.model) : 'No vehicle';
      document.getElementById('loginCard').style.display = 'none';
      document.getElementById('rideCard').style.display = 'flex';
      socket = io('/', { auth: { token } });
    }

    function getPos() {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy || 10, capturedAt: new Date(p.timestamp).toISOString() }),
          reject,
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }

    async function startRide() {
      document.getElementById('msg').textContent = '';
      if (!navigator.geolocation) {
        document.getElementById('msg').textContent = 'Geolocation not supported in this browser.';
        return;
      }
      try {
        const pt = await getPos();
        lastPt = pt;
        const pickupAddress = document.getElementById('pickupInput').value.trim() || 'Current GPS Location';
        const destinationAddress = document.getElementById('destInput').value.trim() || '';
        const res = await fetch('/api/rides/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({
            ...pt,
            pickupAddress,
            destinationAddress: destinationAddress || undefined,
            destinationLatitude: selectedDestCoords ? selectedDestCoords.lat : undefined,
            destinationLongitude: selectedDestCoords ? selectedDestCoords.lng : undefined
          })
        });
        const json = await res.json();
        if (!res.ok && res.status !== 409) {
          document.getElementById('msg').textContent = json.message || 'Could not start ride';
          return;
        }
        document.getElementById('routeInputs').style.display = 'none';
        const sum = document.getElementById('routeSummary');
        sum.textContent = destinationAddress ? ('Route: ' + pickupAddress + ' → ' + destinationAddress) : ('From: ' + pickupAddress);
        sum.style.display = 'block';
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('endBtn').style.display = 'block';
        const badge = document.getElementById('statusBadge');
        badge.textContent = 'RIDE STARTED';
        badge.className = 'pill live';
        document.getElementById('gpsState').textContent = 'Active';
        document.getElementById('coords').textContent = pt.latitude.toFixed(5) + ', ' + pt.longitude.toFixed(5);
        document.getElementById('syncTime').textContent = new Date().toLocaleTimeString();

        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const now = Date.now();
            if (now - lastEmit < 4000) return;
            lastEmit = now;
            const ping = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy || 10,
              capturedAt: new Date(pos.timestamp).toISOString()
            };
            lastPt = ping;
            document.getElementById('coords').textContent = ping.latitude.toFixed(5) + ', ' + ping.longitude.toFixed(5);
            if (socket && socket.connected) {
              socket.emit('driver:location:update', ping);
              document.getElementById('syncTime').textContent = new Date().toLocaleTimeString();
            }
          },
          (err) => { document.getElementById('msg').textContent = 'GPS error: ' + err.message; },
          { enableHighAccuracy: true, maximumAge: 2000 }
        );
      } catch (e) {
        document.getElementById('msg').textContent = 'Please allow GPS location access in browser settings.';
      }
    }

    async function endRide() {
      if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
      await fetch('/api/rides/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(lastPt || {})
      });
      document.getElementById('routeInputs').style.display = 'flex';
      document.getElementById('routeSummary').style.display = 'none';
      document.getElementById('startBtn').style.display = 'block';
      document.getElementById('endBtn').style.display = 'none';
      const badge = document.getElementById('statusBadge');
      badge.textContent = 'Idle';
      badge.className = 'pill';
    }
  </script>
</body>
</html>`;
