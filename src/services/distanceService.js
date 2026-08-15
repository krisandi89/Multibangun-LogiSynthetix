import { FIXED_ORIGIN } from '../data/defaultDatabase';

/**
 * Service to calculate road distance and travel duration
 * Supports Google Maps API & built-in OSRM / Geocoding fallback
 */

// Popular Indonesian cities preset with coordinates from Bitung, Tangerang for instant lookup
const INDONESIAN_CITIES_PRESET = [
  { name: "Jakarta", query: "jakarta", lat: -6.2088, lng: 106.8456, distKm: 42, durationMin: 65 },
  { name: "Cikarang / Bekasi", query: "cikarang", lat: -6.3262, lng: 107.1517, distKm: 78, durationMin: 95 },
  { name: "Karawang", query: "karawang", lat: -6.3054, lng: 107.3039, distKm: 98, durationMin: 110 },
  { name: "Bandung", query: "bandung", lat: -6.9175, lng: 107.6191, distKm: 172, durationMin: 160 },
  { name: "Cirebon", query: "cirebon", lat: -6.7320, lng: 108.5523, distKm: 254, durationMin: 220 },
  { name: "Semarang", query: "semarang", lat: -6.9667, lng: 110.4167, distKm: 472, durationMin: 360 },
  { name: "Yogyakarta", query: "yogyakarta", lat: -7.7956, lng: 110.3695, distKm: 540, durationMin: 440 },
  { name: "Solo / Surakarta", query: "solo", lat: -7.5755, lng: 110.8243, distKm: 565, durationMin: 430 },
  { name: "Surabaya", query: "surabaya", lat: -7.2575, lng: 112.7521, distKm: 808, durationMin: 580 },
  { name: "Malang", query: "malang", lat: -7.9666, lng: 112.6326, distKm: 875, durationMin: 640 },
  { name: "Banyuwangi", query: "banyuwangi", lat: -8.2192, lng: 114.3692, distKm: 1095, durationMin: 850 },
  { name: "Pelabuhan Merak, Cilegon", query: "merak", lat: -5.9328, lng: 105.9996, distKm: 92, durationMin: 80 },
  { name: "Bandar Lampung", query: "lampung", lat: -5.3971, lng: 105.2668, distKm: 225, durationMin: 280 },
  { name: "Palembang", query: "palembang", lat: -2.9761, lng: 104.7754, distKm: 580, durationMin: 540 },
  { name: "Serang", query: "serang", lat: -6.1200, lng: 106.1500, distKm: 58, durationMin: 50 },
  { name: "Bogor", query: "bogor", lat: -6.5971, lng: 106.8060, distKm: 65, durationMin: 80 },
  { name: "Sukabumi", query: "sukabumi", lat: -6.9277, lng: 106.9300, distKm: 120, durationMin: 180 }
];

/**
 * Parses Google Maps URL or coordinates string
 */
export function parseDestinationInput(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Check if coordinates format: -6.1234, 106.5678
  const coordRegex = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/;
  const coordMatch = trimmed.match(coordRegex);
  if (coordMatch) {
    return {
      type: 'coordinates',
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2]),
      label: `Koordinat (${coordMatch[1]}, ${coordMatch[2]})`
    };
  }

  // Check for Google Maps URL with @lat,lng or q=lat,lng
  const urlCoordRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const urlCoordMatch = trimmed.match(urlCoordRegex);
  if (urlCoordMatch) {
    return {
      type: 'coordinates',
      lat: parseFloat(urlCoordMatch[1]),
      lng: parseFloat(urlCoordMatch[2]),
      label: `Lokasi Google Maps (${urlCoordMatch[1]}, ${urlCoordMatch[2]})`
    };
  }

  return {
    type: 'address',
    query: trimmed,
    label: trimmed
  };
}

/**
 * Geocode address to Lat/Lng via Nominatim OpenStreetMap
 */
export async function geocodeAddress(address) {
  try {
    // Check preset first
    const lower = address.toLowerCase();
    const preset = INDONESIAN_CITIES_PRESET.find(p => lower.includes(p.query));
    if (preset) {
      return {
        lat: preset.lat,
        lng: preset.lng,
        displayName: preset.name + ", Indonesia",
        preset
      };
    }

    const encoded = encodeURIComponent(address + ", Indonesia");
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
  } catch (err) {
    console.warn("Geocoding fallback triggered:", err);
  }

  // Fallback to random nearby or Jakarta
  return {
    lat: -6.2088,
    lng: 106.8456,
    displayName: address + " (Estimasi Jawa Barat/DKI)"
  };
}

