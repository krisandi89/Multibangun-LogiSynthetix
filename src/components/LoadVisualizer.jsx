import React, { useState } from 'react';
import { Box, Layers, ShieldAlert, Sparkles, Scale, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatNumber } from '../data/pricingRules';

const CATEGORY_COLORS = {
  'Geomembrane': { fill: '#0284c7', border: '#38bdf8', text: '#e0f2fe' },
  'Geotextile Non-Woven': { fill: '#d97706', border: '#fbbf24', text: '#fef3c7' },
  'Geogrid Biaxial': { fill: '#059669', border: '#34d399', text: '#d1fae5' },
  'Geogrid': { fill: '#059669', border: '#34d399', text: '#d1fae5' },
  'default': { fill: '#6366f1', border: '#818cf8', text: '#e0e7ff' }
};

export function LoadVisualizer({ packingResult }) {
  const [activeTruckIndex, setActiveTruckIndex] = useState(0);

  if (!packingResult || !packingResult.success || !packingResult.trucks || packingResult.trucks.length === 0) {
    return null;
  }

  const { targetFleet, totalTrucksCount, trucks, summary } = packingResult;
  const currentTruck = trucks[activeTruckIndex] || trucks[0];

  const getColor = (category) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['default'];
  };

  const truckL = currentTruck.fleet.cargo_dimensions.max_length_m;
  const truckW = currentTruck.fleet.cargo_dimensions.max_width_m;
  const truckH = currentTruck.fleet.cargo_dimensions.max_height_m;

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <Box size={18} color="var(--accent-cyan)" />
            <span>5. Visualisasi Penataan Muatan Bak Truk (3D/2D Bin-Packing)</span>
          </div>
          <div className="panel-subtitle">
            Tata letak silinder roll, distribusi berat per sumbu roda, dan batas tier tumpukan
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-cyan font-mono">
            {totalTrucksCount} Unit {currentTruck.fleet.truck_category}
          </span>
        </div>
      </div>

      {/* Multi-Truck Tab Switcher if > 1 truck */}
      {totalTrucksCount > 1 && (
        <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          {trucks.map((t, idx) => (
            <button
              key={idx}
              type="button"
              className={`btn btn-sm ${activeTruckIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTruckIndex(idx)}
            >
              <span>Truk #{t.truckNumber}</span>
              <span className="font-mono" style={{ fontSize: '0.7rem' }}>
                ({formatNumber(t.currentWeightKg)} kg / {t.weightUtilizationPercent}%)
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Utilization Statistics Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0.75rem',
        background: 'var(--bg-surface-elevated)',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>UTILISASI BERAT (TONNAGE)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3px' }}>
            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, currentTruck.weightUtilizationPercent)}%`,
                height: '100%',
                background: currentTruck.weightUtilizationPercent > 90 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                borderRadius: '4px'
              }} />
            </div>
            <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
              {currentTruck.weightUtilizationPercent}%
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {formatNumber(currentTruck.currentWeightKg)} kg / {formatNumber(currentTruck.maxTonnageKg)} kg
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>JUMLAH ROLL DI TRUK #{currentTruck.truckNumber}</div>
          <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
            {currentTruck.loadedRolls.length} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Roll</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Total Keseluruhan: {summary.totalRolls} Roll
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DIMENSI RUANG BAK TRUK</div>
          <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-amber)', marginTop: '2px' }}>
            {truckL}m (P) × {truckW}m (L) × {truckH}m (T)
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Kategori: {currentTruck.fleet.truck_category}
          </div>
        </div>
      </div>

      {/* Visual Truck Diagrams (Side Elevation & Cross Section) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        {/* Diagram 1: Side Elevation View (Tampak Samping Bak) */}
        <div className="diagram-box">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>TAMPAK SAMPING (PANJANG BAK {truckL}m)</span>
            <span style={{ fontSize: '0.675rem', color: 'var(--accent-cyan)' }}>Depan Truk (Kiri) ➔ Belakang (Kanan)</span>
          </div>

          <svg viewBox="0 0 700 240" style={{ width: '100%', height: 'auto', background: '#0a0f1d', borderRadius: '8px' }}>
            {/* Truck Cab (Kepala Truk) */}
            <path d="M 20 180 L 20 90 Q 20 60 45 60 L 80 60 L 95 100 L 95 180 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <rect x="35" y="70" width="35" height="30" rx="3" fill="#0284c7" opacity="0.6" />
            
            {/* Truck Bed Outline */}
            <rect x="100" y="50" width="560" height="130" fill="rgba(30, 41, 59, 0.4)" stroke="#475569" strokeWidth="2" strokeDasharray="4,4" />
            <line x1="100" y1="180" x2="660" y2="180" stroke="#94a3b8" strokeWidth="4" />

            {/* Wheels */}
            <circle cx="55" cy="195" r="20" fill="#0f172a" stroke="#64748b" strokeWidth="4" />
            <circle cx="55" cy="195" r="8" fill="#334155" />
            
            <circle cx="520" cy="195" r="20" fill="#0f172a" stroke="#64748b" strokeWidth="4" />
            <circle cx="520" cy="195" r="8" fill="#334155" />
            <circle cx="575" cy="195" r="20" fill="#0f172a" stroke="#64748b" strokeWidth="4" />
            <circle cx="575" cy="195" r="8" fill="#334155" />

            {/* Render Bays & Cylinders */}
            {currentTruck.bays.map((bay, bIdx) => {
              const bayX = 105 + (bay.startX / truckL) * 540;
              const bayW = Math.max(40, (bay.rollLength / truckL) * 540);

              return (
                <g key={bIdx}>
                  {/* Bay separator line */}
                  <line x1={bayX} y1="50" x2={bayX} y2="180" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
                  
                  {/* Bay rolls */}
                  {bay.rolls.map((roll, rIdx) => {
                    const colors = getColor(roll.category);
                    const tier = roll.tierIndex || 1;
                    const rollH = 26;
                    const rollY = 176 - (tier * (rollH + 3));

                    return (
                      <g key={rIdx}>
                        <rect
                          x={bayX + 2}
                          y={rollY}
                          width={bayW - 4}
                          height={rollH}
                          rx="4"
                          fill={colors.fill}
                          stroke={colors.border}
                          strokeWidth="1.5"
                          opacity="0.9"
                        />
                        <text
                          x={bayX + bayW / 2}
                          y={rollY + 16}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {roll.sku} ({roll.length}m)
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Safety Straps */}
            <line x1="200" y1="40" x2="200" y2="185" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4,2" />
            <line x1="420" y1="40" x2="420" y2="185" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4,2" />
          </svg>
        </div>

        {/* Diagram 2: Rear Cross-Section (Tampak Belakang / Potongan Melintang) */}
        <div className="diagram-box">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            TAMPAK BELAKANG (LEBAR {truckW}m × TINGGI {truckH}m)
          </div>

          <svg viewBox="0 0 260 240" style={{ width: '100%', height: 'auto', background: '#0a0f1d', borderRadius: '8px' }}>
            {/* Cargo Box Frame */}
            <rect x="25" y="30" width="210" height="150" fill="rgba(30, 41, 59, 0.4)" stroke="#475569" strokeWidth="2" />
            <line x1="15" y1="180" x2="245" y2="180" stroke="#94a3b8" strokeWidth="4" />

            {/* Wheels */}
            <rect x="30" y="180" width="22" height="35" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
            <rect x="208" y="180" width="22" height="35" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="2" />

            {/* Render Circles in cross section */}
            {currentTruck.loadedRolls.slice(0, 18).map((roll, idx) => {
              const colors = getColor(roll.category);
              const tier = roll.tierIndex || (Math.floor(idx / 3) + 1);
              const col = roll.colIndex || ((idx % 3) + 1);
              
              const radius = 22;
              const spacingX = 65;
              const spacingY = 40;
              const cx = 55 + (col - 1) * spacingX;
              const cy = 155 - (tier - 1) * spacingY;

              return (
                <g key={idx}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={colors.fill}
                    stroke={colors.border}
                    strokeWidth="2"
                    opacity="0.9"
                  />
                  <circle cx={cx} cy={cy} r="4" fill="#ffffff" />
                  <text
                    x={cx}
                    y={cy + 3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    T{tier}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend & Securing Protocols */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Legenda:</span>
          {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'default').map(([cat, col]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.725rem' }}>
              <div style={{ width: '12px', height: '12px', background: col.fill, border: `1px solid ${col.border}`, borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '0.725rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <ShieldAlert size={14} />
          <span>Lashing Tali Ratchet 5 Ton & Balok Stopper Kayu Wajib Terpasang</span>
        </div>
      </div>
    </div>
  );
}
