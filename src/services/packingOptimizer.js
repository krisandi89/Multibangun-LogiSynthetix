/** Conservative rectangular-envelope packing. Dimensions are metres, mass is kg.
 * Stacked rolls require load-spreading supports; this is a planning model, not a loading certificate.
 */
const EPS = 1e-7;
const positive = (n) => typeof n === "number" && Number.isFinite(n) && n > 0;
export function validateMaterial(m) {
  const errors = [];
  if (!m || typeof m !== "object") return ["Material tidak valid."];
  if (typeof m.sku !== "string" || !m.sku.trim())
    errors.push("SKU wajib diisi.");
  if (!positive(m.weight_kg))
    errors.push(`${m.sku}: berat kotor harus lebih dari 0 kg.`);
  for (const k of ["cylinder_length_m", "cylinder_diameter_m"])
    if (!positive(m.shipping_dimensions?.[k]))
      errors.push(`${m.sku}: ukuran roll harus lebih dari 0 m.`);
  if (
    !Number.isInteger(m.logistics_rules?.max_stack_tier) ||
    m.logistics_rules.max_stack_tier < 1 ||
    m.logistics_rules.max_stack_tier > 20
  )
    errors.push(`${m.sku}: batas tumpukan harus 1–20 tingkat.`);
  if (
    m.logistics_rules?.max_stack_load_kg != null &&
    (!Number.isFinite(m.logistics_rules.max_stack_load_kg) ||
      m.logistics_rules.max_stack_load_kg < 0)
  )
    errors.push(`${m.sku}: batas beban atas tidak valid.`);
  if (typeof m.logistics_rules?.stackable !== "boolean")
    errors.push(`${m.sku}: aturan boleh ditumpuk wajib diisi.`);
  return errors;
}
export function validateFleet(f) {
  const errors = [];
  if (!f || typeof f !== "object") return ["Armada tidak valid."];
  if (
    typeof f.fleet_id !== "string" ||
    !f.fleet_id.trim() ||
    typeof f.truck_category !== "string" ||
    !f.truck_category.trim()
  )
    errors.push("ID dan nama armada wajib diisi.");
  for (const k of ["max_length_m", "max_width_m", "max_height_m"])
    if (!positive(f.cargo_dimensions?.[k]))
      errors.push(`${f.truck_category}: ukuran bak tidak valid.`);
  if (!positive(f.max_tonnage_kg))
    errors.push(`${f.truck_category}: payload tidak valid.`);
  for (const k of ["base_rate", "rate_per_km"])
    if (!Number.isFinite(f[k]) || f[k] < 0)
      errors.push(`${f.truck_category}: tarif tidak valid.`);
  if (!positive(f.fuel_consumption_km_l))
    errors.push(`${f.truck_category}: konsumsi BBM tidak valid.`);
  for (const k of ["door_width_m", "door_height_m"])
    if (f[k] != null && !positive(f[k]))
      errors.push(`${f.truck_category}: ukuran pintu tidak valid.`);
  return errors;
}
export function validateDatabase(db) {
  if (
    !Array.isArray(db?.geosynthetics) ||
    !Array.isArray(db?.logistics_fleet) ||
    !db.geosynthetics.length ||
    !db.logistics_fleet.length
  )
    return ["Database harus berisi material dan armada."];
  const errors = [
    ...db.geosynthetics.flatMap(validateMaterial),
    ...db.logistics_fleet.flatMap(validateFleet),
  ];
  for (const [rows, key] of [
    [db.geosynthetics, "sku"],
    [db.logistics_fleet, "fleet_id"],
  ])
    if (new Set(rows.map((r) => r[key])).size !== rows.length)
      errors.push(`Ada ${key} duplikat.`);
  return errors;
}
export const rollVolume = (m) =>
  Math.PI *
  (m.shipping_dimensions.cylinder_diameter_m / 2) ** 2 *
  m.shipping_dimensions.cylinder_length_m;
function fitReason(r, f) {
  const d = f.cargo_dimensions;
  if (r.length > d.max_length_m + EPS)
    return "Panjang roll melebihi panjang bak";
  if (r.diameter > d.max_width_m + EPS)
    return "Diameter roll melebihi lebar bak";
  if (r.diameter > d.max_height_m + EPS)
    return "Diameter roll melebihi tinggi bak";
  if (
    (f.door_width_m && r.diameter > f.door_width_m + EPS) ||
    (f.door_height_m && r.diameter > f.door_height_m + EPS)
  )
    return "Diameter roll melebihi bukaan pintu";
  if (r.weight > f.max_tonnage_kg + EPS)
    return "Berat satu roll melebihi payload";
  return null;
}
const overlap = (a, b) =>
  a.x < b.x + b.length - EPS &&
  a.x + a.length > b.x + EPS &&
  a.y < b.y + b.diameter - EPS &&
  a.y + a.diameter > b.y + EPS &&
  a.z < b.z + b.diameter - EPS &&
  a.z + a.diameter > b.z + EPS;
