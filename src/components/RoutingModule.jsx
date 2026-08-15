import React, { useEffect, useRef, useState } from 'react';
import { Navigation, MapPin, Compass, Clock, Search, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { FIXED_ORIGIN } from '../data/defaultDatabase';
import { calculateRouteDistance } from '../services/distanceService';
import L from 'leaflet';

// Fix for default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const QUICK_DESTINATIONS = [
  "Bandung, Jawa Barat",
  "Semarang, Jawa Tengah",
  "Surabaya, Jawa Timur",
  "Cirebon, Jawa Barat",
  "Pelabuhan Merak, Banten",
  "Yogyakarta, D.I.Y",
  "Bandar Lampung, Lampung",
  "Palembang, Sumatera Selatan"
];

export function RoutingModule({
  destination,
  setDestination,
  routeResult,
  setRouteResult,
  googleMapsApiKey = ""
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const layerGroup = useRef(null);

  // Trigger distance calculation
  const handleCalculateRoute = async (targetDest) => {
    const destToUse = targetDest || destination;
    if (!destToUse || destToUse.trim().length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await calculateRouteDistance(destToUse, googleMapsApiKey);
      setRouteResult(res);
    } catch (err) {
      console.error("Routing error:", err);
      setError(err.message || "Gagal menghitung rute.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      const map = L.map(mapRef.current, {
        center: [FIXED_ORIGIN.lat, FIXED_ORIGIN.lng],
        zoom: 9,
        zoomControl: false,
        attributionControl: false
      });

      // Dark / Slate styled OpenStreetMap tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      layerGroup.current = L.layerGroup().addTo(map);
      leafletMap.current = map;
    }

    const map = leafletMap.current;
    const layers = layerGroup.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // Origin Marker (Bitung Hub)
    const originIcon = L.divIcon({
      className: 'custom-map-marker origin',
      html: `<div style="background:#0284c7; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 0 10px rgba(2,132,199,0.7); font-size:12px; color:#fff; font-weight:bold;">HUB</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const originMarker = L.marker([FIXED_ORIGIN.lat, FIXED_ORIGIN.lng], { icon: originIcon })
      .bindPopup(`<b>${FIXED_ORIGIN.name}</b><br/>Titik Asal Logistik`)
      .addTo(layers);

    if (routeResult && routeResult.destination) {
      const destLat = routeResult.destination.lat;
      const destLng = routeResult.destination.lng;

      // Destination Marker
      const destIcon = L.divIcon({
        className: 'custom-map-marker dest',
        html: `<div style="background:#f59e0b; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 0 10px rgba(245,158,11,0.7); font-size:12px; color:#111; font-weight:bold;">TUJ</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([destLat, destLng], { icon: destIcon })
        .bindPopup(`<b>Tujuan: ${routeResult.destination.name}</b><br/>Jarak: ${routeResult.distanceKm} km`)
        .addTo(layers);

      // Route Polyline
      if (routeResult.routePoints && routeResult.routePoints.length > 0) {
        const polyline = L.polyline(routeResult.routePoints, {
          color: '#06b6d4',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 6'
        }).addTo(layers);

        map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
      }
    } else {
      map.setView([FIXED_ORIGIN.lat, FIXED_ORIGIN.lng], 9);
    }
  }, [routeResult]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <Navigation size={18} color="var(--accent-amber)" />
            <span>2. Rute & Jarak Pengiriman (Google Maps Engine)</span>
          </div>
          <div className="panel-subtitle">
            Kalkulasi jarak km akurat & durasi tempuh otomatis dari Hub Bitung
          </div>
        </div>
        {routeResult && (
          <span className="badge badge-emerald">
            <CheckCircle size={12} /> {routeResult.distanceKm} km
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Origin (Fixed & Readonly) */}
        <div className="form-group">
          <label className="form-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={14} color="var(--accent-cyan)" /> Titik Asal Logistik (Permanen)
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Fixed Hub</span>
          </label>
          <input
            type="text"
            className="form-input"
            readOnly
            value="Gudang PT Multibangun Rekatama Patria, Bitung, Tangerang"
            title="Titik awal pengiriman permanen sesuai SOP pabrik"
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Jl. Raya Serang Km 13.8, Bitung Jaya, Curug, Kab. Tangerang, Banten
          </span>
        </div>

        {/* Destination Input */}
        <div className="form-group">
          <label className="form-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Compass size={14} color="var(--accent-amber)" /> Alamat / Kota Tujuan Pengiriman <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </span>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="cth: Bandung, Jawa Barat atau Link Google Maps"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCalculateRoute();
              }}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleCalculateRoute()}
              disabled={loading || !destination}
            >
              {loading ? <Loader2 size={16} className="pulsing-glow" style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
              <span>Hitung Jarak</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Destination Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Rute Cepat:</span>
        {QUICK_DESTINATIONS.map((city) => (
          <button
            key={city}
            type="button"
            className="badge badge-amber"
            style={{ cursor: 'pointer', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'transparent' }}
            onClick={() => {
              setDestination(city);
              handleCalculateRoute(city);
            }}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Route Distance & Duration Summary Bar */}
      {routeResult && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          background: 'var(--bg-surface-elevated)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Jarak Tempuh Riil</div>
            <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
              {routeResult.distanceKm.toLocaleString('id-ID')} <span style={{ fontSize: '0.85rem' }}>KM</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimasi Waktu Tempuh</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={15} color="var(--accent-amber)" />
              <span>{routeResult.durationText}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Routing Provider</div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ArrowRight size={13} color="var(--accent-emerald)" />
              <span>{routeResult.source}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={15} color="var(--accent-rose)" />
          <span style={{ fontSize: '0.775rem', color: '#fecdd3' }}>{error}</span>
        </div>
      )}

      {/* Interactive Map */}
      <div ref={mapRef} className="map-container" />
    </div>
  );
}
