import { FIXED_ORIGIN } from '../data/defaultDatabase';

/**
 * Service to calculate road distance and travel duration
 * Supports Google Maps URL parsing, Shortlink Resolving, API & OSRM Engine
 */

// Popular Indonesian project & industrial presets
const INDONESIAN_LOCATIONS_PRESET = [
  // Mega Projects & Jabodetabek
  { name: "PIK 2 (Pantai Indah Kapuk 2), Tangerang", query: "pik 2", lat: -6.0528, lng: 106.6961, distKm: 38, durationMin: 45 },
  { name: "PIK 1 (Pantai Indah Kapuk), Jakarta Utara", query: "pik 1", lat: -6.1132, lng: 106.7412, distKm: 34, durationMin: 40 },
  { name: "Pantai Indah Kapuk", query: "pantai indah kapuk", lat: -6.0828, lng: 106.7161, distKm: 36, durationMin: 42 },
  { name: "BSD City, Tangerang Selatan", query: "bsd", lat: -6.3015, lng: 106.6525, distKm: 22, durationMin: 30 },
  { name: "Alam Sutera, Tangerang", query: "alam sutera", lat: -6.2225, lng: 106.6536, distKm: 16, durationMin: 25 },
  { name: "Gading Serpong, Tangerang", query: "gading serpong", lat: -6.2415, lng: 106.6285, distKm: 14, durationMin: 20 },
  { name: "Balaraja, Tangerang", query: "balaraja", lat: -6.2056, lng: 106.4568, distKm: 18, durationMin: 25 },
  { name: "Kawasan Industri Modern Cikande, Serang", query: "cikande", lat: -6.2285, lng: 106.3650, distKm: 32, durationMin: 35 },
  { name: "Pelabuhan Tanjung Priok, Jakarta", query: "tanjung priok", lat: -6.1072, lng: 106.8833, distKm: 55, durationMin: 65 },
  { name: "Jakarta Pusat / DKI Jakarta", query: "jakarta", lat: -6.2088, lng: 106.8456, distKm: 42, durationMin: 60 },
  
  // Industrial Corridors West Java
  { name: "Kawasan Industri MM2100, Cibitung", query: "mm2100", lat: -6.3125, lng: 107.0988, distKm: 72, durationMin: 85 },
  { name: "Kawasan Industri Jababeka, Cikarang", query: "jababeka", lat: -6.3088, lng: 107.1556, distKm: 80, durationMin: 95 },
  { name: "Cikarang / Bekasi", query: "cikarang", lat: -6.3262, lng: 107.1517, distKm: 78, durationMin: 95 },
  { name: "Kawasan Industri KIIC, Karawang Barat", query: "kiic", lat: -6.3385, lng: 107.2842, distKm: 95, durationMin: 105 },
  { name: "Kawasan Industri Suryacipta, Karawang", query: "suryacipta", lat: -6.3852, lng: 107.3625, distKm: 105, durationMin: 115 },
  { name: "Karawang", query: "karawang", lat: -6.3054, lng: 107.3039, distKm: 98, durationMin: 110 },
  { name: "Pelabuhan Patimban, Subang", query: "patimban", lat: -6.2415, lng: 107.9042, distKm: 165, durationMin: 150 },
  { name: "Bandung, Jawa Barat", query: "bandung", lat: -6.9175, lng: 107.6191, distKm: 172, durationMin: 160 },
  { name: "Cirebon, Jawa Barat", query: "cirebon", lat: -6.7320, lng: 108.5523, distKm: 254, durationMin: 220 },
  { name: "Bogor, Jawa Barat", query: "bogor", lat: -6.5971, lng: 106.8060, distKm: 65, durationMin: 80 },
  { name: "Sukabumi, Jawa Barat", query: "sukabumi", lat: -6.9277, lng: 106.9300, distKm: 120, durationMin: 180 },

  // Central Java & East Java
  { name: "Kawasan Industri Kendal (KIK)", query: "kendal", lat: -6.9152, lng: 110.2245, distKm: 440, durationMin: 340 },
  { name: "Kawasan Industri Batang (KITB)", query: "batang", lat: -6.9382, lng: 109.8456, distKm: 395, durationMin: 310 },
  { name: "Semarang, Jawa Tengah", query: "semarang", lat: -6.9667, lng: 110.4167, distKm: 472, durationMin: 360 },
  { name: "Solo / Surakarta, Jawa Tengah", query: "solo", lat: -7.5755, lng: 110.8243, distKm: 565, durationMin: 430 },
  { name: "Yogyakarta, D.I.Y", query: "yogyakarta", lat: -7.7956, lng: 110.3695, distKm: 540, durationMin: 440 },
  { name: "Sidoarjo, Jawa Timur", query: "sidoarjo", lat: -7.4478, lng: 112.7183, distKm: 800, durationMin: 570 },
  { name: "Surabaya, Jawa Timur", query: "surabaya", lat: -7.2575, lng: 112.7521, distKm: 808, durationMin: 580 },
  { name: "Gresik, Jawa Timur", query: "gresik", lat: -7.1566, lng: 112.6555, distKm: 795, durationMin: 560 },
  { name: "Malang, Jawa Timur", query: "malang", lat: -7.9666, lng: 112.6326, distKm: 875, durationMin: 640 },
  { name: "Banyuwangi, Jawa Timur", query: "banyuwangi", lat: -8.2192, lng: 114.3692, distKm: 1095, durationMin: 850 },

  // Banten & Sumatra
  { name: "Pelabuhan Merak, Cilegon", query: "merak", lat: -5.9328, lng: 105.9996, distKm: 92, durationMin: 80 },
  { name: "Cilegon, Banten", query: "cilegon", lat: -6.0028, lng: 106.0500, distKm: 78, durationMin: 70 },
  { name: "Serang, Banten", query: "serang", lat: -6.1200, lng: 106.1500, distKm: 58, durationMin: 50 },
  { name: "Bandar Lampung, Lampung", query: "lampung", lat: -5.3971, lng: 105.2668, distKm: 225, durationMin: 280 },
  { name: "Palembang, Sumatera Selatan", query: "palembang", lat: -2.9761, lng: 104.7754, distKm: 580, durationMin: 540 }
];

