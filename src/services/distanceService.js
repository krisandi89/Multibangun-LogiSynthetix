import { FIXED_ORIGIN } from "../data/defaultDatabase.js";
export function validateCoordinates(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
const pair = (s) => {
  const m = String(s)
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]),
    lng = Number(m[2]);
  if (!validateCoordinates(lat, lng))
    throw Error("Koordinat di luar rentang lintang/bujur.");
  return { lat, lng };
};
export function parseDestinationInput(input) {
  const text = String(input || "").trim();
  if (!text) throw Error("Masukkan alamat atau koordinat tujuan.");
  const coords = pair(text);
  if (coords) return { ...coords, name: text, type: "coordinates" };
  if (/^https?:\/\//i.test(text)) {
    let url;
    try {
      url = new URL(text);
    } catch {
      throw Error("Tautan tidak valid.");
    }
    if (["maps.app.goo.gl", "goo.gl"].includes(url.hostname))
      throw Error(
        "Buka tautan pendek di Google Maps, lalu salin koordinat pin atau alamat lengkapnya.",
      );
    if (!/^(www\.|maps\.)?google\.(com|co\.id)$/.test(url.hostname))
      throw Error("Gunakan tautan Google Maps atau koordinat pin.");
    const decoded = decodeURIComponent(text);
    const point = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (point) {
      const p = pair(`${point[1]},${point[2]}`);
      return { ...p, type: "coordinates", name: "Pin Google Maps" };
    }
    for (const k of ["destination", "query", "q"]) {
      const q = url.searchParams.get(k);
      if (q) {
        const p = pair(q);
        return p
          ? { ...p, type: "coordinates", name: "Pin Google Maps" }
          : { type: "address", query: q };
      }
    }
    const place = url.pathname.match(/\/place\/([^/]+)/);
    if (place)
      return {
        type: "address",
        query: decodeURIComponent(place[1]).replace(/\+/g, " "),
      };
    throw Error(
      "Tautan hanya berisi pusat tampilan peta. Salin koordinat pin tujuan, bukan posisi kamera.",
    );
  }
  return { type: "address", query: text };
}
async function jsonFetch(url, signal) {
  const timeout = AbortSignal.timeout(15000);
  const combined = signal ? AbortSignal.any([timeout, signal]) : timeout;
  const response = await fetch(url, {
    signal: combined,
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw Error(
      `Layanan peta tidak tersedia (${response.status}). Coba lagi atau masukkan koordinat.`,
    );
  return response.json();
}
export async function searchDestinations(input, { signal } = {}) {
  const parsed = parseDestinationInput(input);
  if (parsed.type === "coordinates")
    return [{ ...parsed, address: parsed.name, source: "Koordinat pengguna" }];
  const data = await jsonFetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=id&limit=5&q=${encodeURIComponent(parsed.query)}`,
    signal,
  );
  if (!Array.isArray(data) || !data.length)
    throw Error(
      "Lokasi tidak ditemukan. Perjelas alamat atau masukkan koordinat pin.",
    );
  return data
    .map((p) => ({
      lat: Number(p.lat),
      lng: Number(p.lon),
      name: p.name || p.display_name.split(",")[0],
      address: p.display_name,
      source: "OpenStreetMap / Nominatim",
    }))
    .filter((p) => validateCoordinates(p.lat, p.lng));
}
export async function calculateRoute(destination, { signal } = {}) {
  if (!validateCoordinates(destination?.lat, destination?.lng))
    throw Error("Pin tujuan belum valid.");
  const origin = FIXED_ORIGIN;
  const data = await jsonFetch(
    `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`,
    signal,
  );
  const r = data.routes?.[0];
  if (
    data.code !== "Ok" ||
    !r ||
    !Number.isFinite(r.distance) ||
    r.distance < 0 ||
    !Number.isFinite(r.duration) ||
    !Array.isArray(r.geometry?.coordinates) ||
    r.geometry.coordinates.length < 2
  )
    throw Error(
      "Rute jalan tidak ditemukan. Periksa akses darat atau penyeberangan.",
    );
  const routePoints = r.geometry.coordinates.map((c) => [c[1], c[0]]);
  if (routePoints.some((c) => !validateCoordinates(...c)))
    throw Error("Geometri rute tidak valid.");
  return {
    source: "OSRM · rute kendaraan umum",
    distanceKm: Math.round(r.distance / 100) / 10,
    durationMinutes: Math.round(r.duration / 60),
    routePoints,
    origin,
    destination,
    confirmedAt: new Date().toISOString(),
    truckAccessVerified: false,
  };
}
