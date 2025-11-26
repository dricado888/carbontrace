// Coordinates for major cities (lat, lng)
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // US Cities
  'NYC': { lat: 40.7128, lng: -74.0060 },
  'LAX': { lat: 34.0522, lng: -118.2437 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'Phoenix': { lat: 33.4484, lng: -112.0740 },
  'Philadelphia': { lat: 39.9526, lng: -75.1652 },
  'San Antonio': { lat: 29.4241, lng: -98.4936 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'Dallas': { lat: 32.7767, lng: -96.7970 },
  'San Jose': { lat: 37.3382, lng: -121.8863 },
  'Austin': { lat: 30.2672, lng: -97.7431 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Denver': { lat: 39.7392, lng: -104.9903 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Atlanta': { lat: 33.7490, lng: -84.3880 },
  'Portland': { lat: 45.5152, lng: -122.6784 },
  'Las Vegas': { lat: 36.1699, lng: -115.1398 },
  'Detroit': { lat: 42.3314, lng: -83.0458 },
  'Minneapolis': { lat: 44.9778, lng: -93.2650 },
  
  // International
  'London': { lat: 51.5074, lng: -0.1278 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Shanghai': { lat: 31.2304, lng: 121.4737 },
  'Shenzhen': { lat: 22.5431, lng: 114.0579 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  'Frankfurt': { lat: 50.1109, lng: 8.6821 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'New York': { lat: 40.7128, lng: -74.0060 },
};

// Haversine formula - calculates distance between two points on Earth
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export type DistanceResult =
  | { success: true; distance_km: number; origin_coords: { lat: number; lng: number }; destination_coords: { lat: number; lng: number } }
  | { success: false; error: string };

export function calculateDistance(origin: string, destination: string): DistanceResult {
  const originCoords = CITY_COORDINATES[origin];
  const destCoords = CITY_COORDINATES[destination];

  if (!originCoords) {
    return { success: false, error: `Unknown origin city: ${origin}` };
  }

  if (!destCoords) {
    return { success: false, error: `Unknown destination city: ${destination}` };
  }

  const distance_km = haversineDistance(
    originCoords.lat,
    originCoords.lng,
    destCoords.lat,
    destCoords.lng
  );

  return {
    success: true,
    distance_km: Math.round(distance_km),
    origin_coords: originCoords,
    destination_coords: destCoords,
  };
}

export function getSupportedCities(): string[] {
  return Object.keys(CITY_COORDINATES);
}