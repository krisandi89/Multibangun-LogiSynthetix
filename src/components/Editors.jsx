import React, { useEffect, useRef, useState } from "react";
import { X, Plus, Save, Upload, LoaderCircle } from "lucide-react";
import { validateDatabase } from "../services/packingOptimizer.js";
import { extractQuotationDocument } from "../services/geminiService.js";
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Tutup dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Numeric({ label, value, onChange, step = "any", min = 0 }) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        step={step}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </label>
  );
}
export function DatabaseEditor({ database, onSave, onClose }) {
  const [draft, setDraft] = useState(() => structuredClone(database)),
    [type, setType] = useState("geosynthetics"),
    [index, setIndex] = useState(0),
    [error, setError] = useState("");
  const rows = draft[type],
    row = rows[index],
    material = type === "geosynthetics";
  function patch(values) {
    setDraft((d) => ({
      ...d,
      [type]: d[type].map((r, i) => (i === index ? { ...r, ...values } : r)),
    }));
  }
  function nested(key, field, value) {
    patch({ [key]: { ...row[key], [field]: value } });
  }
  function add() {
    const id = `CUSTOM-${Date.now()}`;
    const copy = structuredClone(rows[0]);
    if (material) {
      copy.sku = id;
      copy.specification = "Material baru";
    } else {
      copy.fleet_id = id;
      copy.truck_category = "Armada baru";
    }
    setDraft((d) => ({ ...d, [type]: [...d[type], copy] }));
    setIndex(rows.length);
  }
  function save() {
    const errors = validateDatabase(draft);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    try {
      onSave(draft);
      onClose();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Modal title="Master material & armada" wide onClose={onClose}>
      <div className="notice">
        Data template perlu diverifikasi terhadap spesifikasi produk dan
        kendaraan aktual. Perubahan berlaku pada draf aktif; arsip estimasi
        tetap memakai snapshot lama.
      </div>
      <div className="view-tabs">
        {[
          ["geosynthetics", "Material"],
          ["logistics_fleet", "Armada"],
        ].map(([k, l]) => (
          <button
            key={k}
            aria-pressed={type === k}
            onClick={() => {
              setType(k);
              setIndex(0);
              setError("");
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="editor-grid">
        <div className="editor-list">
          {rows.map((r, i) => (
            <button
              key={i}
              className={i === index ? "selected" : ""}
              onClick={() => setIndex(i)}
            >
              {r.sku || r.truck_category}
            </button>
          ))}
          <button className="button" onClick={add}>
            <Plus size={16} />
            Tambah {material ? "material" : "armada"}
          </button>
        </div>
        <div className="form-grid">
          {material ? (
            <>
              <label>
                SKU
                <input
                  value={row.sku}
                  onChange={(e) => patch({ sku: e.target.value })}
                />
              </label>
              <label>
                Kategori
                <input
                  value={row.category}
                  onChange={(e) => patch({ category: e.target.value })}
                />
              </label>
              <label>
                Spesifikasi
                <input
                  value={row.specification}
                  onChange={(e) => patch({ specification: e.target.value })}
                />
              </label>
              <Numeric
                label="Berat kotor per roll (kg)"
                value={row.weight_kg}
                onChange={(v) => patch({ weight_kg: v })}
              />
              <Numeric
                label="Panjang fisik roll (m)"
                value={row.shipping_dimensions.cylinder_length_m}
                onChange={(v) =>
                  nested("shipping_dimensions", "cylinder_length_m", v)
                }
              />
              <Numeric
                label="Diameter luar roll (m)"
                value={row.shipping_dimensions.cylinder_diameter_m}
                onChange={(v) =>
                  nested("shipping_dimensions", "cylinder_diameter_m", v)
                }
              />
              <Numeric
                label="Maksimum tingkat tumpukan"
                step="1"
                min={1}
                value={row.logistics_rules.max_stack_tier}
                onChange={(v) => nested("logistics_rules", "max_stack_tier", v)}
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={row.logistics_rules.stackable}
                  onChange={(e) =>
                    nested("logistics_rules", "stackable", e.target.checked)
                  }
                />
                Boleh ditumpuk dengan penyangga
              </label>
              <Numeric
                label="Batas beban di atas (kg, kosong = belum diketahui)"
                value={row.logistics_rules.max_stack_load_kg}
                onChange={(v) =>
                  nested("logistics_rules", "max_stack_load_kg", v)
                }
              />
            </>
          ) : (
            <>
              <label>
                ID armada
                <input
                  value={row.fleet_id}
                  onChange={(e) => patch({ fleet_id: e.target.value })}
                />
              </label>
              <label>
                Nama / konfigurasi kendaraan
                <input
                  value={row.truck_category}
                  onChange={(e) => patch({ truck_category: e.target.value })}
                />
              </label>
              {[
                ["max_length_m", "Panjang dalam bak (m)"],
                ["max_width_m", "Lebar dalam bak (m)"],
                ["max_height_m", "Tinggi muatan (m)"],
              ].map(([k, l]) => (
                <Numeric
                  key={k}
                  label={l}
                  value={row.cargo_dimensions[k]}
                  onChange={(v) => nested("cargo_dimensions", k, v)}
                />
              ))}
              <Numeric
                label="Payload muatan (kg)"
                value={row.max_tonnage_kg}
                onChange={(v) => patch({ max_tonnage_kg: v })}
              />
              <Numeric
                label="Lebar pintu (m, opsional)"
                value={row.door_width_m}
                onChange={(v) => patch({ door_width_m: v })}
              />
              <Numeric
                label="Tinggi pintu (m, opsional)"
                value={row.door_height_m}
                onChange={(v) => patch({ door_height_m: v })}
              />
              <Numeric
                label="Tarif dasar (Rp)"
                value={row.base_rate}
                onChange={(v) => patch({ base_rate: v })}
              />
              <Numeric
                label="Tarif per km (Rp)"
                value={row.rate_per_km}
                onChange={(v) => patch({ rate_per_km: v })}
              />
              <Numeric
                label="Konsumsi BBM (km/liter)"
                value={row.fuel_consumption_km_l}
                onChange={(v) => patch({ fuel_consumption_km_l: v })}
              />
            </>
          )}
          <label className="full">
            Sumber spesifikasi / vendor
            <input
              placeholder="Nomor datasheet, nama vendor, konfigurasi kendaraan…"
              value={row.source_note || ""}
              onChange={(e) => patch({ source_note: e.target.value })}
            />
          </label>
          <label>
            Tanggal verifikasi
            <input
              type="date"
              value={row.verified_at || ""}
              onChange={(e) => patch({ verified_at: e.target.value })}
            />
          </label>
        </div>
      </div>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button className="button" onClick={onClose}>
          Batal
        </button>
        <button className="button primary" onClick={save}>
          <Save size={16} />
          Simpan master
        </button>
      </div>
    </Modal>
  );
}
export function OcrReview({ materials, onApply, onClose }) {
  const [key, setKey] = useState(""),
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [data, setData] = useState(null),
    [rows, setRows] = useState([]);
  async function read() {
    if (!file || !key.trim()) return;
    setError("");
    setBusy(true);
    try {
      if (file.size > 10 * 1024 * 1024)
        throw Error("Maksimal ukuran dokumen 10 MB.");
      if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type))
        throw Error("Gunakan PDF, JPG, atau PNG.");
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await extractQuotationDocument(
        base64,
        file.type,
        materials,
        key,
      );
      if (!Array.isArray(result.extracted_items))
        throw Error("Respons OCR tidak memiliki daftar material.");
      setData(result);
      setRows(
        result.extracted_items.map((r) => ({
          sku: materials.some((m) => m.sku === r.matched_sku)
            ? r.matched_sku
            : "",
          quantity:
            Number.isInteger(r.quantity) && r.quantity > 0 ? r.quantity : "",
          detected: r.detected_name || "Tidak dikenal",
          confidence: r.confidence,
        })),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const valid =
    rows.length > 0 &&
    rows.every(
      (r) =>
        materials.some((m) => m.sku === r.sku) &&
        Number.isInteger(r.quantity) &&
        r.quantity > 0,
    );
  return (
    <Modal title="Baca dokumen & tinjau hasil" wide onClose={onClose}>
      <p className="helper">
        Dokumen dikirim ke Google Gemini hanya saat Anda menekan Baca dokumen.
        API key digunakan selama dialog ini dibuka dan tidak disimpan. Tinjau
        semua SKU dan jumlah sebelum menerapkan.
      </p>
      <div className="form-grid">
        <label>
          Gemini API key
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>
        <label>
          Dokumen pesanan
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </label>
      </div>
      <button
        className="button"
        disabled={busy || !file || !key.trim()}
        onClick={read}
      >
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Upload size={17} />
        )}
        Baca dokumen
      </button>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="notice">
            Klien terdeteksi: {data.company_name || "—"} · Tujuan:{" "}
            {data.destination || "—"}. Tujuan tetap harus dikonfirmasi ulang di
            peta.
          </div>
          {rows.map((r, i) => (
            <div className="ocr-row" key={i}>
              <span>
                {r.detected}
                <small>Periksa terhadap dokumen asli</small>
              </span>
              <label>
                SKU
                <select
                  value={r.sku}
                  onChange={(e) =>
                    setRows((a) =>
                      a.map((v, j) =>
                        i === j ? { ...v, sku: e.target.value } : v,
                      ),
                    )
                  }
                >
                  <option value="">Belum cocok — pilih material</option>
                  {materials.map((m) => (
                    <option key={m.sku}>{m.sku}</option>
                  ))}
                </select>
              </label>
              <label>
                Roll
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={r.quantity}
                  onChange={(e) =>
                    setRows((a) =>
                      a.map((v, j) =>
                        i === j
                          ? {
                              ...v,
                              quantity:
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                            }
                          : v,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={!valid}
              onClick={() => {
                onApply(data, rows);
                onClose();
              }}
            >
              Terapkan hasil yang sudah ditinjau
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
