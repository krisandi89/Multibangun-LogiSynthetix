import React from 'react';
import { Package, Plus, Trash2, Layers, AlertTriangle, Scale, Ruler, Sparkles } from 'lucide-react';
import { formatNumber } from '../data/pricingRules';

export function CargoBuilder({
  availableMaterials = [],
  selectedItems = [],
  setSelectedItems
}) {
  // Add an item row
  const handleAddItem = (skuToAdd = null) => {
    const defaultMaterial = skuToAdd 
      ? availableMaterials.find(m => m.sku === skuToAdd)
      : availableMaterials[0];

    if (!defaultMaterial) return;

    // Check if SKU already in list, if so increment qty
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

  return (
    <div className="panel">
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
        <button className="btn btn-secondary btn-sm" onClick={() => handleAddItem()}>
          <Plus size={14} color="var(--accent-cyan)" />
          <span>Tambah Material</span>
        </button>
      </div>

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

      {/* Material Table */}
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
          <button className="btn btn-primary btn-sm" onClick={() => handleAddItem()}>
            <Plus size={14} />
            <span>Pilih Material Pertama</span>
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Material & Spesifikasi</th>
                <th>Dimensi Roll (P x Dia)</th>
                <th>Berat Satuan</th>
                <th>Tier Max</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Jumlah Roll</th>
                <th>Subtotal Berat</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item, idx) => {
                const subtotalKg = (parseInt(item.quantity, 10) || 0) * item.weight_kg;
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
                      <span className="badge badge-cyan font-mono">
                        {item.shipping_dimensions?.cylinder_length_m}m × Ø{item.shipping_dimensions?.cylinder_diameter_m}m
                      </span>
                    </td>

                    <td>
                      <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                        {formatNumber(item.weight_kg)} kg
                      </span>
                    </td>

                    <td>
                      <span className="badge badge-amber font-mono">
                        {item.logistics_rules?.max_stack_tier || 3} Tier
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.45rem' }}
                          onClick={() => handleUpdateQuantity(idx, (parseInt(item.quantity, 10) || 1) - 1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          className="form-input font-mono"
                          style={{ width: '55px', textAlign: 'center', padding: '0.35rem 0.25rem' }}
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(idx, e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.45rem' }}
                          onClick={() => handleUpdateQuantity(idx, (parseInt(item.quantity, 10) || 1) + 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td>
                      <strong className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                        {formatNumber(subtotalKg)} kg
                      </strong>
                    </td>

                    <td>
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

      {/* Cargo Live Totals Bar */}
      {selectedItems.length > 0 && (
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
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Layers size={13} color="var(--accent-cyan)" /> TOTAL GULUNGAN
            </div>
            <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {formatNumber(totalRolls)} <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Roll</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Scale size={13} color="var(--accent-emerald)" /> TOTAL BERAT KOTOR
            </div>
            <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-emerald)' }}>
              {formatNumber(totalWeightKg)} <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>KG ({(totalWeightKg / 1000).toFixed(2)} Ton)</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Ruler size={13} color="var(--accent-amber)" /> ROLL TERPANJANG
            </div>
            <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-amber)' }}>
              {maxRollLength} <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Meter</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
