import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FIXED_ORIGIN } from "../data/defaultDatabase.js";
import {
  searchDestinations,
  calculateRoute,
} from "../services/distanceService.js";
import {
  MapPin,
  Search,
  ArrowUpRight,
  Check,
  LoaderCircle,
} from "lucide-react";
import { number } from "../services/quotation.js";
function markerLabel(text) {
  const el = document.createElement("span");
  el.textContent = text;
  return el;
}
function RouteMap({ point, route, onPick }) {
  const root = useRef(null),
    map = useRef(null),
    layers = useRef(null),
    pickRef = useRef(onPick);
  pickRef.current = onPick;
  useEffect(() => {
    const m = L.map(root.current, { scrollWheelZoom: false }).setView(
      [FIXED_ORIGIN.lat, FIXED_ORIGIN.lng],
      9,
    );
    map.current = m;
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    ).addTo(m);
    layers.current = L.layerGroup().addTo(m);
    m.on("click", (e) =>
      pickRef.current({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: "Pin pilihan pada peta",
        address: `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`,
        source: "Pin manual",
      }),
    );
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(root.current);
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
      layers.current = null;
    };
  }, []);
  useEffect(() => {
    if (!layers.current) return;
    const group = layers.current;
    group.clearLayers();
    const add = (lat, lng, text, color) =>
      L.circleMarker([lat, lng], {
        radius: 9,
        color: "#fff",
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindTooltip(markerLabel(text))
        .addTo(group);
    add(FIXED_ORIGIN.lat, FIXED_ORIGIN.lng, "Gudang Bitung", "#136d75");
    if (point) {
      add(point.lat, point.lng, point.name, "#d08736");
      if (route?.routePoints) {
        const line = L.polyline(route.routePoints, {
          color: "#137a80",
          weight: 4,
        }).addTo(group);
        map.current.fitBounds(line.getBounds(), {
          padding: [35, 35],
          maxZoom: 15,
        });
      } else
        map.current.fitBounds(
          [
            [FIXED_ORIGIN.lat, FIXED_ORIGIN.lng],
            [point.lat, point.lng],
          ],
          { padding: [35, 35], maxZoom: 15 },
        );
    }
  }, [point, route]);
  return (
    <div
      ref={root}
      className="route-map"
      aria-label="Peta lokasi. Klik peta untuk memilih pin tujuan. Koordinat juga dapat dimasukkan melalui pencarian."
    />
  );
}
export function RoutePlanner({ route, onRouteChange }) {
  const [input, setInput] = useState(route?.destination.address || ""),
    [point, setPoint] = useState(route?.destination || null),
    [results, setResults] = useState([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const request = useRef(null);
  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setBusy("");
  };
  useEffect(() => () => request.current?.abort(), []);
  function invalidate() {
    cancel();
    onRouteChange(null);
    setError("");
  }
  function choose(p) {
    invalidate();
    setPoint(p);
    setResults([]);
    setInput(p.address || p.name);
  }
  async function search(e) {
    e?.preventDefault();
    invalidate();
    setPoint(null);
    setResults([]);
    const controller = new AbortController();
    request.current = controller;
    setBusy("search");
    try {
      const r = await searchDestinations(input, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setResults(r);
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message || "Pencarian gagal.");
    } finally {
      if (request.current === controller) setBusy("");
    }
  }
  async function confirm() {
    cancel();
    onRouteChange(null);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    setBusy("route");
    try {
      const result = await calculateRoute(point, { signal: controller.signal });
      if (!controller.signal.aborted) onRouteChange(result);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e.message || "Rute gagal dihitung.");
    } finally {
      if (request.current === controller) setBusy("");
    }
  }
  return (
    <section className="panel route-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LOKASI PENGIRIMAN</span>
          <h2>Pastikan pin tujuan.</h2>
        </div>
        <MapPin size={22} />
      </div>
      <div className="origin-row">
        <span className="origin-dot" />
        <div>
          <strong>Gudang Bitung, Tangerang</strong>
          <small>
            Asal sesuai template · verifikasi titik gudang sebelum operasional
          </small>
        </div>
        <a
          href={FIXED_ORIGIN.maps_url}
          target="_blank"
          rel="noreferrer"
          aria-label="Periksa gudang di Google Maps"
        >
          <ArrowUpRight size={18} />
        </a>
      </div>
      <form onSubmit={search} className="search-row">
        <label className="grow">
          Alamat, koordinat, atau tautan Google Maps
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              invalidate();
              setPoint(null);
              setResults([]);
            }}
            placeholder="Contoh: -6.9667, 110.4167"
          />
        </label>
        <button className="button primary" disabled={!!busy || !input.trim()}>
          <Search size={17} />
          Cari lokasi
        </button>
      </form>
      {error && (
        <div role="alert" className="notice danger">
          {error}
        </div>
      )}
      {results.length > 0 && (
        <div className="location-results" aria-label="Hasil pencarian">
          {results.map((p, i) => (
            <button key={i} onClick={() => choose(p)}>
              <MapPin size={17} />
              <span>
                <strong>{p.name}</strong>
                <small>{p.address}</small>
              </span>
              <span>Pilih</span>
            </button>
          ))}
        </div>
      )}
      <RouteMap point={point} route={route} onPick={choose} />
      <div className="map-caption">
        <span>Klik peta untuk memilih pin, atau cari koordinat di atas.</span>
        <span>OSM · CARTO · OSRM</span>
      </div>
      {point && (
        <div className="pin-confirm">
          <div>
            <strong>{point.name}</strong>
            <small>
              {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
            </small>
          </div>
          <button
            className="button primary"
            disabled={!!busy}
            onClick={confirm}
          >
            {busy === "route" ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Check size={17} />
            )}{" "}
            {route ? "Hitung ulang rute" : "Konfirmasi pin & hitung rute"}
          </button>
        </div>
      )}
      {busy === "search" && <p role="status">Mencari lokasi…</p>}
      {route && (
        <div className="route-result">
          <div>
            <small>JARAK JALAN</small>
            <strong>
              {number(route.distanceKm, 1)} <span>km</span>
            </strong>
          </div>
          <div>
            <small>WAKTU TANPA JEDA</small>
            <strong>
              {Math.floor(route.durationMinutes / 60)} <span>jam</span>{" "}
              {route.durationMinutes % 60} <span>mnt</span>
            </strong>
          </div>
          <div>
            <small>SUMBER</small>
            <p>{route.source}</p>
          </div>
        </div>
      )}
      <p className="helper">
        Rute kendaraan umum belum memeriksa pembatasan truk, jam operasional,
        atau akses terakhir ke proyek. Layanan peta publik dapat tidak tersedia;
        aplikasi tidak menggantinya dengan rute perkiraan.
      </p>
    </section>
  );
}