/**
 * Resolves Google Maps Shortlink (maps.app.goo.gl or goo.gl/maps)
 */
async function resolveGoogleMapsShortlink(shortUrl) {
  try {
    // Try to fetch expanded redirect URL via CORS proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(shortUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const htmlText = await res.text();
      // Look for coordinates or destination in the redirected HTML
      const coordMatch = htmlText.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || htmlText.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || htmlText.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        return {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2])
        };
      }
    }
  } catch (err) {
    console.warn("Shortlink resolution failed, falling back to direct parse:", err);
  }
  return null;
}

/**
 * Parses Google Maps URL or coordinates string or place name
 */
export async function parseDestinationInput(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // 1. Check raw coordinates format: -6.1234, 106.5678
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

  // 2. Check for Google Maps Shortlink (maps.app.goo.gl or goo.gl/maps)
  if (trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps')) {
    const resolved = await resolveGoogleMapsShortlink(trimmed);
    if (resolved) {
      return {
        type: 'coordinates',
        lat: resolved.lat,
        lng: resolved.lng,
        label: `Google Maps Pin (${resolved.lat.toFixed(4)}, ${resolved.lng.toFixed(4)})`
      };
    }
  }

  // 3. Check for Google Maps Full URL with @lat,lng
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

  // 4. Check query parameter q=lat,lng or query=lat,lng
  const queryCoordRegex = /[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const queryCoordMatch = trimmed.match(queryCoordRegex);
  if (queryCoordMatch) {
    return {
      type: 'coordinates',
      lat: parseFloat(queryCoordMatch[1]),
      lng: parseFloat(queryCoordMatch[2]),
      label: `Titik Google Maps (${queryCoordMatch[1]}, ${queryCoordMatch[2]})`
    };
  }

  // 5. Check place name in Google Maps URL: /place/Nama+Tempat/
  const placeNameRegex = /\/place\/([^/@?]+)/;
  const placeNameMatch = trimmed.match(placeNameRegex);
  if (placeNameMatch) {
    const decodedPlace = decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' '));
    return {
      type: 'address',
      query: decodedPlace,
      label: decodedPlace
    };
  }

  // 6. Regular place / address string
  return {
    type: 'address',
    query: trimmed,
    label: trimmed
  };
}

/**
 * Geocode address to Lat/Lng via Nominatim OpenStreetMap & Preset
 */
export async function geocodeAddress(address) {
  try {
    const cleanQuery = address.toLowerCase().trim();
    
    // Check preset first (e.g. "pik 2", "bsd", "cikande", "sidoarjo", "semarang")
    const preset = INDONESIAN_LOCATIONS_PRESET.find(p => 
      cleanQuery === p.query || 
      cleanQuery.includes(p.query) || 
      p.name.toLowerCase().includes(cleanQuery)
    );

    if (preset) {
      return {
        lat: preset.lat,
        lng: preset.lng,
        displayName: preset.name,
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

  // Default fallback to Jakarta
  return {
    lat: -6.2088,
    lng: 106.8456,
    displayName: address + " (Estimasi Area Jabodetabek)"
  };
}

/**
 * Calculate driving distance from Fixed Origin (Bitung) to Destination
 */
export async function calculateRouteDistance(destinationStr, googleMapsApiKey = "") {
  const origin = FIXED_ORIGIN;
  const parsed = await parseDestinationInput(destinationStr);

  if (!parsed) {
    throw new Error("Alamat atau link tujuan belum dimasukkan.");
  }

  let destLat = null;
  let destLng = null;
  let destName = parsed.label;

  if (parsed.type === 'coordinates') {
    destLat = parsed.lat;
    destLng = parsed.lng;
  } else {
    // Check preset
    const cleanQuery = (parsed.query || destinationStr).toLowerCase().trim();
    const preset = INDONESIAN_LOCATIONS_PRESET.find(p => 
      cleanQuery === p.query || 
      cleanQuery.includes(p.query) || 
      p.name.toLowerCase().includes(cleanQuery)
    );

    if (preset && !googleMapsApiKey) {
      destLat = preset.lat;
      destLng = preset.lng;
      destName = preset.name;
    } else {
      const geo = await geocodeAddress(parsed.query || destinationStr);
      destLat = geo.lat;
      destLng = geo.lng;
      if (geo.displayName) destName = geo.displayName.split(',')[0];
    }
  }

  // 1. Google Maps Distance Matrix API
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

  // 2. OSRM Road Network Routing Engine
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

  // 3. Haversine Road Network Fallback
  const rad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = rad(destLat - origin.lat);
  const dLon = rad(destLng - origin.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(origin.lat)) * Math.cos(rad(destLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistance = R * c;
  const roadDistKm = Math.round(directDistance * 1.32 * 10) / 10;
  const avgSpeed = roadDistKm > 100 ? 55 : 35;
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
