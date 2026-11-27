export interface PlaceSuggestion {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
}

interface PhotonFeature {
  properties?: {
    osm_id?: number | string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
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

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
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

function isBroadBoundary(osmType?: string, osmKey?: string, osmValue?: string): boolean {
  const v = (osmValue || osmType || '').toLowerCase();
  const k = (osmKey || '').toLowerCase();
  return k === 'boundary' || v === 'administrative' || v === 'county' || v === 'state' || v === 'district';
}

const searchCache = new Map<string, PlaceSuggestion[]>();

export async function searchPlaces(
  query: string,
  near?: { latitude: number; longitude: number }
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = `${trimmed.toLowerCase()}|${near ? `${near.latitude.toFixed(2)},${near.longitude.toFixed(2)}` : ''}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const bias = near ? `&lat=${near.latitude}&lon=${near.longitude}&location_bias_scale=0.5` : '';
  const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=10${bias}`;

  const viewbox = near
    ? `&viewbox=${near.longitude - 1.5},${near.latitude + 1.5},${near.longitude + 1.5},${near.latitude - 1.5}&bounded=0`
    : '';
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&dedupe=0&limit=10${viewbox}&q=${encodeURIComponent(trimmed)}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;

  const [photonRes, nomRes] = await Promise.allSettled([
    fetch(photonUrl, {
      headers: { 'User-Agent': 'FleetPulseCabApp/1.0' },
      signal: controller?.signal,
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(nominatimUrl, {
      headers: { 'User-Agent': 'FleetPulseCabApp/1.0' },
      signal: controller?.signal,
    }).then((r) => (r.ok ? r.json() : null)),
  ]);
  if (timer) clearTimeout(timer);

  interface ScoredCandidate extends PlaceSuggestion {
    score: number;
  }
  const candidates: ScoredCandidate[] = [];
  const seen = new Set<string>();
  const qLower = trimmed.toLowerCase();

  const scoreCandidate = (label: string, lat: number, lon: number, broad: boolean): ScoredCandidate => {
    const dist = near ? haversineKm(near, { latitude: lat, longitude: lon }) : undefined;
    const labelLower = label.toLowerCase();
    const firstToken = labelLower.split(',')[0]?.trim() || '';

    let score = 0;
    if (firstToken === qLower) score += 120;
    else if (firstToken.startsWith(qLower)) score += 80;
    else if (labelLower.includes(qLower)) score += 30;

    if (broad) score -= 45;
    if (dist !== undefined) {
      // Strongly prefer nearby results (within ~150km)
      score -= Math.min(dist, 500) * 0.25;
    }
    return {
      placeId: '',
      displayName: label,
      latitude: lat,
      longitude: lon,
      distanceKm: dist !== undefined ? Math.round(dist * 10) / 10 : undefined,
      score,
    };
  };

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

      const broad = isBroadBoundary(props.type, props.osm_key, props.osm_value);
      const scored = scoreCandidate(label, coords[1], coords[0], broad);
      scored.placeId = `ph-${props.osm_id || key}`;
      candidates.push(scored);
    }
  }

  if (nomRes.status === 'fulfilled' && Array.isArray(nomRes.value)) {
    for (const item of nomRes.value as Array<{
      place_id: number | string;
      display_name: string;
      lat: string;
      lon: string;
      class?: string;
      type?: string;
    }>) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const broad = isBroadBoundary(item.type, item.class, item.type);
      const scored = scoreCandidate(item.display_name, lat, lon, broad);
      scored.placeId = `nom-${item.place_id}`;
      candidates.push(scored);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const sliced: PlaceSuggestion[] = candidates.slice(0, 10).map(({ score: _s, ...rest }) => rest);
  searchCache.set(cacheKey, sliced);
  return sliced;
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
