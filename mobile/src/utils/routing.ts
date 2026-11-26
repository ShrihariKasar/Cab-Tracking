export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

const routeCache = new Map<string, LatLngPoint[]>();

/**
 * Fetches a road-following driving route from OSRM between two coordinates,
 * falling back to a direct two-point line if the routing service is unreachable.
 */
export async function fetchRoadRoute(start: LatLngPoint, end: LatLngPoint): Promise<LatLngPoint[]> {
  const key = `${start.latitude.toFixed(5)},${start.longitude.toFixed(5)}->${end.latitude.toFixed(5)},${end.longitude.toFixed(5)}`;
  const cached = routeCache.get(key);
  if (cached) return cached;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const coords: [number, number][] | undefined = json?.routes?.[0]?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length > 1) {
        const pts = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
        routeCache.set(key, pts);
        return pts;
      }
    }
  } catch {
    // Fallback to straight line when offline or OSRM is unreachable
  }

  return [start, end];
}
