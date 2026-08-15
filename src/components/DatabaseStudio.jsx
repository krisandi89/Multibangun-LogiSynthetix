import React, { useState, useRef } from 'react';
import { X, Database, Plus, Trash2, Save, Download, Upload, RotateCcw, CheckCircle2, AlertCircle, Package, Truck, Edit3 } from 'lucide-react';
import { formatNumber, formatRupiah } from '../data/pricingRules';

export function DatabaseStudio({
  isOpen,
  onClose,
  database,
  onSaveDatabase,
  onResetDatabase
}) {
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'fleet'
  const [dbData, setDbData] = useState(() => JSON.parse(JSON.stringify(database)));
  const [saveStatus, setSaveStatus] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Material item handlers
  const handleMaterialChange = (index, field, value) => {
    const updated = JSON.parse(JSON.stringify(dbData));
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updated.geosynthetics[index][parent][child] = value;
    } else {
      updated.geosynthetics[index][field] = value;
    }
    setDbData(updated);
  };

  const handleAddMaterial = () => {
    const newSku = `GEO-NEW-${Math.floor(Math.random() * 900 + 100)}`;
    const updated = JSON.parse(JSON.stringify(dbData));
    updated.geosynthetics.push({
      sku: newSku,
      category: "Geomembrane",
      specification: "1.0mm Custom",
      physical_form: "Cylinder",
      shipping_dimensions: {
        cylinder_length_m: 4.0,
        cylinder_diameter_m: 0.50
      },
      weight_kg: 500,
      logistics_rules: {
        stackable: true,
        max_stack_tier: 3
      }
    });
    setDbData(updated);
  };

  const handleDeleteMaterial = (index) => {
    const updated = JSON.parse(JSON.stringify(dbData));
    updated.geosynthetics.splice(index, 1);
    setDbData(updated);
  };

  // Fleet handlers
  const handleFleetChange = (index, field, value) => {
    const updated = JSON.parse(JSON.stringify(dbData));
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updated.logistics_fleet[index][parent][child] = value;
    } else {
      updated.logistics_fleet[index][field] = value;
    }
    setDbData(updated);
  };

  const handleAddFleet = () => {
    const newId = `TRK-CUSTOM-${Math.floor(Math.random() * 90 + 10)}`;
    const updated = JSON.parse(JSON.stringify(dbData));
    updated.logistics_fleet.push({
      fleet_id: newId,
      truck_category: "Custom Heavy Truck",
      cargo_dimensions: {
        max_length_m: 6.0,
        max_width_m: 2.2,
        max_height_m: 2.0
      },
      max_tonnage_kg: 8000,
      rate_per_km: 12000,
      base_rate: 2000000,
      fuel_consumption_km_l: 5.0
    });
    setDbData(updated);
  };

  const handleDeleteFleet = (index) => {
    const updated = JSON.parse(JSON.stringify(dbData));
    updated.logistics_fleet.splice(index, 1);
    setDbData(updated);
  };

  // Save changes
  const handleSave = () => {
    onSaveDatabase(dbData);
    setSaveStatus("Database berhasil diperbarui dan disimpan ke penyimpanan lokal.");
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Download JSON
  const handleDownloadJson = () => {
    const jsonString = JSON.stringify(dbData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Database JSON Lengkap (Material & Truk).json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Upload JSON
  const handleUploadJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.geosynthetics && parsed.logistics_fleet) {
          setDbData(parsed);
          onSaveDatabase(parsed);
          setSaveStatus("File JSON berhasil diimpor dan disinkronkan.");
        } else {
          alert("Format JSON tidak sesuai dengan skema geosynthetics & logistics_fleet.");
        }
      } catch (err) {
        alert("Gagal membaca file JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '1100px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={20} color="var(--accent-cyan)" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Database Studio — Master Material & Truk
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Sinkron dengan <code className="font-mono">Database JSON Lengkap (Material & Truk).json</code>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadJson} title="Download JSON untuk menggantikan file master">
              <Download size={14} />
              <span>Download JSON</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleUploadJson}
              style={{ display: 'none' }}
            />
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} title="Upload file JSON baru">
              <Upload size={14} />
              <span>Import JSON</span>
            </button>

            <button className="btn btn-icon btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', padding: '0 1.5rem' }}>
          <button
            type="button"
            className="btn"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'materials' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'materials' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              background: 'transparent',
              padding: '0.75rem 1.25rem'
            }}
            onClick={() => setActiveTab('materials')}
          >
            <Package size={16} />
            <span>Katalog Geosintetik ({dbData.geosynthetics?.length || 0})</span>
          </button>

          <button
            type="button"
            className="btn"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'fleet' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: activeTab === 'fleet' ? 'var(--accent-amber)' : 'var(--text-secondary)',
              background: 'transparent',
              padding: '0.75rem 1.25rem'
            }}
            onClick={() => setActiveTab('fleet')}
          >
            <Truck size={16} />
            <span>Armada Truk Logistik ({dbData.logistics_fleet?.length || 0})</span>
          </button>
        </div>

        {/* Body content */}
        <div className="modal-body">
          {saveStatus && (
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
              <span>{saveStatus}</span>
            </div>
          )}

          {/* TAB 1: MATERIALS */}
          {activeTab === 'materials' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Kelola spesifikasi, dimensi panjang & diameter silinder roll, serta aturan penumpukan tier:
                </span>
                <button className="btn btn-secondary btn-sm" onClick={handleAddMaterial}>
                  <Plus size={14} color="var(--accent-cyan)" />
                  <span>Tambah Produk Baru</span>
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table font-mono" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Kategori</th>
                      <th>Spesifikasi</th>
                      <th>Panjang (m)</th>
                      <th>Diameter (m)</th>
                      <th>Berat (kg)</th>
                      <th>Max Tier</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbData.geosynthetics.map((mat, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={mat.sku}
                            onChange={(e) => handleMaterialChange(idx, 'sku', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={mat.category}
                            onChange={(e) => handleMaterialChange(idx, 'category', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={mat.specification}
                            onChange={(e) => handleMaterialChange(idx, 'specification', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            className="form-input"
                            style={{ width: '70px', padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={mat.shipping_dimensions?.cylinder_length_m || 0}
                            onChange={(e) => handleMaterialChange(idx, 'shipping_dimensions.cylinder_length_m', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.05"
                            className="form-input"
                            style={{ width: '70px', padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={mat.shipping_dimensions?.cylinder_diameter_m || 0}
                            onChange={(e) => handleMaterialChange(idx, 'shipping_dimensions.cylinder_diameter_m', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '80px', padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={mat.weight_kg || 0}
                            onChange={(e) => handleMaterialChange(idx, 'weight_kg', parseInt(e.target.value, 10) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max="8"
                            className="form-input"
                            style={{ width: '60px', padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={mat.logistics_rules?.max_stack_tier || 3}
                            onChange={(e) => handleMaterialChange(idx, 'logistics_rules.max_stack_tier', parseInt(e.target.value, 10) || 3)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            style={{ color: 'var(--accent-rose)', border: 'none', background: 'transparent' }}
                            onClick={() => handleDeleteMaterial(idx)}
                            title="Hapus Produk"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TRUCKS */}
          {activeTab === 'fleet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Kelola tipe armada, panjang x lebar x tinggi bak kargo, dan batas tonase:
                </span>
                <button className="btn btn-secondary btn-sm" onClick={handleAddFleet}>
                  <Plus size={14} color="var(--accent-amber)" />
                  <span>Tambah Armada Baru</span>
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table font-mono" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Fleet ID</th>
                      <th>Kategori Truk</th>
                      <th>Panjang Bak (m)</th>
                      <th>Lebar Bak (m)</th>
                      <th>Tinggi Bak (m)</th>
                      <th>Max Tonase (kg)</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbData.logistics_fleet.map((fleet, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={fleet.fleet_id}
                            onChange={(e) => handleFleetChange(idx, 'fleet_id', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={fleet.truck_category}
                            onChange={(e) => handleFleetChange(idx, 'truck_category', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            className="form-input"
                            style={{ width: '75px', padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={fleet.cargo_dimensions?.max_length_m || 0}
                            onChange={(e) => handleFleetChange(idx, 'cargo_dimensions.max_length_m', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.05"
                            className="form-input"
                            style={{ width: '75px', padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={fleet.cargo_dimensions?.max_width_m || 0}
                            onChange={(e) => handleFleetChange(idx, 'cargo_dimensions.max_width_m', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.05"
                            className="form-input"
                            style={{ width: '75px', padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={fleet.cargo_dimensions?.max_height_m || 0}
                            onChange={(e) => handleFleetChange(idx, 'cargo_dimensions.max_height_m', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '95px', padding: '0.35rem 0.5rem', fontSize: '0.775rem' }}
                            value={fleet.max_tonnage_kg || 0}
                            onChange={(e) => handleFleetChange(idx, 'max_tonnage_kg', parseInt(e.target.value, 10) || 0)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            style={{ color: 'var(--accent-rose)', border: 'none', background: 'transparent' }}
                            onClick={() => handleDeleteFleet(idx)}
                            title="Hapus Armada"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (window.confirm("Kembalikan database ke kondisi awal (default JSON)?")) {
                const def = onResetDatabase();
                setDbData(def);
                setSaveStatus("Database dikembalikan ke setelan default pabrik.");
              }
            }}
          >
            <RotateCcw size={14} />
            <span>Reset ke Default</span>
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <Save size={15} />
              <span>Simpan Perubahan Database</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
