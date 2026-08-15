import React from 'react';
import { Truck, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { formatNumber } from '../data/pricingRules';

export function TruckSelector({
  availableFleets = [],
  selectedFleetId = 'AUTO',
  setSelectedFleetId,
  maxRollLength = 0
}) {
  const selectedFleet = availableFleets.find(f => f.fleet_id === selectedFleetId);
  const isAuto = selectedFleetId === 'AUTO';

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <Truck size={18} color="var(--accent-amber)" />
            <span>4. Pemilihan Armada Angkutan (Truck Fleet)</span>
          </div>
          <div className="panel-subtitle">
            Pilih tipe armada khusus atau biarkan AI memilihkan unit paling efisien
          </div>
        </div>
        <span className="badge badge-amber">
          {availableFleets.length} Tipe Armada
        </span>
      </div>

      {/* Fleet Selection Dropdown */}
      <div className="form-group">
        <label className="form-label">
          <span>Tipe Armada yang Diinginkan</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CDE, CDD, Fuso, Tronton, Container</span>
        </label>

        <select
          className="form-select font-mono"
          value={selectedFleetId}
          onChange={(e) => setSelectedFleetId(e.target.value)}
        >
          <option value="AUTO">✨ [AUTO-REKOMENDASI] Biarkan Sistem Memilih Armada Paling Efisien</option>
          {availableFleets.map((fleet) => {
            const isFit = fleet.cargo_dimensions.max_length_m >= maxRollLength;
            return (
              <option key={fleet.fleet_id} value={fleet.fleet_id}>
                {fleet.truck_category} ({fleet.fleet_id}) — Max {formatNumber(fleet.max_tonnage_kg / 1000)} Ton | Bak {fleet.cargo_dimensions.max_length_m}m x {fleet.cargo_dimensions.max_width_m}m {!isFit ? '⚠️ (Roll Tidak Muat)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Fleet Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {availableFleets.map((fleet) => {
          const isSelected = selectedFleetId === fleet.fleet_id;
          const isLengthCompatible = fleet.cargo_dimensions.max_length_m >= maxRollLength;

          return (
            <div
              key={fleet.fleet_id}
              onClick={() => setSelectedFleetId(fleet.fleet_id)}
              style={{
                background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-surface-elevated)',
                border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                  {fleet.truck_category}
                </div>
                {isSelected && <CheckCircle2 size={15} color="var(--accent-cyan)" />}
              </div>

              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div>
                  Kapasitas: <strong className="font-mono" style={{ color: 'var(--accent-emerald)' }}>{formatNumber(fleet.max_tonnage_kg)} kg</strong> ({(fleet.max_tonnage_kg / 1000).toFixed(1)} T)
                </div>
                <div>
                  Dimensi Bak: <span className="font-mono">{fleet.cargo_dimensions.max_length_m}m × {fleet.cargo_dimensions.max_width_m}m × {fleet.cargo_dimensions.max_height_m}m</span>
                </div>
              </div>

              {!isLengthCompatible && maxRollLength > 0 && (
                <div style={{
                  marginTop: '0.45rem',
                  fontSize: '0.675rem',
                  color: 'var(--accent-rose)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'rgba(244, 63, 94, 0.1)',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px'
                }}>
                  <AlertTriangle size={11} /> Roll {maxRollLength}m tidak muat
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto mode indicator or Selected details */}
      {isAuto ? (
        <div style={{
          background: 'rgba(6, 182, 212, 0.05)',
          border: '1px dashed rgba(6, 182, 212, 0.3)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <Sparkles size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            <strong>Mode Auto-Optimalisasi Aktif:</strong> Algoritma bin-packing akan otomatis memilih armada paling ekonomis yang sanggup menampung berat kotor dan panjang gulungan terpanjang.
          </span>
        </div>
      ) : selectedFleet && (
        <div style={{
          background: 'var(--bg-surface-elevated)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} color="var(--accent-emerald)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
              Armada Dipilih: <strong>{selectedFleet.truck_category}</strong> (Kapasitas: {formatNumber(selectedFleet.max_tonnage_kg)} kg)
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            onClick={() => setSelectedFleetId('AUTO')}
          >
            Kembali ke Auto
          </button>
        </div>
      )}
    </div>
  );
}
