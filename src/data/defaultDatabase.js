/**
 * Master Database for Multibangun LogiSynthetix
 * Legacy material and vehicle templates; verify actual specifications and vendor rates.
 */

export const DEFAULT_DATABASE = {
  geosynthetics: [
    {
      sku: "GM-HDPE-10-7M",
      category: "Geomembrane",
      specification: "HDPE 1.0mm",
      physical_form: "Cylinder",
      shipping_dimensions: {
        cylinder_length_m: 7.0,
        cylinder_diameter_m: 0.65,
      },
      weight_kg: 1350,
      logistics_rules: {
        stackable: true,
        max_stack_tier: 3,
      },
    },
    {
      sku: "GM-HDPE-10-4M",
      category: "Geomembrane",
      specification: "HDPE 1.0mm",
      physical_form: "Cylinder",
      shipping_dimensions: {
        cylinder_length_m: 4.0,
        cylinder_diameter_m: 0.65,
      },
      weight_kg: 775,
      logistics_rules: {
        stackable: true,
        max_stack_tier: 3,
      },
    },
    {
      sku: "GTX-NW-250-4M",
      category: "Geotextile Non-Woven",
      specification: "250 gram",
      physical_form: "Cylinder",
      shipping_dimensions: {
        cylinder_length_m: 4.0,
        cylinder_diameter_m: 0.55,
      },
      weight_kg: 100,
      logistics_rules: {
        stackable: true,
        max_stack_tier: 5,
      },
    },
    {
      sku: "GGR-BX-40-4M",
      category: "Geogrid Biaxial",
      specification: "40/40 kN",
      physical_form: "Cylinder",
      shipping_dimensions: {
        cylinder_length_m: 4.0,
        cylinder_diameter_m: 0.45,
      },
      weight_kg: 70,
      logistics_rules: {
        stackable: true,
        max_stack_tier: 6,
      },
    },
    {
      sku: "GM-LDPE-05-2M",
      category: "Geomembrane",
      specification: "LDPE 0.5mm",
      physical_form: "Cylinder",
      shipping_dimensions: {
        cylinder_length_m: 2.0,
        cylinder_diameter_m: 0.4,
      },
      weight_kg: 150,
      logistics_rules: {
        stackable: true,
        max_stack_tier: 5,
      },
    },
  ],
  logistics_fleet: [
    {
      fleet_id: "TRK-CDE",
      truck_category: "Colt Diesel Engkel (CDE)",
      cargo_dimensions: {
        max_length_m: 3.1,
        max_width_m: 1.6,
        max_height_m: 1.6,
      },
      max_tonnage_kg: 2500,
      rate_per_km: 4200,
      base_rate: 550000,
      fuel_consumption_km_l: 7.5,
    },
    {
      fleet_id: "TRK-CDD",
      truck_category: "Colt Diesel Double (CDD)",
      cargo_dimensions: {
        max_length_m: 4.2,
        max_width_m: 2.0,
        max_height_m: 1.9,
      },
      max_tonnage_kg: 4000,
      rate_per_km: 6200,
      base_rate: 850000,
      fuel_consumption_km_l: 6.0,
    },
    {
      fleet_id: "TRK-FUSO",
      truck_category: "Fuso Standar",
      cargo_dimensions: {
        max_length_m: 7.5,
        max_width_m: 2.4,
        max_height_m: 2.3,
      },
      max_tonnage_kg: 15000,
      rate_per_km: 9500,
      base_rate: 1500000,
      fuel_consumption_km_l: 4.0,
    },
    {
      fleet_id: "TRK-TRONTON",
      truck_category: "Tronton",
      cargo_dimensions: {
        max_length_m: 9.5,
        max_width_m: 2.4,
        max_height_m: 2.3,
      },
      max_tonnage_kg: 25000,
      rate_per_km: 13500,
      base_rate: 2200000,
      fuel_consumption_km_l: 3.0,
    },
    {
      fleet_id: "CNT-20FT",
      truck_category: "Container 20 Feet",
      cargo_dimensions: {
        max_length_m: 5.9,
        max_width_m: 2.35,
        max_height_m: 2.39,
      },
      max_tonnage_kg: 22000,
      rate_per_km: 13000,
      base_rate: 2000000,
      fuel_consumption_km_l: 3.2,
    },
    {
      fleet_id: "CNT-40FT",
      truck_category: "Container 40 Feet",
      cargo_dimensions: {
        max_length_m: 12.0,
        max_width_m: 2.35,
        max_height_m: 2.39,
      },
      max_tonnage_kg: 29000,
      rate_per_km: 16500,
      base_rate: 2800000,
      fuel_consumption_km_l: 2.5,
    },
  ],
};

export const FIXED_ORIGIN = {
  name: "Gudang PT Multibangun Rekatama Patria",
  address:
    "Kawasan Industri & Pergudangan Bitung, Jl. Raya Serang Km. 13.8, Bitung Jaya, Kec. Cikupa, Kabupaten Tangerang, Banten 15710",
  short_address: "Bitung, Tangerang, Banten",
  lat: -6.23072,
  lng: 106.53695,
  maps_url: "https://maps.app.goo.gl/wbL16QDUiMmbe7aC6",
};
