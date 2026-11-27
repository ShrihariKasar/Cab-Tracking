export interface PlaceSuggestion {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

interface PhotonFeature {
  properties?: {
    osm_id?: number | string;
    name?: string;
    street?: string;
    housenumber?: string;
    suburb?: string;
    locality?: string;
    village?: string;
    town?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
}

function formatPhotonLabel(p: NonNullable<PhotonFeature['properties']>): string {
  const parts = [
    p.name,
    [p.housenumber, p.street].filter(Boolean).join(' '),
    p.suburb || p.locality || p.village || p.town,
    p.city || p.county,
    p.state,
  ]
    .map((s) => (s || '').trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(', ');
}

export async function searchPlaces(
  query: string,
  near?: { latitude: number; longitude: number }
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const bias = near ? `&lat=${near.latitude}&lon=${near.longitude}` : '';
  const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=8${bias}`;
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&dedupe=0&limit=8&q=${encodeURIComponent(trimmed)}`;

  const [photonRes, nomRes] = await Promise.allSettled([
    fetch(photonUrl, { headers: { 'User-Agent': 'FleetPulseCabApp/1.0' } }).then((r) => (r.ok ? r.json() : null)),
    fetch(nominatimUrl, { headers: { 'User-Agent': 'FleetPulseCabApp/1.0' } }).then((r) => (r.ok ? r.json() : null)),
  ]);

  const results: PlaceSuggestion[] = [];
  const seen = new Set<string>();

  if (photonRes.status === 'fulfilled' && Array.isArray(photonRes.value?.features)) {
    for (const f of photonRes.value.features as PhotonFeature[]) {
      const coords = f.geometry?.coordinates;
      const props = f.properties;
      if (!coords || coords.length < 2 || !props) continue;
      if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) continue;
      const label = formatPhotonLabel(props);
      if (!label) continue;
      const key = `${coords[1].toFixed(4)},${coords[0].toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        placeId: `ph-${props.osm_id || key}`,
        displayName: label,
        latitude: coords[1],
        longitude: coords[0],
      });
    }
  }

  if (nomRes.status === 'fulfilled' && Array.isArray(nomRes.value)) {
    for (const item of nomRes.value as Array<{
      place_id: number | string;
      display_name: string;
      lat: string;
      lon: string;
    }>) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        placeId: `nom-${item.place_id}`,
        displayName: item.display_name,
        latitude: lat,
        longitude: lon,
      });
    }
  }

  return results.slice(0, 10);
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'FleetPulseCabApp/1.0' } });
    if (!res.ok) return 'Current GPS Location';
    const data = (await res.json()) as { display_name?: string };
    return data.display_name || 'Current GPS Location';
  } catch {
    return 'Current GPS Location';
  }
}