function placeRoll(r, t, f) {
  if (t.currentWeightKg + r.weight > f.max_tonnage_kg + EPS) return null;
  const placed = t.loadedRolls,
    d = f.cargo_dimensions;
  const xs = [...new Set([0, ...placed.map((a) => a.x + a.length)])].sort(
    (a, b) => a - b,
  );
  const ys = [...new Set([0, ...placed.map((a) => a.y + a.diameter)])].sort(
    (a, b) => a - b,
  );
  const floor = [];
  for (const y of ys)
    for (const x of xs)
      floor.push({
        x,
        y,
        z: 0,
        tier: 1,
        stackLimit: r.maxTier,
        remainingSupportKg: Infinity,
      });
  // A stack occupies one continuous footprint. Smaller top rolls require spacers/dunnage.
  const tops = placed
    .filter(
      (a) =>
        a.stackable &&
        r.stackable &&
        r.weight <= a.weight + EPS &&
        r.length <= a.length + EPS &&
        r.diameter <= a.diameter + EPS &&
        a.tier < Math.min(a.stackLimit, r.maxTier),
    )
    .map((a) => ({
      x: a.x,
      y: a.y,
      z: a.z + a.diameter,
      tier: a.tier + 1,
      stackLimit: Math.min(a.stackLimit, r.maxTier),
      supportId: a.id,
      remainingSupportKg: a.remainingSupportKg,
    }))
    .sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  for (const p of [...floor, ...tops]) {
    if (
      p.x + r.length > d.max_length_m + EPS ||
      p.y + r.diameter > d.max_width_m + EPS ||
      p.z + r.diameter > d.max_height_m + EPS
    )
      continue;
    const candidate = { ...r, ...p };
    if (placed.some((a) => overlap(candidate, a))) continue;
    const chain = [];
    let support = placed.find((a) => a.id === p.supportId);
    while (support) {
      chain.push(support);
      support = placed.find((a) => a.id === support.supportId);
    }
    if (chain.some((a) => a.remainingSupportKg < r.weight - EPS)) continue;
    chain.forEach((a) => (a.remainingSupportKg -= r.weight));
    return {
      ...candidate,
      remainingSupportKg: r.maxStackLoadKg ?? Infinity,
      startX: p.x,
      endX: p.x + r.length,
      truckNumber: t.truckNumber,
    };
  }
  return null;
}
function simulate(rolls, fleet) {
  const unplaced = [],
    trucks = [];
  for (const roll of rolls) {
    const reason = fitReason(roll, fleet);
    if (reason) {
      unplaced.push({ ...roll, reason });
      continue;
    }
    let didPlace = false;
    for (const t of trucks) {
      const p = placeRoll(roll, t, fleet);
      if (p) {
        t.loadedRolls.push(p);
        t.currentWeightKg += roll.weight;
        didPlace = true;
        break;
      }
    }
    if (!didPlace) {
      const t = {
        truckNumber: trucks.length + 1,
        fleet,
        loadedRolls: [],
        currentWeightKg: 0,
        maxTonnageKg: fleet.max_tonnage_kg,
      };
      const p = placeRoll(roll, t, fleet);
      if (!p) {
        unplaced.push({
          ...roll,
          reason: "Tidak ditemukan penempatan yang valid",
        });
        continue;
      }
      t.loadedRolls.push(p);
      t.currentWeightKg += roll.weight;
      trucks.push(t);
    }
  }
  for (const t of trucks) {
    t.weightUtilizationPercent =
      (t.currentWeightKg / fleet.max_tonnage_kg) * 100;
    t.volumeUtilizationPercent =
      (t.loadedRolls.reduce(
        (s, r) => s + Math.PI * (r.diameter / 2) ** 2 * r.length,
        0,
      ) /
        (fleet.cargo_dimensions.max_length_m *
          fleet.cargo_dimensions.max_width_m *
          fleet.cargo_dimensions.max_height_m)) *
      100;
    t.tiers = {};
    for (const r of t.loadedRolls) (t.tiers[r.tier] ??= []).push(r);
  }
  return {
    fleet,
    trucks,
    unplaced,
    totalTrucksCount: trucks.length,
    success: unplaced.length === 0,
  };
}
export function optimizeCargoLoading(
  selectedItems,
  availableFleets,
  preferredFleetId = "AUTO",
  options = {},
) {
  const errors = [];
  let count = 0;
  if (!Array.isArray(selectedItems) || !selectedItems.length)
    errors.push("Tambahkan material untuk menghitung muatan.");
  for (const item of selectedItems || []) {
    errors.push(...validateMaterial(item));
    if (!Number.isInteger(item.quantity) || item.quantity < 1)
      errors.push(`${item.sku}: jumlah harus bilangan bulat positif.`);
    count += item.quantity;
  }
  if (count > 2000)
    errors.push(
      "Maksimal 2.000 roll per perhitungan. Pisahkan pengiriman menjadi beberapa rencana.",
    );
  if (!availableFleets?.length) errors.push("Database armada kosong.");
  else errors.push(...availableFleets.flatMap(validateFleet));
  if (
    preferredFleetId &&
    preferredFleetId !== "AUTO" &&
    !availableFleets.some((f) => f.fleet_id === preferredFleetId)
  )
    errors.push("Armada pilihan tidak ditemukan.");
  if (errors.length)
    return {
      success: false,
      status: "invalid",
      errors,
      message: errors.join(" "),
      trucks: [],
      unplaced: [],
      summary: null,
      candidates: [],
    };
  const rolls = selectedItems.flatMap((item, row) =>
    Array.from({ length: item.quantity }, (_, i) => ({
      id: `${row}-${item.sku}-${i}`,
      sku: item.sku,
      category: item.category,
      length: item.shipping_dimensions.cylinder_length_m,
      diameter: item.shipping_dimensions.cylinder_diameter_m,
      weight: item.weight_kg,
      stackable: item.logistics_rules.stackable,
      maxTier: item.logistics_rules.max_stack_tier,
      maxStackLoadKg: item.logistics_rules.max_stack_load_kg,
    })),
  );
  rolls.sort(
    (a, b) =>
      b.weight - a.weight || b.length - a.length || b.diameter - a.diameter,
  );
  const candidates = availableFleets.map((f) => {
    const orders = [
      rolls,
      [...rolls].sort(
        (a, b) =>
          b.length - a.length || b.diameter - a.diameter || b.weight - a.weight,
      ),
      [...rolls].sort(
        (a, b) =>
          b.diameter - a.diameter || b.length - a.length || b.weight - a.weight,
      ),
    ];
    const attempts = orders.map((order) => simulate(order, f));
    attempts.sort(
      (a, b) =>
        a.unplaced.length - b.unplaced.length ||
        a.totalTrucksCount - b.totalTrucksCount,
    );
    const r = attempts[0];
    const quoted = options.quoteCandidate?.(f, r.totalTrucksCount);
    return { ...r, estimatedCost: Number.isFinite(quoted) ? quoted : null };
  });
  const valid = candidates.filter((c) => c.success);
  const allPriced =
    valid.length > 0 && valid.every((c) => c.estimatedCost !== null);
  valid.sort(
    (a, b) =>
      (allPriced ? a.estimatedCost - b.estimatedCost : 0) ||
      a.totalTrucksCount - b.totalTrucksCount ||
      a.fleet.max_tonnage_kg - b.fleet.max_tonnage_kg,
  );
  const chosen =
    preferredFleetId && preferredFleetId !== "AUTO"
      ? candidates.find((c) => c.fleet.fleet_id === preferredFleetId)
      : valid[0] ||
        candidates
          .slice()
          .sort((a, b) => a.unplaced.length - b.unplaced.length)[0];
  const loaded = chosen.trucks.reduce((n, t) => n + t.loadedRolls.length, 0);
  return {
    ...chosen,
    targetFleet: chosen.fleet,
    status: chosen.success ? "complete" : "partial",
    message: chosen.success
      ? "Seluruh roll teralokasi dalam model perencanaan."
      : `${chosen.unplaced.length} roll belum dapat dimuat.`,
    candidates,
    errors: [],
    selectionBasis: allPriced
      ? "Biaya terendah di antara kandidat satu tipe armada"
      : "Jumlah perjalanan, lalu kapasitas nominal",
    summary: {
      totalRolls: rolls.length,
      loadedRolls: loaded,
      unplacedRolls: chosen.unplaced.length,
      totalWeightKg: rolls.reduce((s, r) => s + r.weight, 0),
      totalVolumeM3: selectedItems.reduce(
        (s, m) => s + rollVolume(m) * m.quantity,
        0,
      ),
      maxRollLength: Math.max(...rolls.map((r) => r.length)),
    },
  };
}
