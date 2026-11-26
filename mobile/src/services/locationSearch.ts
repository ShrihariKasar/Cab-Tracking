export interface PlaceSuggestion {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FleetPulseCabApp/1.0' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      place_id: number | string;
      display_name: string;
      lat: string;
      lon: string;
    }>;
    return data.map((item) => ({
      placeId: String(item.place_id),
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}
