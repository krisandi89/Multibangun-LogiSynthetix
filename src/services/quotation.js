export const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
export const number = (n, d = 0) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  }).format(n || 0);
export function quotationText(q) {
  return [
    "MULTIBANGUN · ESTIMASI LOGISTIK",
    `Status: ${q.price.confirmed ? "Tarif dikonfirmasi operator" : "Draf tarif — perlu konfirmasi"}`,
    `Spesifikasi: ${q.specificationsConfirmed ? "diperiksa operator" : "belum diverifikasi"}`,
    `Klien: ${q.client.company || "—"}`,
    `Proyek: ${q.client.project || "—"}`,
    `Asal: ${q.route.origin.name}`,
    `Tujuan: ${q.route.destination.address || q.route.destination.name}`,
    `Pin: ${q.route.destination.lat}, ${q.route.destination.lng}`,
    `Jarak rute: ${number(q.route.distanceKm, 1)} km · ${q.route.source}`,
    "",
    ...q.items.map(
      (m) => `${m.sku}: ${m.quantity} roll × ${number(m.weight_kg)} kg`,
    ),
    `Total: ${q.packing.summary.totalRolls} roll · ${number(q.packing.summary.totalWeightKg)} kg`,
    `Armada: ${q.packing.totalTrucksCount} perjalanan muatan · ${q.packing.targetFleet.truck_category}`,
    "",
    ...q.price.lines.map((l) => `${l.label}: ${rupiah(l.amount)}`),
    `TOTAL ESTIMASI: ${rupiah(q.price.total)}`,
    `Perhitungan jarak biaya: ${q.price.returnFactor === 2 ? "pulang-pergi" : "satu arah"}`,
    "",
    "Susunan memakai model ruang persegi konservatif. Muatan bertingkat memerlukan penyangga/pemisah dan verifikasi operasional.",
    "Payload template, batas tumpukan, dan akses truk harus diperiksa terhadap kondisi aktual. Rute bukan navigasi khusus truk.",
    q.client.notes ? `Catatan: ${q.client.notes}` : "",
    `Versi perhitungan: ${q.version || "2.0"}`,
  ]
    .filter(Boolean)
    .join("\n");
}
