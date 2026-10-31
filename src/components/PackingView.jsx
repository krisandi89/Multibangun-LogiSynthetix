import React, { useState } from "react";
import { number } from "../services/quotation.js";
export function PackingView({ packing }) {
  const [selected, setSelected] = useState(0),
    [view, setView] = useState("top");
  if (!packing?.trucks?.length) return null;
  const index = Math.min(selected, packing.trucks.length - 1),
    truck = packing.trucks[index],
    d = truck.fleet.cargo_dimensions;
  const w = view === "rear" ? d.max_width_m : d.max_length_m,
    h = view === "top" ? d.max_width_m : d.max_height_m;
  const colors = ["#0f7880", "#c89040", "#6a70a3", "#5e8b69", "#b8766b"];
  const skus = [...new Set(truck.loadedRolls.map((r) => r.sku))];
  const breakdown = skus.map((s) => ({
    sku: s,
    qty: truck.loadedRolls.filter((r) => r.sku === s).length,
  }));
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RENCANA PENATAAN</span>
          <h2>Setiap roll punya tempat.</h2>
        </div>
        <label className="compact-label">
          Perjalanan
          <select value={index} onChange={(e) => setSelected(+e.target.value)}>
            {packing.trucks.map((t, i) => (
              <option value={i} key={i}>
                #{i + 1} · {t.loadedRolls.length} roll
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="view-tabs" role="group" aria-label="Sudut pandang muatan">
        {[
          ["top", "Dari atas"],
          ["side", "Dari samping"],
          ["rear", "Dari belakang"],
        ].map(([v, l]) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
            {l}
          </button>
        ))}
      </div>
      <div className="load-drawing">
        <svg
          viewBox={`-0.15 -0.15 ${w + 0.3} ${h + 0.3}`}
          role="img"
          aria-label={`Proyeksi ${view}, skala meter. ${truck.loadedRolls.length} roll pada perjalanan ${index + 1}. Proyeksi dapat menutupi roll lain.`}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            x="0"
            y="0"
            width={w}
            height={h}
            fill="#f3f6f6"
            stroke="#879b9f"
            strokeWidth=".025"
          />
          {truck.loadedRolls
            .slice()
            .sort((a, b) => a.z - b.z)
            .map((r) => {
              const x = view === "rear" ? r.y : r.x,
                y = view === "top" ? r.y : h - r.z - r.diameter,
                rw = view === "rear" ? r.diameter : r.length;
              return (
                <g key={r.id}>
                  <title>{`${r.sku} · ${r.weight} kg · tingkat ${r.tier} · x ${r.x.toFixed(2)}, y ${r.y.toFixed(2)}, z ${r.z.toFixed(2)} m`}</title>
                  {view === "rear" ? (
                    <circle
                      cx={x + rw / 2}
                      cy={y + rw / 2}
                      r={rw / 2}
                      fill={colors[skus.indexOf(r.sku) % colors.length]}
                      stroke="white"
                      strokeWidth=".025"
                    />
                  ) : (
                    <rect
                      x={x}
                      y={y}
                      width={rw}
                      height={r.diameter}
                      rx=".04"
                      fill={colors[skus.indexOf(r.sku) % colors.length]}
                      stroke="white"
                      strokeWidth=".025"
                    />
                  )}
                </g>
              );
            })}
        </svg>
      </div>
      <div className="drawing-label">
        {number(w, 2)} m × {number(h, 2)} m · proyeksi berskala; roll dapat
        saling menutupi dalam tampilan
      </div>
      <div className="legend">
        {breakdown.map((m, i) => (
          <span key={m.sku}>
            <i style={{ background: colors[i % colors.length] }} />
            {m.sku} <strong>{m.qty} roll</strong>
          </span>
        ))}
      </div>
      <div className="load-metrics">
        <span>
          {number(truck.currentWeightKg)} / {number(truck.maxTonnageKg)} kg
        </span>
        <strong>{number(truck.weightUtilizationPercent, 1)}% berat</strong>
      </div>
      <progress max="100" value={truck.weightUtilizationPercent} />
      <p className="helper">
        Model memakai ruang persegi di sekitar silinder, tanpa susunan
        berselang. Penyangga/pemisah wajib untuk tumpukan. Gambar bukan
        sertifikasi kestabilan atau distribusi beban sumbu.
      </p>
      <details>
        <summary>
          Koordinat dan daftar roll ({truck.loadedRolls.length})
        </summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Tingkat</th>
                <th>X / Y / Z (m)</th>
                <th>Berat</th>
              </tr>
            </thead>
            <tbody>
              {truck.loadedRolls.map((r) => (
                <tr key={r.id}>
                  <td>{r.sku}</td>
                  <td>{r.tier}</td>
                  <td>
                    {[r.x, r.y, r.z].map((n) => number(n, 2)).join(" / ")}
                  </td>
                  <td>{number(r.weight)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
