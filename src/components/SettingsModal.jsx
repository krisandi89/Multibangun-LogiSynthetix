import React, { useState } from 'react';
import { X, Settings, Key, ExternalLink, Save, CheckCircle2, ShieldAlert, Sparkles, Map } from 'lucide-react';
import { PRICING_PARAMETERS } from '../data/pricingRules';

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) {
  const [formData, setFormData] = useState(() => ({
    geminiApiKey: settings.geminiApiKey || '',
    googleMapsApiKey: settings.googleMapsApiKey || '',
    pricing: { ...PRICING_PARAMETERS, ...(settings.pricing || {}) }
  }));
  const [status, setStatus] = useState(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(formData);
    setStatus("Pengaturan dan API Key berhasil disimpan ke Local Storage.");
    setTimeout(() => {
      setStatus(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={20} color="var(--accent-cyan)" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Pengaturan API & Parameter Logistik
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Konfigurasi Gemini AI, Google Maps API, & Tarif Dasar
              </div>
            </div>
          </div>
          <button className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {status && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: '#a7f3d0'
            }}>
              <CheckCircle2 size={16} />
              <span>{status}</span>
            </div>
          )}

          {/* Section 1: Gemini API Key */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={14} color="var(--accent-cyan)" /> Google Gemini Flash API Key (Google AI Studio)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-cyan)', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
              >
                Dapatkan API Key Gratis <ExternalLink size={11} />
              </a>
            </label>
            <input
              type="password"
              className="form-input font-mono"
              placeholder="AIzaSy..."
              value={formData.geminiApiKey}
              onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Digunakan untuk OCR Vision ekstraksi PDF/gambar dan kalkulasi cerdas harga pasar logistik.
            </span>
          </div>

          {/* Section 2: Google Maps API Key */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Map size={14} color="var(--accent-amber)" /> Google Maps Distance Matrix API Key (Opsional)
              </span>
            </label>
            <input
              type="password"
              className="form-input font-mono"
              placeholder="AIzaSy... (Biarkan kosong untuk menggunakan engine OSRM bawaan)"
              value={formData.googleMapsApiKey}
              onChange={(e) => setFormData({ ...formData, googleMapsApiKey: e.target.value })}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Jika kosong, aplikasi otomatis menggunakan OSRM Road Routing Engine & Nominatim Indonesia secara gratis.
            </span>
          </div>

          {/* Section 3: Pricing overrides */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.825rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Parameter Standar Biaya Logistik Indonesia:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Harga BBM Bio Solar (Rp/Liter)</label>
                <input
                  type="number"
                  className="form-input font-mono"
                  value={formData.pricing.fuel_price_per_liter || 6800}
                  onChange={(e) => setFormData({
                    ...formData,
                    pricing: { ...formData.pricing, fuel_price_per_liter: parseInt(e.target.value, 10) || 6800 }
                  })}
                />
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Default: Rp 6.800 (Bio Solar)</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Tarif Rata-rata Tol (Rp/KM)</label>
                <input
                  type="number"
                  className="form-input font-mono"
                  value={formData.pricing.default_toll_rate_per_km || 1200}
                  onChange={(e) => setFormData({
                    ...formData,
                    pricing: { ...formData.pricing, default_toll_rate_per_km: parseInt(e.target.value, 10) || 1200 }
                  })}
                />
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Default: Rp 1.200/km (Trans-Jawa)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Save size={15} />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
