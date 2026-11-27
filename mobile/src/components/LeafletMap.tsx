import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { LatLngPoint } from '../utils/routing';

export interface LeafletMapProps {
  vehicleCoord: LatLngPoint;
  startCoord?: LatLngPoint | null;
  destCoord?: LatLngPoint | null;
  routeCoords?: LatLngPoint[];
  active?: boolean;
  offline?: boolean;
  recenterSignal?: number;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  vehicleCoord,
  startCoord,
  destCoord,
  routeCoords = [],
  active = false,
  offline = false,
  recenterSignal = 0,
}) => {
  const webRef = useRef<WebView | null>(null);

  const initialHtml = useMemo(
    () => `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #eef2f6; }
    .cab-dot {
      width: 34px; height: 34px; border-radius: 50%; background: #000; color: #fff;
      border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center; font-size: 16px;
    }
    .cab-dot.active { border-color: #16a34a; }
    .cab-dot.offline { border-color: #dc2626; }
    .pin {
      color: #fff; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 800;
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-family: system-ui, sans-serif;
    }
    .pin.start { background: #16a34a; }
    .pin.end { background: #dc2626; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([${vehicleCoord.latitude}, ${vehicleCoord.longitude}], 15);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri', maxZoom: 19
    }).addTo(map);

    let cabMarker = null;
    let startMarker = null;
    let destMarker = null;
    let routeLine = null;
    let lastBoundsKey = '';

    function makeCabIcon(isActive, isOffline) {
      const cls = isOffline ? 'cab-dot offline' : (isActive ? 'cab-dot active' : 'cab-dot');
      return L.divIcon({ className: '', html: '<div class="' + cls + '">🚕</div>', iconSize: [34, 34], iconAnchor: [17, 17] });
    }
    const startIcon = L.divIcon({ className: '', html: '<div class="pin start">START</div>', iconSize: [54, 24], iconAnchor: [27, 12] });
    const endIcon = L.divIcon({ className: '', html: '<div class="pin end">END</div>', iconSize: [44, 24], iconAnchor: [22, 12] });

    window.updateMapState = function(payload) {
      if (!payload || !payload.vehicle) return;
      const v = payload.vehicle;
      const icon = makeCabIcon(payload.active, payload.offline);
      if (cabMarker) {
        cabMarker.setLatLng([v.latitude, v.longitude]).setIcon(icon);
      } else {
        cabMarker = L.marker([v.latitude, v.longitude], { icon: icon, zIndexOffset: 500 }).addTo(map);
      }

      if (payload.start) {
        if (startMarker) startMarker.setLatLng([payload.start.latitude, payload.start.longitude]);
        else startMarker = L.marker([payload.start.latitude, payload.start.longitude], { icon: startIcon }).addTo(map);
      } else if (startMarker) {
        map.removeLayer(startMarker); startMarker = null;
      }

      if (payload.dest) {
        if (destMarker) destMarker.setLatLng([payload.dest.latitude, payload.dest.longitude]);
        else destMarker = L.marker([payload.dest.latitude, payload.dest.longitude], { icon: endIcon }).addTo(map);
      } else if (destMarker) {
        map.removeLayer(destMarker); destMarker = null;
      }

      const pts = (payload.route || []).map(function(p) { return [p.latitude, p.longitude]; });
      if (pts.length > 1) {
        if (routeLine) routeLine.setLatLngs(pts);
        else routeLine = L.polyline(pts, { color: '#2563EB', weight: 5, opacity: 0.9 }).addTo(map);

        const boundsPts = pts.slice();
        boundsPts.push([v.latitude, v.longitude]);
        if (payload.start) boundsPts.push([payload.start.latitude, payload.start.longitude]);
        if (payload.dest) boundsPts.push([payload.dest.latitude, payload.dest.longitude]);
        const bKey = pts.length + ':' + pts[0][0].toFixed(3) + ',' + pts[pts.length - 1][0].toFixed(3);
        if (bKey !== lastBoundsKey) {
          lastBoundsKey = bKey;
          map.fitBounds(L.latLngBounds(boundsPts), { padding: [45, 45] });
        }
      } else {
        if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
        lastBoundsKey = '';
        map.panTo([v.latitude, v.longitude]);
      }
    };

    window.recenterCab = function(lat, lng) {
      map.setView([lat, lng], 15, { animate: true });
    };
  </script>
</body>
</html>`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const pushStateToWebView = () => {
    const payload = JSON.stringify({
      vehicle: vehicleCoord,
      start: startCoord || null,
      dest: destCoord || null,
      route: routeCoords,
      active,
      offline,
    });
    webRef.current?.injectJavaScript(`window.updateMapState && window.updateMapState(${payload}); true;`);
  };

  useEffect(() => {
    pushStateToWebView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vehicleCoord.latitude,
    vehicleCoord.longitude,
    startCoord?.latitude,
    startCoord?.longitude,
    destCoord?.latitude,
    destCoord?.longitude,
    routeCoords,
    active,
    offline,
  ]);

  useEffect(() => {
    if (recenterSignal > 0) {
      webRef.current?.injectJavaScript(
        `window.recenterCab && window.recenterCab(${vehicleCoord.latitude}, ${vehicleCoord.longitude}); true;`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html: initialHtml }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={pushStateToWebView}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2f6' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
