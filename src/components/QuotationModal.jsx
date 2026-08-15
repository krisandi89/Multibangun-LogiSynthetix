import React from 'react';
import { X, Printer, Download, CheckCircle2, Building2, MapPin, Calendar, FileText, Layers, Truck } from 'lucide-react';
import { FIXED_ORIGIN } from '../data/defaultDatabase';
import { formatRupiah, formatNumber } from '../data/pricingRules';

export function QuotationModal({
  isOpen,
  onClose,
  companyName,
  projectName,
  destination,
  routeResult,
  selectedItems = [],
  packingResult,
  estimationResult,
  quotationId = null
}) {
  if (!isOpen) return null;

  const qId = quotationId || `QUO-MB-${Date.now().toString(36).toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const cost = estimationResult?.cost_estimation || {};
  const load = estimationResult?.load_analysis || {};
  const targetFleet = packingResult?.targetFleet || {};
  const totalTrucks = load.total_trucks_required || packingResult?.totalTrucksCount || 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '850px' }}>
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>
              Preview Official Quotation Slip
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={14} />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button className="btn btn-icon btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-body printable-area" style={{ background: '#ffffff', color: '#0f172a', padding: '2rem' }}>
          {/* Header PT Multibangun */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284c7', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0284c7', letterSpacing: '-0.02em' }}>
                PT MULTIBANGUN REKATAMA PATRIA
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', maxWidth: '420px', lineHeight: '1.3' }}>
                {FIXED_ORIGIN.address}<br/>
                Telp: (021) 596-xxxx | Email: logistics@multibangun.com | www.multibangun.com
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                LOGISTICS QUOTATION
              </div>
              <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#0284c7' }}>
                No: {qId}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Tanggal: {currentDate}
              </div>
            </div>
          </div>

          {/* Client & Destination Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Kepada Yth. (Klien):</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                {companyName || 'PT Pengguna Jasa'}
              </div>
              {projectName && (
                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                  Ref Proyek: {projectName}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Rute & Tujuan Pengiriman:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                {destination}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '600', marginTop: '2px' }}>
                Jarak Google Maps: {routeResult?.distanceKm} km (Est. {routeResult?.durationText})
              </div>
            </div>
          </div>

          {/* Material Items Table */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Rincian Material Geosintetik yang Dikirim:
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#334155' }}>
                  <th style={{ padding: '6px 8px' }}>No</th>
                  <th style={{ padding: '6px 8px' }}>SKU & Deskripsi</th>
                  <th style={{ padding: '6px 8px' }}>Dimensi Roll</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty (Roll)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Berat Satuan</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total Berat</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item, idx) => {
                  const qty = parseInt(item.quantity, 10) || 0;
                  const totalKg = qty * item.weight_kg;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <strong>{item.sku}</strong> — {item.category} ({item.specification})
                      </td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                        {item.shipping_dimensions?.cylinder_length_m}m × Ø{item.shipping_dimensions?.cylinder_diameter_m}m
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                        {qty}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatNumber(item.weight_kg)} kg
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {formatNumber(totalKg)} kg
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan="3" style={{ padding: '8px', textAlign: 'right' }}>TOTAL MUATAN:</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{packingResult?.summary?.totalRolls} Roll</td>
                  <td></td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: '#0284c7' }}>
                    {formatNumber(packingResult?.summary?.totalWeightKg)} kg
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Allocation & Price Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {/* Left: Truck info */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Alokasi Armada & Kapasitas
              </div>
              <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                Tipe Armada: <strong>{targetFleet.truck_category || 'Truk'}</strong><br/>
                Kebutuhan Unit: <strong>{totalTrucks} Unit Truk</strong><br/>
                Kapasitas per Truk: {formatNumber(targetFleet.max_tonnage_kg)} kg<br/>
                Panjang Bak Truk: {targetFleet.cargo_dimensions?.max_length_m} Meter
              </div>
            </div>

            {/* Right: Cost breakdown */}
            <div style={{ border: '1px solid #0284c7', borderRadius: '6px', padding: '0.85rem', background: '#f0f9ff' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Ringkasan Biaya Pengiriman
              </div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Sewa Armada ({totalTrucks}x unit):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{formatRupiah(cost.truck_rental_base)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Est. Bahan Bakar (BBM):</span>
                <span style={{ fontFamily: 'monospace' }}>{formatRupiah(cost.estimated_fuel_cost)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Est. Tarif Tol:</span>
                <span style={{ fontFamily: 'monospace' }}>{formatRupiah(cost.estimated_toll_cost)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Bongkar Muat & Driver:</span>
                <span style={{ fontFamily: 'monospace' }}>{formatRupiah((cost.handling_labor_cost || 0) + (cost.driver_allowance || 0))}</span>
              </div>
              <div style={{ borderTop: '2px solid #0284c7', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.85rem', color: '#0284c7' }}>TOTAL ESTIMASI:</strong>
                <strong style={{ fontSize: '1.1rem', color: '#0284c7', fontFamily: 'monospace' }}>
                  {formatRupiah(cost.total_estimated_cost)}
                </strong>
              </div>
            </div>
          </div>

          {/* Terms & Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.85rem' }}>
            <div style={{ fontSize: '0.675rem', color: '#64748b', lineHeight: '1.4' }}>
              <strong>Ketentuan Logistik Geosintetik:</strong><br/>
              1. Pengiriman resmi diberangkatkan dari Hub Bitung Tangerang.<br/>
              2. Estimasi biaya berlaku 14 hari kalender sejak tanggal diterbitkan.<br/>
              3. Seluruh armada dilengkapi lashing belt ratchet 5T dan terpal kedap cuaca.<br/>
              4. Waktu tunggu pembongkaran maksimal 4 jam di lokasi proyek.
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#334155' }}>
                PT Multibangun Rekatama Patria
              </div>
              <div style={{ height: '45px' }}></div>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', borderTop: '1px solid #94a3b8', paddingTop: '2px', color: '#0f172a' }}>
                Divisi Logistik & Supply Chain
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn btn-secondary" onClick={onClose}>
            Tutup
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>
    </div>
  );
}
