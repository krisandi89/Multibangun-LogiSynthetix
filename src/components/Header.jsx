import React from 'react';
import { Layers, Database, History, Settings, ExternalLink, MapPin } from 'lucide-react';
import { FIXED_ORIGIN } from '../data/defaultDatabase';

export function Header({ onOpenDatabase, onOpenHistory, onOpenSettings, savedCount = 0 }) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <Layers size={24} color="#ffffff" />
        </div>
        <div>
          <div className="brand-title">
            Multibangun LogiSynthetix
            <span className="brand-badge">Geosynthetics AI</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
            <MapPin size={12} color="var(--accent-amber)" />
            <span>Fixed Hub: <strong>Bitung, Tangerang</strong></span>
            <a 
              href={FIXED_ORIGIN.maps_url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-cyan)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}
            >
              Maps <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button className="btn btn-secondary btn-sm" onClick={onOpenDatabase} title="Kelola Database Material & Truk">
          <Database size={15} color="var(--accent-cyan)" />
          <span>Database Studio</span>
        </button>

        <button className="btn btn-secondary btn-sm" onClick={onOpenHistory} title="Lihat Riwayat Estimasi">
          <History size={15} color="var(--accent-amber)" />
          <span>Riwayat ({savedCount})</span>
        </button>

        <button className="btn btn-icon" onClick={onOpenSettings} title="Pengaturan API & Tarif">
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
}
