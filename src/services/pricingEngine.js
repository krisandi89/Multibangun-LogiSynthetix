export const DEFAULT_PRICING = {
  mode: "all-in",
  fuelPrice: null,
  driverPerTrip: 0,
  tollPerTrip: 0,
  otherPerTrip: 0,
  returnFactor: 1,
  tollConfirmed: false,
  rateConfirmed: false,
};
export function calculatePrice(fleet, count, distanceKm, settings) {
  const s = { ...DEFAULT_PRICING, ...settings };
  const invalid =
    !fleet ||
    !Number.isFinite(fleet?.base_rate) ||
    fleet.base_rate < 0 ||
    !Number.isFinite(fleet?.rate_per_km) ||
    fleet.rate_per_km < 0 ||
    !Number.isFinite(fleet?.fuel_consumption_km_l) ||
    fleet.fuel_consumption_km_l <= 0 ||
    !Number.isInteger(count) ||
    count < 1 ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0 ||
    !["all-in", "components"].includes(s.mode) ||
    ![1, 2].includes(s.returnFactor) ||
    (s.mode === "components"
      ? ["fuelPrice", "driverPerTrip", "tollPerTrip", "otherPerTrip"]
      : ["otherPerTrip"]
    ).some((k) => !Number.isFinite(s[k]) || s[k] < 0);
  if (invalid)
    return {
      valid: false,
      error: "Parameter biaya belum valid.",
      total: null,
      lines: [],
    };
  const rental = Math.round(
    (fleet.base_rate + fleet.rate_per_km * distanceKm * s.returnFactor) * count,
  );
  const fuel =
    s.mode === "components"
      ? Math.round(
          ((distanceKm * s.returnFactor) / fleet.fuel_consumption_km_l) *
            s.fuelPrice *
            count,
        )
      : 0;
  const lines =
    s.mode === "all-in"
      ? [
          { label: "Tarif vendor all-in", amount: rental },
          {
            label: "Tambahan di luar paket",
            amount: Math.round(s.otherPerTrip * count),
          },
        ]
      : [
          { label: "Sewa kendaraan", amount: rental },
          { label: "BBM", amount: fuel },
          {
            label: "Tol / penyeberangan",
            amount: Math.round(s.tollPerTrip * count),
          },
          { label: "Pengemudi", amount: Math.round(s.driverPerTrip * count) },
          {
            label: "Tambahan operasional",
            amount: Math.round(s.otherPerTrip * count),
          },
        ];
  const total = lines.reduce((n, l) => n + l.amount, 0);
  if (!Number.isSafeInteger(total))
    return {
      valid: false,
      error: "Nilai biaya terlalu besar atau tidak valid.",
      total: null,
      lines: [],
    };
  return {
    valid: true,
    lines,
    total,
    confirmed: s.rateConfirmed && (s.mode === "all-in" || s.tollConfirmed),
    mode: s.mode,
    distanceKm,
    tripCount: count,
    returnFactor: s.returnFactor,
  };
}
