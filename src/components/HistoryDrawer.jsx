import React, { useState } from 'react';
import { X, History, Search, Trash2, Download, FolderOpen, MapPin, Copy, Check } from 'lucide-react';
import { formatRupiah, formatNumber, calculateRollVolumeM3 } from '../data/pricingRules';

export function HistoryDrawer({
  isOpen,
  onClose,
  quotations = [],
  onLoadQuotation,
  onDeleteQuotation
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const filtered = quotations.filter(q => {
    const term = searchTerm.toLowerCase();
    return (
      (q.companyName && q.companyName.toLowerCase().includes(term)) ||
      (q.destination && q.destination.toLowerCase().includes(term)) ||
      (q.id && q.id.toLowerCase().includes(term))
    );
  });

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(quotations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multibangun_estimasi_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyHistoryWa = (item) => {
    const dest = item.destination || '-';
    const dist = item.routeResult?.distanceKm ? `${item.routeResult.distanceKm} km` : '-';
    const totalRolls = item.selectedItems?.reduce((s, i) => s + (parseInt(i.quantity, 10) || 0), 0) || 0;
    const totalKg = item.selectedItems?.reduce((s, i) => s + ((parseInt(i.quantity, 10) || 0) * i.weight_kg), 0) || 0;
    const totalVol = item.selectedItems?.reduce((s, i) => {
      const q = parseInt(i.quantity, 10) || 0;
      return s + (q * calculateRollVolumeM3(i.shipping_dimensions?.cylinder_length_m, i.shipping_dimensions?.cylinder_diameter_m));
    }, 0) || 0;
    const fleetName = item.packingResult?.targetFleet?.truck_category || 'Truk';
    const cost = item.estimationResult?.cost_estimation?.total_estimated_cost || 0;

    let text = `*📦 INFO LOGISTIK PROYEK: ${item.companyName || 'Klien'}*\n`;
    text += `Ref ID: ${item.id}\n`;
    text += `Tujuan: ${dest} (${dist})\n`;
    text += `Total: ${totalRolls} Roll | ${formatNumber(totalKg)} kg (${(totalKg / 1000).toFixed(2)} Ton) | ${totalVol.toFixed(2)} m³\n`;
    text += `Armada: ${item.packingResult?.totalTrucksCount || 1} Unit ${fleetName}\n`;
    text += `Est. Ongkir: ${formatRupiah(cost)}\n`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '850px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={20} color="var(--accent-amber)" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Database Riwayat Estimasi Logistik
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Daftar kalkulasi logistik yang telah disimpan ({quotations.length} data)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {quotations.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleExportJson} title="Ekspor Seluruh Riwayat ke File JSON">
                <Download size={14} />
                <span>Export JSON</span>
              </button>
            )}
            <button className="btn btn-icon btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Cari nama PT, kota tujuan, atau No. ID Estimasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <History size={36} color="var(--text-muted)" />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {searchTerm ? 'Tidak ada estimasi yang cocok dengan pencarian.' : 'Belum ada estimasi proyek yang tersimpan.'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tekan tombol "Simpan Estimasi Proyek" di panel hasil untuk menyimpan kalkulasi baru.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map((item) => {
                const dateFormatted = item.createdAt 
                  ? new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '-';
                const totalCost = item.estimationResult?.cost_estimation?.total_estimated_cost || 0;
                const trucksCount = item.packingResult?.totalTrucksCount || 1;
                const fleetCategory = item.packingResult?.targetFleet?.truck_category || 'Truk';
                const isItemCopied = copiedId === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                          {item.id}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>• {dateFormatted}</span>
                      </div>

                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {item.companyName || 'Tanpa Nama PT'}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={12} color="var(--accent-amber)" />
                        <span>{item.destination} ({item.routeResult?.distanceKm} km)</span>
                      </div>
                    </div>

                    {/* Fleet & Cost */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent-emerald)' }}>
                        {formatRupiah(totalCost)}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                        {trucksCount}x {fleetCategory} • {item.selectedItems?.reduce((s, i) => s + (parseInt(i.quantity, 10) || 0), 0)} Roll
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          onLoadQuotation(item);
                          onClose();
                        }}
                        title="Buka kembali ke formulir utama"
                      >
                        <FolderOpen size={13} />
                        <span>Buka</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleCopyHistoryWa(item)}
                        title="Salin ringkasan ke WA"
                      >
                        {isItemCopied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                      </button>

                      <button
                        type="button"
                        className="btn btn-icon btn-sm"
                        style={{ color: 'var(--accent-rose)', border: 'none', background: 'transparent' }}
                        onClick={() => onDeleteQuotation(item.id)}
                        title="Hapus Data"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
