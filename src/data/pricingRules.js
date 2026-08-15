/**
 * Indonesian Logistics Cost Parameters & Toll Heuristics
 */

export const PRICING_PARAMETERS = {
  fuel_price_per_liter: 15500, // Dexlite / Biosolar Industri standard (IDR)
  labor_handling_per_roll: 25000, // Loading & unloading per roll (IDR)
  driver_allowance_per_day: 350000, // Driver meal, lodging, parking
  insurance_rate: 0.002, // 0.2% of cargo value approx
  default_toll_rate_per_km: 1200 // Average highway toll per km in Java (Golongan II/III/IV)
};

export const TOLL_CORRIDORS = [
  { name: "Jabodetabek / Tangerang Inner", max_km: 60, toll_cost: 45000 },
  { name: "Tangerang - Merak", max_km: 110, toll_cost: 95000 },
  { name: "Tangerang - Bandung (Cipularang)", max_km: 190, toll_cost: 165000 },
  { name: "Tangerang - Cirebon (Cipali)", max_km: 260, toll_cost: 245000 },
  { name: "Tangerang - Semarang (Trans-Jawa)", max_km: 480, toll_cost: 460000 },
  { name: "Tangerang - Solo / Yogyakarta", max_km: 580, toll_cost: 580000 },
  { name: "Tangerang - Surabaya (Trans-Jawa)", max_km: 810, toll_cost: 880000 },
  { name: "Tangerang - Banyuwangi / Bali", max_km: 1150, toll_cost: 1150000 },
  { name: "Tangerang - Lampung (incl. Ferry)", max_km: 250, toll_cost: 980000 },
  { name: "Tangerang - Palembang (Tol Trans-Sumatera)", max_km: 550, toll_cost: 1550000 }
];

export function estimateTollCost(distanceKm, truckCategory = "Fuso") {
  if (distanceKm <= 10) return 0;
  
  // Find matching corridor or extrapolate
  const corridor = TOLL_CORRIDORS.find(c => distanceKm <= c.max_km);
  let baseToll = corridor ? corridor.toll_cost : Math.round(distanceKm * PRICING_PARAMETERS.default_toll_rate_per_km);
  
  // Truck classification multiplier (Golongan II/III for CDD/Fuso, IV/V for Tronton/Trailer)
  let multiplier = 1.0;
  if (truckCategory.includes("Engkel") || truckCategory.includes("CDE")) {
    multiplier = 0.75;
  } else if (truckCategory.includes("Double") || truckCategory.includes("CDD")) {
    multiplier = 1.0;
  } else if (truckCategory.includes("Fuso")) {
    multiplier = 1.35;
  } else if (truckCategory.includes("Tronton")) {
    multiplier = 1.65;
  } else if (truckCategory.includes("Container") || truckCategory.includes("40")) {
    multiplier = 1.85;
  }

  return Math.round(baseToll * multiplier);
}

export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}
