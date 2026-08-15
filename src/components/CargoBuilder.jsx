import React, { useRef, useState } from 'react';
import { Package, Plus, Trash2, Layers, Scale, Ruler, Sparkles, Box, Copy, Camera, Check, Download } from 'lucide-react';
import { formatNumber, formatRupiah, calculateRollVolumeM3 } from '../data/pricingRules';
import { FIXED_ORIGIN } from '../data/defaultDatabase';
import html2canvas from 'html2canvas';

export function CargoBuilder({
  availableMaterials = [],
  selectedItems = [],
  setSelectedItems,
  destination = '',
  routeResult = null,
  packingResult = null,
  estimationResult = null
}) {
  const screenshotTargetRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Add an item row
  const handleAddItem = (skuToAdd = null) => {
    const defaultMaterial = skuToAdd 
      ? availableMaterials.find(m => m.sku === skuToAdd)
      : availableMaterials[0];

    if (!defaultMaterial) return;

    const existingIndex = selectedItems.findIndex(i => i.sku === defaultMaterial.sku);
    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity = (parseInt(updated[existingIndex].quantity, 10) || 0) + 5;
      setSelectedItems(updated);
      return;
    }

    setSelectedItems([
      ...selectedItems,
      {
        sku: defaultMaterial.sku,
        category: defaultMaterial.category,
        specification: defaultMaterial.specification,
        shipping_dimensions: { ...defaultMaterial.shipping_dimensions },
        weight_kg: defaultMaterial.weight_kg,
        logistics_rules: { ...defaultMaterial.logistics_rules },
        quantity: 5
      }
    ]);
  };

  // Change SKU on a row
  const handleChangeSku = (index, newSku) => {
    const material = availableMaterials.find(m => m.sku === newSku);
    if (!material) return;

    const updated = [...selectedItems];
    updated[index] = {
      ...updated[index],
      sku: material.sku,
      category: material.category,
      specification: material.specification,
      shipping_dimensions: { ...material.shipping_dimensions },
      weight_kg: material.weight_kg,
      logistics_rules: { ...material.logistics_rules }
    };
    setSelectedItems(updated);
  };

  // Update quantity on a row
  const handleUpdateQuantity = (index, qty) => {
    const val = Math.max(1, parseInt(qty, 10) || 1);
    const updated = [...selectedItems];
    updated[index].quantity = val;
    setSelectedItems(updated);
  };

  // Remove row
  const handleRemoveRow = (index) => {
    const updated = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(updated);
  };

  // Aggregate metrics
  const totalRolls = selectedItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
  const totalWeightKg = selectedItems.reduce((sum, item) => sum + ((parseInt(item.quantity, 10) || 0) * item.weight_kg), 0);
  const maxRollLength = selectedItems.length > 0 
    ? Math.max(...selectedItems.map(i => i.shipping_dimensions?.cylinder_length_m || 0)) 
    : 0;

  // Calculate Total Volume in m3
  const totalVolumeM3 = selectedItems.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const volSingle = calculateRollVolumeM3(
      item.shipping_dimensions?.cylinder_length_m || 4.0,
      item.shipping_dimensions?.cylinder_diameter_m || 0.5
    );
    return sum + (qty * volSingle);
  }, 0);

  // Generate Exact WhatsApp Text matching user specification
  const handleCopyWhatsAppText = () => {
    const destLabel = destination || routeResult?.destination?.address || 'Semarang, Jawa Tengah';
    const distKm = routeResult?.distanceKm || 0;
    const durationText = routeResult?.durationText || '-';
    const targetFleetName = packingResult?.targetFleet?.truck_category || 'Fuso Standar';
    const totalTrucks = packingResult?.totalTrucksCount || 1;
    const totalCost = estimationResult?.cost_estimation?.total_estimated_cost || 0;

    let text = `📍 *Asal:* Gudang Bitung, Tangerang\n`;
    text += `🎯 *Tujuan:* ${destLabel}\n`;
    text += `🛣️ *Jarak:* ${distKm} km (Est. ${durationText})\n`;
    text += `🚛 *Kebutuhan Armada:* ${totalTrucks} Unit ${targetFleetName}\n`;
    text += `📦 *Muatan:* ${totalRolls} Roll (${formatNumber(totalWeightKg)} kg)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *RINCIAN BIAYA PENGIRIMAN:*\n`;
    text += `*TOTAL ESTIMASI ONGKIR:* *${formatRupiah(totalCost)}*\n`;

    navigator.clipboard.writeText(text);
    setCopyStatus("Format penawaran WhatsApp berhasil disalin!");
    setTimeout(() => setCopyStatus(null), 3000);
  };

  // Capture Clean Screenshot of table & metrics
  const handleCaptureScreenshot = async () => {
    if (!screenshotTargetRef.current || selectedItems.length === 0) return;
    setIsCapturing(true);

    try {
      const canvas = await html2canvas(screenshotTargetRef.current, {
        scale: 2,
        backgroundColor: '#0d131f',
        useCORS: true,
        logging: false
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `tangkapan_layar_muatan_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();

      setCopyStatus("Tangkapan layar tabel muatan berhasil diunduh sebagai gambar PNG!");
      setTimeout(() => setCopyStatus(null), 3500);
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      alert("Gagal mengambil screenshot: " + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="panel">
      {/* Header bar */}
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <Package size={18} color="var(--accent-cyan)" />
            <span>3. Konfigurasi Muatan Material (Cargo Builder)</span>
          </div>
          <div className="panel-subtitle">
            Pilih jenis material geosintetik, kombinasi panjang roll, dan jumlah pesanan
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
            onClick={handleCopyWhatsAppText}
            title="Salin teks penawaran WA sesuai format"
          >
            <Copy size={13} />
            <span>Salin Format WA</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.3)' }}
            onClick={handleCaptureScreenshot}
            disabled={isCapturing}
            title="Ambil tangkapan layar bersih area tabel material ini"
          >
            <Camera size={13} />
            <span>{isCapturing ? 'Menyimpan...' : 'Screenshot'}</span>
          </button>

          <button className="btn btn-primary btn-sm" onClick={() => handleAddItem()}>
            <Plus size={14} />
            <span>Tambah Material</span>
          </button>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copyStatus && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: '#a7f3d0'
        }}>
          <Check size={16} color="var(--accent-emerald)" />
          <span>{copyStatus}</span>
        </div>
      )}

      {/* Quick Add Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Tambah Cepat:</span>
        {availableMaterials.map((mat) => (
          <button
            key={mat.sku}
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.725rem', padding: '0.2rem 0.6rem' }}
            onClick={() => handleAddItem(mat.sku)}
          >
            + {mat.sku} ({mat.shipping_dimensions.cylinder_length_m}m)
          </button>
        ))}
      </div>

      {/* SCREENSHOT TARGET CONTAINER (Clean Table & Metrics) */}
      <div 
        ref={screenshotTargetRef}
        style={{
          background: '#0d131f',
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {selectedItems.length === 0 ? (
          <div style={{
            padding: '2.5rem',
            textAlign: 'center',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Layers size={36} color="var(--text-muted)" />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Belum ada material dalam daftar muatan.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Material & Spesifikasi</th>
                  <th>Dimensi Roll (P x Dia)</th>
                  <th>Berat Satuan</th>
                  <th>Volume / Roll</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Jumlah Roll</th>
                  <th>Subtotal Berat</th>
                  <th style={{ width: '40px' }} data-html2canvas-ignore="true"></th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item, idx) => {
                  const qty = parseInt(item.quantity, 10) || 0;
                  const subtotalKg = qty * item.weight_kg;
                  const singleVol = calculateRollVolumeM3(
                    item.shipping_dimensions?.cylinder_length_m,
                    item.shipping_dimensions?.cylinder_diameter_m
                  );

                  return (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-select font-mono"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                          value={item.sku}
                          onChange={(e) => handleChangeSku(idx, e.target.value)}
                        >
                          {availableMaterials.map((mat) => (
                            <option key={mat.sku} value={mat.sku}>
                              {mat.sku} - {mat.category} ({mat.specification})
                            </option>
                          ))}
                        </select>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.category} • {item.specification}
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-cyan font-mono" style={{ padding: '0.3rem 0.6rem' }}>
                          {item.shipping_dimensions?.cylinder_length_m}m × Ø{item.shipping_dimensions?.cylinder_diameter_m}m
                        </span>
                      </td>

                      <td>
                        <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                          {formatNumber(item.weight_kg)} kg
                        </span>
                      </td>

                      <td>
                        <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {singleVol.toFixed(2)} m³
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            data-html2canvas-ignore="true"
                            style={{ padding: '0.2rem 0.45rem' }}
                            onClick={() => handleUpdateQuantity(idx, (parseInt(item.quantity, 10) || 1) - 1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            className="form-input font-mono"
                            style={{ width: '55px', textAlign: 'center', padding: '0.35rem 0.25rem', fontWeight: 'bold' }}
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(idx, e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            data-html2canvas-ignore="true"
                            style={{ padding: '0.2rem 0.45rem' }}
                            onClick={() => handleUpdateQuantity(idx, (parseInt(item.quantity, 10) || 1) + 1)}
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td>
                        <strong className="font-mono" style={{ color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                          {formatNumber(subtotalKg)} kg
                        </strong>
                      </td>

                      <td data-html2canvas-ignore="true">
                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          style={{ color: 'var(--accent-rose)', border: 'none', background: 'transparent' }}
                          onClick={() => handleRemoveRow(idx)}
                          title="Hapus Baris"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Cargo Live Totals Bar with 4 Metrics (Total Gulungan, Total Berat, Total Volume, Roll Terpanjang) */}
        {selectedItems.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.75rem',
            background: 'var(--bg-surface-elevated)',
            padding: '0.9rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', letterSpacing: '0.04em' }}>
                <Layers size={13} color="var(--accent-cyan)" /> TOTAL GULUNGAN
              </div>
              <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                {formatNumber(totalRolls)} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Roll</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', letterSpacing: '0.04em' }}>
                <Scale size={13} color="var(--accent-emerald)" /> TOTAL BERAT KOTOR
              </div>
              <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-emerald)', marginTop: '2px' }}>
                {formatNumber(totalWeightKg)} <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>KG</span>
              </div>
              <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', opacity: 0.9 }}>
                ({(totalWeightKg / 1000).toFixed(2)} Ton)
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', letterSpacing: '0.04em' }}>
                <Box size={13} color="var(--accent-cyan)" /> TOTAL VOLUME
              </div>
              <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {totalVolumeM3.toFixed(2)} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>m³</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', letterSpacing: '0.04em' }}>
                <Ruler size={13} color="var(--accent-amber)" /> ROLL TERPANJANG
              </div>
              <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-amber)', marginTop: '2px' }}>
                {maxRollLength} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Meter</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