/**
 * Calculate driving distance from Fixed Origin (Bitung) to Destination
 */
export async function calculateRouteDistance(destinationStr, googleMapsApiKey = "") {
  const origin = FIXED_ORIGIN;
  const parsed = parseDestinationInput(destinationStr);

  if (!parsed) {
    throw new Error("Alamat tujuan belum dimasukkan.");
  }

  let destLat = null;
  let destLng = null;
  let destName = parsed.label;

  if (parsed.type === 'coordinates') {
    destLat = parsed.lat;
    destLng = parsed.lng;
  } else {
    // Check if preset matches directly
    const lower = destinationStr.toLowerCase();
    const preset = INDONESIAN_CITIES_PRESET.find(p => lower.includes(p.query));
    if (preset && !googleMapsApiKey) {
      destLat = preset.lat;
      destLng = preset.lng;
      destName = preset.name;
    } else {
      const geo = await geocodeAddress(destinationStr);
      destLat = geo.lat;
      destLng = geo.lng;
      if (geo.displayName) destName = geo.displayName.split(',')[0];
    }
  }

  // 1. If Google Maps API Key provided, attempt Distance Matrix API
  if (googleMapsApiKey && googleMapsApiKey.trim().length > 10) {
    try {
      const origins = `${origin.lat},${origin.lng}`;
      const destinations = `${destLat},${destLng}`;
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&key=${googleMapsApiKey.trim()}`;
      
      const gRes = await fetch(url);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.status === 'OK' && gData.rows?.[0]?.elements?.[0]?.status === 'OK') {
          const el = gData.rows[0].elements[0];
          const distKm = Math.round((el.distance.value / 1000) * 10) / 10;
          const durationMins = Math.round(el.duration.value / 60);
          
          return {
            source: 'Google Maps Distance Matrix API',
            distanceKm: distKm,
            durationMinutes: durationMins,
            durationText: el.duration.text || `${Math.floor(durationMins / 60)} jam ${durationMins % 60} menit`,
            origin: origin,
            destination: {
              name: destName,
              address: destinationStr,
              lat: destLat,
              lng: destLng
            },
            routePoints: [
              [origin.lat, origin.lng],
              [destLat, destLng]
            ]
          };
        }
      }
    } catch (gErr) {
      console.warn("Google Maps API call failed, falling back to OSRM:", gErr);
    }
  }

  // 2. OSRM Road Routing Engine (Realistic actual road network calculation)
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const osrmRes = await fetch(osrmUrl);
    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      if (osrmData.routes && osrmData.routes.length > 0) {
        const route = osrmData.routes[0];
        const distKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMins = Math.round(route.duration / 60);
        const hours = Math.floor(durationMins / 60);
        const mins = durationMins % 60;
        const durationText = hours > 0 ? `${hours} jam ${mins} mnt` : `${mins} mnt`;

        // Format geojson points [lat, lng] for Leaflet
        const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);

        return {
          source: 'OSRM Road Network Routing',
          distanceKm: distKm,
          durationMinutes: durationMins,
          durationText: durationText,
          origin: origin,
          destination: {
            name: destName,
            address: destinationStr,
            lat: destLat,
            lng: destLng
          },
          routePoints: coordinates
        };
      }
    }
  } catch (osrmErr) {
    console.warn("OSRM routing failed, using Haversine calculation:", osrmErr);
  }

  // 3. Fallback: Haversine distance with 1.32x road tortuosity factor in Indonesia
  const rad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = rad(destLat - origin.lat);
  const dLon = rad(destLng - origin.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(origin.lat)) * Math.cos(rad(destLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistance = R * c;
  const roadDistKm = Math.round(directDistance * 1.32 * 10) / 10;
  const avgSpeed = roadDistKm > 100 ? 55 : 35; // km/h
  const durationMins = Math.round((roadDistKm / avgSpeed) * 60);
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;

  return {
    source: 'Road Network Estimation',
    distanceKm: roadDistKm,
    durationMinutes: durationMins,
    durationText: hours > 0 ? `${hours} jam ${mins} mnt` : `${mins} mnt`,
    origin: origin,
    destination: {
      name: destName,
      address: destinationStr,
      lat: destLat,
      lng: destLng
    },
    routePoints: [
      [origin.lat, origin.lng],
      [destLat, destLng]
    ]
  };
}
