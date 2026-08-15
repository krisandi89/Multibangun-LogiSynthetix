import React from 'react';
import { DollarSign, Truck, Sparkles, CheckCircle2, BookmarkCheck, Printer, ArrowRight, ShieldCheck, Fuel, Receipt } from 'lucide-react';
import { formatRupiah, formatNumber } from '../data/pricingRules';

export function CostEstimationCard({
  estimationResult,
  companyName,
  destination,
  routeResult,
  packingResult,
  onSaveEstimation,
  onPrintQuotation,
  onRecalculate,
  isCalculating = false,
  isSaved = false
}) {
  if (!estimationResult || !packingResult) return null;

  const cost = estimationResult.cost_estimation || {};
  const load = estimationResult.load_analysis || {};
  const totalTrucks = load.total_trucks_required || packingResult.totalTrucksCount || 1;
  const fleetType = load.fleet_type || packingResult.targetFleet?.truck_category || 'Truk';

  return (
    <div className="panel" style={{ border: '1px solid rgba(6, 182, 212, 0.4)', background: 'linear-gradient(180deg, rgba(17,24,39,0.95) 0%, rgba(10,14,23,0.98) 100%)' }}>
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <DollarSign size={20} color="var(--accent-emerald)" />
            <span>6. Hasil Estimasi Logistik & Rincian Biaya (Gemini AI Pricing)</span>
          </div>
          <div className="panel-subtitle">
            Kalkulasi berbasis jarak riil Google Maps, armada {fleetType}, dan standar tarif angkutan Indonesia
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-emerald">
            <CheckCircle2 size={12} /> Siap Diajukan
          </span>
        </div>
      </div>

      {/* Hero Cost Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            TOTAL ESTIMASI BIAYA PENGIRIMAN
          </div>
          <div className="font-mono" style={{ fontSize: '2.1rem', fontWeight: '800', color: '#ffffff', textShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}>
            {formatRupiah(cost.total_estimated_cost)}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            Kebutuhan Armada: <strong style={{ color: 'var(--accent-amber)' }}>{totalTrucks} Unit {fleetType}</strong> • Jarak: <strong style={{ color: 'var(--text-primary)' }}>{routeResult?.distanceKm} km</strong>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          <div className="badge badge-amber font-mono" style={{ fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}>
            {formatRupiah(cost.cost_per_roll || Math.round(cost.total_estimated_cost / (packingResult.summary.totalRolls || 1)))} / Roll
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Estimasi dari total {packingResult.summary.totalRolls} Roll ({formatNumber(packingResult.summary.totalWeightKg)} kg)
          </span>
        </div>
      </div>

      {/* Transparent Itemized Cost Breakdown Grid */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
          Rincian Transparan Komponen Biaya (IDR):
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {/* Sewa Unit */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Truck size={13} color="var(--accent-cyan)" /> SEWA UNIT & JARAK TEMPUH
            </div>
            <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatRupiah(cost.truck_rental_base)}
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>
              {totalTrucks}x unit ({fleetType})
            </div>
          </div>

          {/* Estimasi BBM */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Fuel size={13} color="var(--accent-amber)" /> ESTIMASI BBM SOLAR
            </div>
            <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatRupiah(cost.estimated_fuel_cost)}
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>
              Solar Industri / Dexlite
            </div>
          </div>

          {/* Estimasi Tol */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Receipt size={13} color="var(--accent-emerald)" /> ESTIMASI TARIF TOL
            </div>
            <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatRupiah(cost.estimated_toll_cost)}
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>
              Tol Trans-Jawa / Jabodetabek
            </div>
          </div>

          {/* Bongkar Muat & Driver */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <DollarSign size={13} color="var(--accent-cyan)" /> BONGKAR MUAT & DRIVER
            </div>
            <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatRupiah((cost.handling_labor_cost || 0) + (cost.driver_allowance || 0))}
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>
              Handling {packingResult.summary.totalRolls} roll + Uang Jalan
            </div>
          </div>
        </div>
      </div>

      {/* AI Pricing Explanation & Insights */}
      {cost.pricing_basis_explanation && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.04)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '0.25rem' }}>
            <Sparkles size={14} /> Dasar Analisis Harga AI Gemini:
          </div>
          <div>{cost.pricing_basis_explanation}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRecalculate}
          disabled={isCalculating}
        >
          <Sparkles size={16} color="var(--accent-cyan)" />
          <span>{isCalculating ? 'Menghitung Ulang...' : 'Hitung Ulang AI'}</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onPrintQuotation}
        >
          <Printer size={16} color="var(--accent-amber)" />
          <span>Cetak / PDF Quotation Slip</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onSaveEstimation}
          disabled={isSaved}
        >
          <BookmarkCheck size={16} />
          <span>{isSaved ? 'Tersimpan di Database' : 'Simpan Estimasi Proyek'}</span>
        </button>
      </div>
    </div>
  );
}
