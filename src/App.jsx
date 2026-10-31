import React, { useMemo, useState, useRef } from "react";
import {
  Layers3,
  Package,
  Truck,
  MapPinned,
  ArrowRight,
  Plus,
  Trash2,
  Database,
  History,
  Download,
  Upload,
  Check,
  AlertTriangle,
  FileText,
  Copy,
  Printer,
  Save,
  ChevronRight,
} from "lucide-react";
import {
  optimizeCargoLoading,
  validateDatabase,
} from "./services/packingOptimizer.js";
import { calculatePrice, DEFAULT_PRICING } from "./services/pricingEngine.js";
import {
  loadWorkspace,
  saveWorkspace,
  exportBackup,
  downloadJson,
} from "./services/storageV2.js";
import { quotationText, rupiah, number } from "./services/quotation.js";
import { RoutePlanner } from "./components/RoutePlanner.jsx";
import { PackingView } from "./components/PackingView.jsx";
import { Modal, DatabaseEditor, OcrReview } from "./components/Editors.jsx";
const sample = [
  { sku: "GM-HDPE-10-7M", quantity: 6 },
  { sku: "GTX-NW-250-4M", quantity: 8 },
  { sku: "GM-LDPE-05-2M", quantity: 8 },
];
const steps = [
  { id: "material", label: "Material", icon: Package },
  { id: "fleet", label: "Armada & muatan", icon: Truck },
  { id: "route", label: "Rute & biaya", icon: MapPinned },
];
export function App() {
  const [loaded] = useState(loadWorkspace),
    [database, setDatabase] = useState(loaded.database),
    [history, setHistory] = useState(loaded.history),
    [error, setError] = useState(loaded.error || ""),
    [storageBlocked, setStorageBlocked] = useState(!!loaded.error);
  const [step, setStep] = useState("material"),
    [lines, setLines] = useState(
      sample.filter((s) =>
        loaded.database.geosynthetics.some((m) => m.sku === s.sku),
      ),
    ),
    [example, setExample] = useState(true),
    [client, setClient] = useState({ company: "", project: "", notes: "" }),
    [fleetId, setFleetId] = useState("AUTO"),
    [route, setRoute] = useState(null),
    [pricing, setPricing] = useState(DEFAULT_PRICING),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [printSnapshot, setPrintSnapshot] = useState(null),
    [specChecked, setSpecChecked] = useState(false),
    [routeKey, setRouteKey] = useState(0),
    [addSku, setAddSku] = useState(loaded.database.geosynthetics[0]?.sku || "");
  const importRef = useRef(null),
    toastTimer = useRef(null);
  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  const items = useMemo(
    () =>
      lines.map((l) => ({
        ...database.geosynthetics.find((m) => m.sku === l.sku),
        sku: l.sku,
        quantity: l.quantity,
      })),
    [lines, database],
  );
  const packing = useMemo(
    () =>
      optimizeCargoLoading(items, database.logistics_fleet, fleetId, {
        quoteCandidate: route
          ? (f, n) => calculatePrice(f, n, route.distanceKm, pricing).total
          : undefined,
      }),
    [items, database, fleetId, route, pricing],
  );
  const price =
    packing.success && route
      ? calculatePrice(
          packing.targetFleet,
          packing.totalTrucksCount,
          route.distanceKm,
          pricing,
        )
      : null;
  const totals = packing.summary || {
    totalRolls: 0,
    totalWeightKg: 0,
    totalVolumeM3: 0,
    maxRollLength: 0,
  };
  function changeLines(next) {
    setLines(next);
    setSpecChecked(false);
    setExample(false);
  }
  function updateRoute(r) {
    setRoute(r);
    setPricing((p) => ({ ...p, rateConfirmed: false }));
  }
  function saveDb(db) {
    if (storageBlocked)
      throw Error("Ekspor cadangan terlebih dahulu untuk membuka penyimpanan.");
    saveWorkspace(db, history);
    setDatabase(db);
    setSpecChecked(false);
    setPricing((p) => ({ ...p, rateConfirmed: false }));
    setAddSku(db.geosynthetics[0]?.sku || "");
    notify("Master tersimpan di perangkat ini.");
  }
  function addMaterial() {
    if (!addSku) return;
    changeLines(
      lines.some((l) => l.sku === addSku)
        ? lines.map((l) =>
            l.sku === addSku ? { ...l, quantity: Number(l.quantity) + 1 } : l,
          )
        : [...lines, { sku: addSku, quantity: 1 }],
    );
  }
  function snapshot() {
    return {
      id: `EST-${Date.now().toString(36).toUpperCase()}`,
      version: "2.0",
      createdAt: new Date().toISOString(),
      client: structuredClone(client),
      items: structuredClone(items),
      route: structuredClone(route),
      packing: JSON.parse(
        JSON.stringify({ ...packing, candidates: undefined }),
      ),
      pricingSettings: structuredClone(pricing),
      price: structuredClone(price),
      specificationsConfirmed: specChecked,
    };
  }
  const canQuote = !!(
    packing.success &&
    route &&
    price?.valid &&
    client.company.trim()
  );
  function saveEstimate() {
    if (!canQuote) return;
    if (storageBlocked) {
      setError("Ekspor cadangan sebelum menyimpan.");
      return;
    }
    try {
      const q = snapshot();
      const next = [q, ...history];
      saveWorkspace(database, next);
      setHistory(next);
      notify("Snapshot estimasi tersimpan.");
    } catch (e) {
      setError(
        `Gagal menyimpan: ${e.message}. Ekspor cadangan untuk mengamankan data.`,
      );
    }
  }
  async function copyQuote(q) {
    try {
      await navigator.clipboard.writeText(quotationText(q || snapshot()));
      notify("Teks estimasi disalin.");
    } catch {
      setError("Clipboard tidak tersedia. Gunakan ekspor JSON atau cetak.");
    }
  }
  function printQuote(q) {
    setPrintSnapshot(q || snapshot());
    setTimeout(() => window.print(), 150);
  }
  function backup() {
    exportBackup(database, history);
    setStorageBlocked(false);
    notify("Cadangan diunduh.");
  }
  async function importDb(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw Error("Ukuran maksimal 5 MB.");
      const data = JSON.parse(await file.text());
      const db = data.database || data;
      const errors = validateDatabase(db);
      if (errors.length) throw Error(errors.join(" "));
      setModal({ type: "import", database: db });
    } catch (e) {
      setError(`Impor gagal: ${e.message}`);
    }
  }
  function applyOcr(data, rows) {
    const merged = [];
    for (const row of rows) {
      const existing = merged.find((r) => r.sku === row.sku);
      if (existing) existing.quantity += row.quantity;
      else merged.push({ sku: row.sku, quantity: row.quantity });
    }
    changeLines(merged);
    setClient((c) => ({
      ...c,
      company: data.company_name || c.company,
      project: data.project_name || c.project,
      notes: [
        c.notes,
        data.destination ? `Tujuan dari dokumen: ${data.destination}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    }));
    updateRoute(null);
    setRouteKey((k) => k + 1);
    setStep("material");
    notify("Hasil OCR diterapkan. Konfirmasi tujuan melalui peta.");
  }
  function resetDraft() {
    changeLines([]);
    setClient({ company: "", project: "", notes: "" });
    setRoute(null);
    setPricing(DEFAULT_PRICING);
    setFleetId("AUTO");
    setRouteKey((k) => k + 1);
    setStep("material");
    setModal(null);
  }
  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setStep("material");
            }}
          >
            <span className="brand-mark">
              <Layers3 size={23} />
            </span>
            <span>
              Multibangun
              <small>
                LogiSynthetix <span> / 02</span>
              </small>
            </span>
          </a>
          <div className="header-location">
            <span className="status-dot" />
            Hub Bitung, Tangerang
          </div>
          <div className="header-actions">
            <button
              className="button ghost"
              aria-label="Master data"
              onClick={() => setModal({ type: "database" })}
            >
              <Database size={17} />
              <span>Master data</span>
            </button>
            <button
              className="button ghost"
              aria-label="Riwayat estimasi"
              onClick={() => setModal({ type: "history" })}
            >
              <History size={17} />
              <span>Riwayat</span>
              <span className="count">{history.length}</span>
            </button>
            <button
              className="icon-button"
              aria-label="Unduh cadangan data"
              onClick={backup}
            >
              <Download size={18} />
            </button>
          </div>
        </header>
        <main className="workspace">
          <div className="page-intro">
            <div>
              <div className="breadcrumb">
                OPERASIONAL <ChevronRight size={12} /> PERENCANAAN PENGIRIMAN
              </div>
              <h1>Muatan tepat. Pengiriman terencana.</h1>
              <p>
                Susun material, bandingkan armada, lalu pastikan rute dan
                biayanya.
              </p>
            </div>
            <button
              className="button"
              onClick={() => setModal({ type: "reset" })}
            >
              <Plus size={17} />
              Draf baru
            </button>
          </div>
          {error && (
            <div role="alert" className="notice danger">
              <AlertTriangle size={17} />
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-button">
                Tutup
              </button>
            </div>
          )}
          {example && (
            <div className="demo-banner">
              <span>
                <FileText size={16} />
                Draf contoh · 3 jenis material dari template proyek Anda
              </span>
              <button
                className="text-button"
                onClick={() => {
                  resetDraft();
                }}
              >
                Mulai dari kosong <ArrowRight size={14} />
              </button>
            </div>
          )}
          <div className="workspace-grid">
            <div className="main-column">
              <nav className="step-nav" aria-label="Tahap perencanaan">
                {steps.map((s, i) => (
                  <button
                    key={s.id}
                    aria-current={step === s.id ? "step" : undefined}
                    onClick={() => setStep(s.id)}
                  >
                    <span className="step-index">{i + 1}</span>
                    <s.icon size={18} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </nav>
              <div hidden={step !== "material"}>
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">01 / DAFTAR MUATAN</span>
                      <h2>Apa yang akan dikirim?</h2>
                    </div>
                    <button
                      className="button"
                      onClick={() => setModal({ type: "ocr" })}
                    >
                      <Upload size={16} />
                      Baca dokumen
                    </button>
                  </div>
                  <div className="material-toolbar">
                    <label className="grow">
                      Pilih material dari template
                      <select
                        value={addSku}
                        onChange={(e) => setAddSku(e.target.value)}
                      >
                        {database.geosynthetics.map((m) => (
                          <option key={m.sku} value={m.sku}>
                            {m.sku} · {m.category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="button primary" onClick={addMaterial}>
                      <Plus size={17} />
                      Tambah
                    </button>
                  </div>
                  <div className="cargo-table">
                    <div className="cargo-head">
                      <span>MATERIAL / SPESIFIKASI</span>
                      <span>UKURAN & BERAT</span>
                      <span>ROLL</span>
                      <span>SUBTOTAL</span>
                      <span />
                    </div>
                    {items.map((m, i) => (
                      <div className="cargo-row" key={m.sku}>
                        <div className="material-title">
                          <span className={`material-swatch color-${i % 3}`}>
                            <Package size={19} />
                          </span>
                          <div>
                            <strong>
                              {m.category || "SKU tidak ditemukan"}
                            </strong>
                            <p>{m.specification}</p>
                            <small>{m.sku}</small>
                          </div>
                        </div>
                        <div className="dimensions">
                          <strong>
                            {number(
                              m.shipping_dimensions?.cylinder_length_m,
                              2,
                            )}{" "}
                            m × Ø{" "}
                            {number(
                              m.shipping_dimensions?.cylinder_diameter_m,
                              2,
                            )}{" "}
                            m
                          </strong>
                          <small>{number(m.weight_kg)} kg / roll</small>
                        </div>
                        <label className="qty-label">
                          <span className="sr-only">Jumlah roll {m.sku}</span>
                          <input
                            type="number"
                            min="1"
                            max="2000"
                            step="1"
                            value={m.quantity}
                            onChange={(e) =>
                              changeLines(
                                lines.map((l, j) =>
                                  i === j
                                    ? {
                                        ...l,
                                        quantity:
                                          e.target.value === ""
                                            ? ""
                                            : Number(e.target.value),
                                      }
                                    : l,
                                ),
                              )
                            }
                          />
                        </label>
                        <strong className="subtotal">
                          {Number.isInteger(m.quantity) && m.quantity > 0
                            ? `${number(m.weight_kg * m.quantity)} kg`
                            : "—"}
                        </strong>
                        <button
                          className="icon-button remove"
                          aria-label={`Hapus ${m.sku}`}
                          onClick={() =>
                            changeLines(lines.filter((_, j) => j !== i))
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {!items.length && (
                    <div className="empty">
                      <Package size={32} />
                      <h3>Mulai dengan material pertama.</h3>
                      <p>Pilih template di atas atau baca dokumen pesanan.</p>
                    </div>
                  )}
                  <div className="material-note">
                    <AlertTriangle size={16} />
                    <span>
                      Ukuran adalah panjang fisik gulungan saat dikirim, bukan
                      panjang lembaran setelah dibuka.
                    </span>
                  </div>
                </section>
                <section className="panel client-panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">INFORMASI PESANAN</span>
                      <h2>Detail klien & proyek</h2>
                    </div>
                    <span className="muted">Untuk arsip estimasi</span>
                  </div>
                  <div className="form-grid">
                    <label>
                      <span>
                        Nama perusahaan <span className="required">*</span>
                      </span>
                      <input
                        placeholder="Nama perusahaan pemesan"
                        value={client.company}
                        onChange={(e) =>
                          setClient({ ...client, company: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Proyek / nomor PO
                      <input
                        placeholder="Opsional"
                        value={client.project}
                        onChange={(e) =>
                          setClient({ ...client, project: e.target.value })
                        }
                      />
                    </label>
                    <label className="full">
                      Catatan pengiriman
                      <textarea
                        rows="2"
                        placeholder="Jadwal, akses lokasi, atau kebutuhan khusus"
                        value={client.notes}
                        onChange={(e) =>
                          setClient({ ...client, notes: e.target.value })
                        }
                      />
                    </label>
                  </div>
                </section>
              </div>
              <div hidden={step !== "fleet"}>
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">02 / PERBANDINGAN ARMADA</span>
                      <h2>Pilih berdasarkan muatan.</h2>
                    </div>
                    <Truck size={23} />
                  </div>
                  <label className="fleet-select">
                    Metode pemilihan
                    <select
                      value={fleetId}
                      onChange={(e) => {
                        setFleetId(e.target.value);
                        setPricing((p) => ({ ...p, rateConfirmed: false }));
                        setSpecChecked(false);
                      }}
                    >
                      <option value="AUTO">
                        Otomatis · bandingkan kandidat
                      </option>
                      {database.logistics_fleet.map((f) => (
                        <option key={f.fleet_id} value={f.fleet_id}>
                          {f.truck_category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="helper">
                    {packing.selectionBasis ||
                      "Tambahkan material valid untuk melihat kandidat."}
                    . Perbandingan memakai satu tipe armada per kandidat, bukan
                    campuran tipe.
                  </p>
                  <div className="fleet-cards">
                    {packing.candidates?.map((c) => (
                      <button
                        key={c.fleet.fleet_id}
                        className={`fleet-card ${packing.targetFleet?.fleet_id === c.fleet.fleet_id ? "chosen" : ""}`}
                        onClick={() => {
                          setFleetId(c.fleet.fleet_id);
                          setPricing((p) => ({ ...p, rateConfirmed: false }));
                          setSpecChecked(false);
                        }}
                      >
                        <div className="fleet-card-top">
                          <Truck size={20} />
                          <span className={c.success ? "badge" : "badge red"}>
                            {c.success ? "Ter­alokasi" : "Tidak cocok"}
                          </span>
                        </div>
                        <h3>{c.fleet.truck_category}</h3>
                        <p>
                          {[
                            c.fleet.cargo_dimensions.max_length_m,
                            c.fleet.cargo_dimensions.max_width_m,
                            c.fleet.cargo_dimensions.max_height_m,
                          ]
                            .map((v) => number(v, 2))
                            .join(" × ")}{" "}
                          m
                        </p>
                        <small>
                          Payload template{" "}
                          {number(c.fleet.max_tonnage_kg / 1000, 1)} ton
                        </small>
                        <div className="fleet-card-bottom">
                          {c.success ? (
                            <>
                              <strong>{c.totalTrucksCount} perjalanan</strong>
                              <span>
                                {c.estimatedCost !== null
                                  ? rupiah(c.estimatedCost)
                                  : "Biaya menunggu rute"}
                              </span>
                            </>
                          ) : (
                            <span>
                              {c.unplaced[0]?.reason} · {c.unplaced.length} roll
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
                <PackingView packing={packing} />
                <section className="panel verification">
                  <h3>Verifikasi sebelum digunakan di lapangan</h3>
                  <p>
                    Pastikan payload unit aktual, batas tumpukan dari pemasok,
                    penyangga, pengikat, dan distribusi beban sumbu. Status
                    “teralokasi” hanya menyatakan model perencanaan lolos batas
                    yang dimasukkan.
                  </p>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={specChecked}
                      onChange={(e) => setSpecChecked(e.target.checked)}
                    />
                    Saya telah memeriksa spesifikasi material dan kendaraan
                    untuk draf ini.
                  </label>
                </section>
              </div>
              <div hidden={step !== "route"}>
                <RoutePlanner
                  key={routeKey}
                  route={route}
                  onRouteChange={updateRoute}
                />
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">03 / TARIF PENGIRIMAN</span>
                      <h2>Biaya yang bisa ditelusuri.</h2>
                    </div>
                    <span className="badge">Perhitungan deterministik</span>
                  </div>
                  <div className="pricing-modes">
                    <button
                      aria-pressed={pricing.mode === "all-in"}
                      onClick={() =>
                        setPricing((p) => ({
                          ...p,
                          mode: "all-in",
                          rateConfirmed: false,
                        }))
                      }
                    >
                      <strong>Tarif vendor all-in</strong>
                      <small>BBM, tol & pengemudi termasuk paket</small>
                    </button>
                    <button
                      aria-pressed={pricing.mode === "components"}
                      onClick={() =>
                        setPricing((p) => ({
                          ...p,
                          mode: "components",
                          rateConfirmed: false,
                        }))
                      }
                    >
                      <strong>Rincian komponen</strong>
                      <small>Sewa, BBM, tol & pengemudi dipisah</small>
                    </button>
                  </div>
                  <p className="helper">
                    Tarif dasar dan per km berasal dari master armada.
                    Konfirmasikan tarif vendor sebelum digunakan. Beralih ke
                    komponen memerlukan tarif sewa kendaraan yang belum termasuk
                    BBM, tol, dan pengemudi.
                  </p>
                  <div className="form-grid">
                    <label>
                      Jarak yang ditagihkan
                      <select
                        value={pricing.returnFactor}
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            returnFactor: Number(e.target.value),
                            rateConfirmed: false,
                          }))
                        }
                      >
                        <option value="1">Satu arah</option>
                        <option value="2">Pulang-pergi (2 × jarak)</option>
                      </select>
                    </label>
                    {(pricing.mode === "components"
                      ? [
                          ["fuelPrice", "Harga BBM (Rp/liter)"],
                          ["tollPerTrip", "Tol / ferry per perjalanan (Rp)"],
                          ["driverPerTrip", "Pengemudi per perjalanan (Rp)"],
                        ]
                      : []
                    )
                      .concat([
                        [
                          "otherPerTrip",
                          "Tambahan di luar paket per perjalanan (Rp)",
                        ],
                      ])
                      .map(([k, l]) => (
                        <label key={k}>
                          {l}
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={pricing[k] ?? ""}
                            onChange={(e) =>
                              setPricing((p) => ({
                                ...p,
                                [k]:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                                rateConfirmed: false,
                                ...(k === "tollPerTrip"
                                  ? { tollConfirmed: false }
                                  : {}),
                              }))
                            }
                          />
                        </label>
                      ))}
                  </div>
                  <p className="helper">
                    “Per perjalanan” adalah satu muatan dengan cakupan satu
                    arah/pulang-pergi yang dipilih. Isi tol, pengemudi, dan
                    tambahan untuk seluruh cakupan tersebut.
                  </p>
                  {pricing.mode === "components" && (
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={pricing.tollConfirmed}
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            tollConfirmed: e.target.checked,
                          }))
                        }
                      />
                      Nilai tol / ferry telah diperiksa sesuai rute dan golongan
                      kendaraan.
                    </label>
                  )}
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={pricing.rateConfirmed}
                      onChange={(e) =>
                        setPricing((p) => ({
                          ...p,
                          rateConfirmed: e.target.checked,
                        }))
                      }
                    />
                    Tarif dan cakupan biaya telah dikonfirmasi dengan vendor.
                  </label>
                  {price && !price.valid && (
                    <p className="notice danger" role="alert">
                      {price.error}
                    </p>
                  )}
                  {price?.valid && (
                    <div className="price-breakdown">
                      {price.lines.map((l) => (
                        <div key={l.label}>
                          <span>{l.label}</span>
                          <strong>{rupiah(l.amount)}</strong>
                        </div>
                      ))}
                      <div className="total-row">
                        <span>Total estimasi</span>
                        <strong>{rupiah(price.total)}</strong>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
            <aside className="summary-panel">
              <div className="summary-title">
                <span>RINGKASAN PENGIRIMAN</span>
                <span className="badge">Draf</span>
              </div>
              <div className="summary-main">
                <div>
                  <small>TOTAL BERAT</small>
                  <strong>
                    {packing.summary
                      ? number(totals.totalWeightKg / 1000, 2)
                      : "—"}{" "}
                    <span>ton</span>
                  </strong>
                </div>
                <Package size={28} />
              </div>
              <div className="summary-pairs">
                <div>
                  <span>Jumlah gulungan</span>
                  <strong>
                    {packing.summary ? `${totals.totalRolls} roll` : "—"}
                  </strong>
                </div>
                <div>
                  <span>Volume silinder</span>
                  <strong>
                    {packing.summary
                      ? `${number(totals.totalVolumeM3, 2)} m³`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>Roll terpanjang</span>
                  <strong>
                    {packing.summary
                      ? `${number(totals.maxRollLength, 2)} m`
                      : "—"}
                  </strong>
                </div>
              </div>
              <div className="summary-rule" />
              {packing.success ? (
                <div className="selected-truck">
                  <Truck size={22} />
                  <div>
                    <strong>
                      {packing.totalTrucksCount} perjalanan muatan
                    </strong>
                    <small>{packing.targetFleet.truck_category}</small>
                  </div>
                </div>
              ) : (
                <div className="notice danger">
                  <AlertTriangle size={17} />
                  <span>{packing.message}</span>
                </div>
              )}
              <div className="checklist">
                <div>
                  <span className={packing.success ? "done" : "pending"}>
                    {packing.success ? <Check size={13} /> : 1}
                  </span>
                  <span>
                    {packing.success
                      ? `${totals.loadedRolls} / ${totals.totalRolls} roll teralokasi`
                      : "Periksa data material"}
                  </span>
                </div>
                <div>
                  <span className={specChecked ? "done" : "pending"}>
                    {specChecked ? <Check size={13} /> : 2}
                  </span>
                  <span>
                    {specChecked
                      ? "Spesifikasi diperiksa operator"
                      : "Spesifikasi perlu diverifikasi"}
                  </span>
                </div>
                <div>
                  <span className={route ? "done" : "pending"}>
                    {route ? <Check size={13} /> : 3}
                  </span>
                  <span>
                    {route
                      ? `${number(route.distanceKm, 1)} km · pin dikonfirmasi`
                      : "Konfirmasi pin & rute"}
                  </span>
                </div>
              </div>
              <div className="summary-rule" />
              <div className="estimate-label">TOTAL ESTIMASI</div>
              <div className="estimate-value">
                {price?.valid ? rupiah(price.total) : "Belum dihitung"}
              </div>
              <p className="helper">
                {price?.valid
                  ? price.confirmed
                    ? "Tarif dikonfirmasi operator."
                    : "Draf tarif — belum dikonfirmasi vendor."
                  : "Biaya tersedia setelah muatan dan rute valid."}
              </p>
              {step !== "route" ? (
                <button
                  className="button primary full-width"
                  onClick={() =>
                    setStep(step === "material" ? "fleet" : "route")
                  }
                >
                  {step === "material" ? "Bandingkan armada" : "Tentukan rute"}
                  <ArrowRight size={17} />
                </button>
              ) : (
                <>
                  <button
                    className="button primary full-width"
                    disabled={!canQuote}
                    onClick={saveEstimate}
                  >
                    <Save size={17} />
                    Simpan estimasi
                  </button>
                  <div className="export-actions">
                    <button
                      className="button"
                      disabled={!canQuote}
                      onClick={() => copyQuote()}
                    >
                      <Copy size={15} />
                      Salin WA
                    </button>
                    <button
                      className="button"
                      disabled={!canQuote}
                      onClick={() => printQuote()}
                    >
                      <Printer size={15} />
                      Cetak / PDF
                    </button>
                  </div>
                  {!client.company.trim() && (
                    <button
                      className="text-button"
                      onClick={() => setStep("material")}
                    >
                      Isi nama perusahaan untuk menyimpan
                    </button>
                  )}
                </>
              )}
              <p className="summary-foot">
                Jumlah perjalanan tidak sama dengan jumlah unit yang harus
                berangkat bersamaan.
              </p>
            </aside>
          </div>
          <footer className="app-footer">
            <span>Multibangun LogiSynthetix · Perencanaan v2</span>
            <span>
              Tersimpan di browser ini <span>·</span>{" "}
              <button className="text-button" onClick={backup}>
                Unduh cadangan
              </button>
            </span>
          </footer>
        </main>
        {toast && (
          <div role="status" className="toast">
            <Check size={17} />
            {toast}
          </div>
        )}
        {modal?.type === "database" && (
          <DatabaseEditor
            database={database}
            onSave={saveDb}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "ocr" && (
          <OcrReview
            materials={database.geosynthetics}
            onApply={applyOcr}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "reset" && (
          <Modal title="Mulai draf baru?" onClose={() => setModal(null)}>
            <p>
              Draf aktif akan dikosongkan. Estimasi yang sudah disimpan tetap
              tersedia di Riwayat.
            </p>
            <div className="modal-actions">
              <button className="button" onClick={() => setModal(null)}>
                Batal
              </button>
              <button className="button primary" onClick={resetDraft}>
                Mulai draf kosong
              </button>
            </div>
          </Modal>
        )}
        {modal?.type === "history" && (
          <Modal title="Riwayat & cadangan" wide onClose={() => setModal(null)}>
            <div className="history-toolbar">
              <button className="button" onClick={backup}>
                <Download size={16} />
                Ekspor cadangan
              </button>
              <button
                className="button"
                onClick={() => importRef.current.click()}
              >
                <Upload size={16} />
                Impor master JSON
              </button>
              <input
                hidden
                ref={importRef}
                type="file"
                accept=".json"
                onChange={importDb}
              />
            </div>
            <p className="helper">
              Riwayat berupa snapshot tetap. Impor master tidak menimpa riwayat.
              Data belum disinkronkan antarperangkat.
            </p>
            {loaded.legacyAvailable && (
              <p className="notice">
                Riwayat versi lama masih tersimpan dan disertakan dalam ekspor
                cadangan. Perhitungannya tidak dipromosikan menjadi hasil v2.
              </p>
            )}
            {history.length ? (
              history.map((q) => (
                <div className="history-row" key={q.id}>
                  <div>
                    <strong>{q.client.company}</strong>
                    <small>
                      {q.id} ·{" "}
                      {new Date(q.createdAt).toLocaleDateString("id-ID")} ·{" "}
                      {q.route.destination.name}
                    </small>
                  </div>
                  <strong>{rupiah(q.price.total)}</strong>
                  <button
                    className="button"
                    onClick={() => setModal({ type: "quotation", q })}
                  >
                    Lihat
                  </button>
                </div>
              ))
            ) : (
              <div className="empty">
                <History size={28} />
                <h3>Belum ada estimasi tersimpan.</h3>
                <p>
                  Lengkapi muatan, rute, dan nama klien untuk membuat arsip
                  pertama.
                </p>
              </div>
            )}
          </Modal>
        )}
        {modal?.type === "quotation" && (
          <Modal title="Snapshot estimasi" wide onClose={() => setModal(null)}>
            <pre className="quotation-text">{quotationText(modal.q)}</pre>
            <div className="modal-actions">
              <button
                className="button"
                onClick={() => downloadJson(`${modal.q.id}.json`, modal.q)}
              >
                Ekspor JSON
              </button>
              <button className="button" onClick={() => copyQuote(modal.q)}>
                Salin WA
              </button>
              <button
                className="button primary"
                onClick={() => printQuote(modal.q)}
              >
                Cetak / PDF
              </button>
            </div>
          </Modal>
        )}
        {modal?.type === "import" && (
          <Modal title="Tinjau impor master" onClose={() => setModal(null)}>
            <p>
              {modal.database.geosynthetics.length} material dan{" "}
              {modal.database.logistics_fleet.length} armada akan menggantikan
              master aktif. Ekspor cadangan terlebih dahulu bila diperlukan.
            </p>
            <div className="modal-actions">
              <button className="button" onClick={backup}>
                Ekspor cadangan
              </button>
              <button
                className="button primary"
                onClick={() => {
                  try {
                    saveDb(modal.database);
                    setModal(null);
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Terapkan master
              </button>
            </div>
          </Modal>
        )}
      </div>
      <article className="print-only">
        <h1>Multibangun LogiSynthetix</h1>
        {printSnapshot && <pre>{quotationText(printSnapshot)}</pre>}
      </article>
    </>
  );
}
