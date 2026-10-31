import test from "node:test";
import assert from "node:assert/strict";
import {
  optimizeCargoLoading as pack,
  validateDatabase,
} from "../src/services/packingOptimizer.js";
import { DEFAULT_DATABASE as db } from "../src/data/defaultDatabase.js";
import {
  calculatePrice,
  DEFAULT_PRICING,
} from "../src/services/pricingEngine.js";
import {
  parseDestinationInput,
  searchDestinations,
  calculateRoute,
} from "../src/services/distanceService.js";
const fleet = {
  fleet_id: "TEST",
  truck_category: "Test",
  cargo_dimensions: { max_length_m: 4, max_width_m: 2, max_height_m: 2 },
  max_tonnage_kg: 1000,
  base_rate: 100,
  rate_per_km: 10,
  fuel_consumption_km_l: 5,
};
const item = (patch = {}) => ({
  sku: "ROLL",
  category: "Test",
  shipping_dimensions: { cylinder_length_m: 4, cylinder_diameter_m: 1 },
  weight_kg: 100,
  quantity: 1,
  logistics_rules: { stackable: true, max_stack_tier: 5 },
  ...patch,
});
function assertPlan(result, requested) {
  assert.equal(
    result.summary.loadedRolls + result.summary.unplacedRolls,
    requested,
  );
  const ids = result.trucks.flatMap((t) => t.loadedRolls.map((r) => r.id));
  assert.equal(ids.length, new Set(ids).size);
  for (const t of result.trucks) {
    assert.ok(t.currentWeightKg <= t.fleet.max_tonnage_kg + 1e-6);
    const d = t.fleet.cargo_dimensions;
    for (const r of t.loadedRolls) {
      assert.ok(r.x >= 0 && r.y >= 0 && r.z >= 0);
      assert.ok(r.x + r.length <= d.max_length_m + 1e-6);
      assert.ok(r.y + r.diameter <= d.max_width_m + 1e-6);
      assert.ok(r.z + r.diameter <= d.max_height_m + 1e-6);
      if (!r.stackable) assert.equal(r.z, 0);
      if (r.z > 0) {
        const s = t.loadedRolls.find((s) => s.id === r.supportId);
        assert.ok(s);
        assert.ok(s.stackable);
        assert.ok(Math.abs(r.z - s.z - s.diameter) < 1e-6);
        assert.ok(r.tier <= r.stackLimit);
      }
    }
    for (let i = 0; i < t.loadedRolls.length; i++)
      for (let j = i + 1; j < t.loadedRolls.length; j++) {
        const a = t.loadedRolls[i],
          b = t.loadedRolls[j],
          e = 1e-6;
        assert.ok(
          !(
            a.x < b.x + b.length - e &&
            a.x + a.length > b.x + e &&
            a.y < b.y + b.diameter - e &&
            a.y + a.diameter > b.y + e &&
            a.z < b.z + b.diameter - e &&
            a.z + a.diameter > b.z + e
          ),
          "envelopes must not intersect",
        );
      }
  }
}
test("oversized diameter rejected; no phantom truck", () => {
  const r = pack(
    [
      item({
        shipping_dimensions: { cylinder_length_m: 4, cylinder_diameter_m: 3 },
      }),
    ],
    [fleet],
  );
  assert.equal(r.success, false);
  assert.equal(r.trucks.length, 0);
  assertPlan(r, 1);
});
test("non-stackable rolls stay on floor and require two trips", () => {
  const r = pack(
    [
      item({
        quantity: 4,
        logistics_rules: { stackable: false, max_stack_tier: 5 },
      }),
    ],
    [fleet],
  );
  assert.equal(r.success, true);
  assert.equal(r.totalTrucksCount, 2);
  assertPlan(r, 4);
});
test("single overweight roll rejected", () => {
  const r = pack([item({ weight_kg: 1500 })], [fleet]);
  assert.equal(r.success, false);
  assert.equal(r.summary.loadedRolls, 0);
  assertPlan(r, 1);
});
test("51 trips all counted without truncation", () => {
  const r = pack([item({ weight_kg: 1000, quantity: 51 })], [fleet]);
  assert.equal(r.success, true);
  assert.equal(r.trucks.length, 51);
  assertPlan(r, 51);
});
test("mixed diameters cannot exceed width or cumulative height", () => {
  const r = pack(
    [
      item({ quantity: 5 }),
      item({
        sku: "SMALL",
        weight_kg: 50,
        quantity: 12,
        shipping_dimensions: { cylinder_length_m: 2, cylinder_diameter_m: 0.6 },
      }),
    ],
    [fleet],
  );
  assert.equal(r.success, true);
  assertPlan(r, 17);
});
test("max-stack rule on supporting rolls is respected", () => {
  const r = pack(
    [
      item({
        quantity: 6,
        logistics_rules: { stackable: true, max_stack_tier: 1 },
      }),
    ],
    [fleet],
  );
  assert.equal(r.totalTrucksCount, 3);
  assert.ok(r.trucks.every((t) => t.loadedRolls.every((r) => r.tier === 1)));
});
test("support load rating limits cumulative upper mass", () => {
  const f = {
    ...fleet,
    cargo_dimensions: { max_length_m: 4, max_width_m: 1, max_height_m: 5 },
  };
  const r = pack(
    [
      item({
        quantity: 4,
        logistics_rules: {
          stackable: true,
          max_stack_tier: 5,
          max_stack_load_kg: 150,
        },
      }),
    ],
    [f],
  );
  assert.equal(r.totalTrucksCount, 2);
  assertPlan(r, 4);
});
test("door dimension constrains cylinders", () => {
  const r = pack([item()], [{ ...fleet, door_width_m: 0.8 }]);
  assert.equal(r.success, false);
  assert.match(r.unplaced[0].reason, /pintu/);
});
test("invalid quantities and huge batches do not fabricate defaults", () => {
  for (const quantity of [0, -1, 1.5, "", NaN, 2001]) {
    const r = pack([item({ quantity })], [fleet]);
    assert.equal(r.status, "invalid");
    assert.equal(r.success, false);
  }
});
test("invalid data and unknown preferred fleet fail explicitly", () => {
  assert.equal(pack([item({ weight_kg: 0 })], [fleet]).status, "invalid");
  assert.equal(pack([item()], [fleet], "MISSING").status, "invalid");
  assert.ok(
    validateDatabase({
      geosynthetics: [item(), item()],
      logistics_fleet: [fleet],
    }).length,
  );
});
test("default materials preserve totals and all positions", () => {
  const rows = [
    { ...db.geosynthetics[0], quantity: 6 },
    { ...db.geosynthetics[2], quantity: 8 },
    { ...db.geosynthetics[4], quantity: 8 },
  ];
  const r = pack(rows, db.logistics_fleet);
  assert.equal(r.summary.totalWeightKg, 10100);
  assert.equal(r.success, true);
  assertPlan(r, 22);
});
test("AUTO compares full trip cost, not smallest tonnage", () => {
  const small = {
    ...fleet,
    fleet_id: "SMALL",
    max_tonnage_kg: 200,
    base_rate: 10000,
  };
  const big = { ...fleet, fleet_id: "BIG", base_rate: 100 };
  const r = pack([item({ quantity: 3 })], [small, big], "AUTO", {
    quoteCandidate: (f, n) => calculatePrice(f, n, 100, DEFAULT_PRICING).total,
  });
  assert.equal(r.targetFleet.fleet_id, "BIG");
});
test("all-in components sum exactly; toll is not double counted", () => {
  const p = calculatePrice(fleet, 2, 100, {
    ...DEFAULT_PRICING,
    tollPerTrip: 500,
    otherPerTrip: 25,
  });
  assert.equal(p.total, 2250);
  assert.equal(
    p.total,
    p.lines.reduce((s, l) => s + l.amount, 0),
  );
  assert.equal(p.lines.length, 2);
});
test("component settings change fuel, toll and total deterministically", () => {
  const s = {
    ...DEFAULT_PRICING,
    mode: "components",
    fuelPrice: 10,
    tollPerTrip: 50,
    driverPerTrip: 30,
    otherPerTrip: 20,
  };
  const p = calculatePrice(fleet, 2, 100, s);
  assert.equal(p.total, 2800);
  assert.equal(
    calculatePrice(fleet, 2, 100, { ...s, fuelPrice: 20 }).total - p.total,
    400,
  );
  assert.equal(
    p.total,
    p.lines.reduce((s, l) => s + l.amount, 0),
  );
});
test("missing/negative pricing inputs rejected", () => {
  assert.equal(
    calculatePrice(fleet, 1, 100, { mode: "components", fuelPrice: null })
      .valid,
    false,
  );
  assert.equal(calculatePrice(fleet, 1, -1, {}).valid, false);
});
test("pin data takes priority over map viewport", () => {
  const p = parseDestinationInput(
    "https://www.google.com/maps/place/Test/@-6.1,106.1,12z/data=!3d-6.2!4d106.2",
  );
  assert.equal(p.lat, -6.2);
  assert.equal(p.lng, 106.2);
});
test("coordinates and URL encoded coordinates accepted, invalid ranges rejected", () => {
  assert.equal(parseDestinationInput("-6,106").lat, -6);
  assert.equal(
    parseDestinationInput("https://www.google.com/maps?query=-6.2%2C106.2").lng,
    106.2,
  );
  assert.throws(() => parseDestinationInput("91,106"));
});
test("short links and viewport-only URLs fail with actionable message", () => {
  assert.throws(
    () => parseDestinationInput("https://maps.app.goo.gl/abc"),
    /tautan pendek/,
  );
  assert.throws(
    () => parseDestinationInput("https://www.google.com/maps/@-6.1,106.1,12z"),
    /pusat tampilan/,
  );
});
test("geocoder empty result never substitutes PIK 2", async () => {
  const old = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => [] });
  try {
    await assert.rejects(
      searchDestinations("LOKASI-TIDAK-ADA"),
      /tidak ditemukan/,
    );
  } finally {
    global.fetch = old;
  }
});
test("specific street reaches geocoder unmodified instead of city preset", async () => {
  const old = global.fetch;
  let called;
  global.fetch = async (url) => {
    called = url;
    return {
      ok: true,
      json: async () => [
        {
          lat: "-6.8",
          lon: "110.3",
          name: "Jalan Contoh",
          display_name: "Jalan Contoh, Semarang",
        },
      ],
    };
  };
  try {
    const r = await searchDestinations("Jalan Contoh No 99, Semarang");
    assert.match(decodeURIComponent(called), /Jalan Contoh No 99, Semarang/);
    assert.equal(r[0].lat, -6.8);
  } finally {
    global.fetch = old;
  }
});
test("routing failure cannot create a fabricated distance", async () => {
  const old = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ code: "NoRoute", routes: [] }),
  });
  try {
    await assert.rejects(
      calculateRoute({ lat: -6, lng: 106 }),
      /tidak ditemukan/,
    );
  } finally {
    global.fetch = old;
  }
});
test("routing retains actual geometry and distance", async () => {
  const old = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      code: "Ok",
      routes: [
        {
          distance: 12345,
          duration: 3600,
          geometry: {
            coordinates: [
              [106, -6],
              [107, -7],
            ],
          },
        },
      ],
    }),
  });
  try {
    const r = await calculateRoute({ lat: -7, lng: 107, name: "Test" });
    assert.equal(r.distanceKm, 12.3);
    assert.deepEqual(r.routePoints, [
      [-6, 106],
      [-7, 107],
    ]);
    assert.equal(r.truckAccessVerified, false);
  } finally {
    global.fetch = old;
  }
});
test("deterministic varied mixtures conserve rolls and stay in bounds", () => {
  for (let seed = 1; seed <= 15; seed++) {
    const rows = [
      item({
        quantity: (seed % 7) + 1,
        weight_kg: 50 + seed * 3,
        shipping_dimensions: {
          cylinder_length_m: (seed % 3) + 1,
          cylinder_diameter_m: 0.3 + (seed % 4) * 0.2,
        },
      }),
      item({
        sku: "B",
        quantity: (seed % 5) + 1,
        weight_kg: 75,
        shipping_dimensions: {
          cylinder_length_m: 2,
          cylinder_diameter_m: 0.55,
        },
      }),
    ];
    const r = pack(rows, [fleet]);
    assert.equal(r.success, true);
    assertPlan(
      r,
      rows.reduce((s, m) => s + m.quantity, 0),
    );
  }
});

test("all-in does not require fuel input; overflow is rejected", () => {
  assert.equal(calculatePrice(fleet, 1, 100, { fuelPrice: null }).valid, true);
  assert.equal(
    calculatePrice({ ...fleet, base_rate: 1e308 }, 2, 100, {}).valid,
    false,
  );
});
