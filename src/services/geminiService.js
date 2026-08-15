import { FIXED_ORIGIN } from '../data/defaultDatabase';
import { estimateTollCost, PRICING_PARAMETERS } from '../data/pricingRules';

/**
 * Gemini Flash API Service (Google AI Studio)
 * Supports OCR / Vision Document Ingestion and AI Load & Price Calculation
 */

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

/**
 * Helper to call Gemini REST API
 */
async function callGeminiApi(apiKey, model, contents, systemInstruction = null) {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Google Gemini API Key belum dikonfigurasi. Silakan masukkan API Key di menu Pengaturan.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
  
  const body = {
    contents: contents,
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      responseMimeType: "application/json"
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error("Tidak ada respon konten dari Gemini Flash API.");
  }

  try {
    return JSON.parse(textOutput);
  } catch {
    // If not clean JSON, attempt substring extraction
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Respon Gemini tidak dapat diuraikan sebagai JSON.");
  }
}

/**
 * Extract Quotation Data from PDF or Image using Gemini Flash Vision
 */
export async function extractQuotationDocument(fileBase64, mimeType, availableSkus = [], apiKey = "") {
  if (!apiKey) {
    throw new Error("Silakan masukkan Google Gemini API Key di Pengaturan untuk menggunakan fitur OCR AI.");
  }

  const systemPrompt = `Anda adalah sistem OCR AI presisi tinggi untuk PT Multibangun Rekatama Patria (distributor & aplikator geosintetik di Indonesia).
Tugas Anda adalah membaca dokumen pesanan/quotation/purchase order/surat jalan dan mengekstrak informasi:
1. "company_name": Nama PT / Perusahaan / Instansi Pemesan
2. "project_name": Nama Proyek / Referensi Dokumen
3. "destination": Alamat atau Kota Pengiriman
4. "extracted_items": Array daftar material yang dipesan dengan format:
   - "matched_sku": SKU material yang paling cocok dari daftar database: ${availableSkus.map(s => s.sku).join(', ')}
   - "detected_name": Nama material asli yang tertulis di dokumen
   - "quantity": Jumlah roll / unit (integer)
   - "confidence": nilai 0.0 - 1.0

Format respon HARUS berupa JSON murni dengan schema:
{
  "company_name": "string",
  "project_name": "string",
  "destination": "string",
  "extracted_items": [
    {
      "matched_sku": "string",
      "detected_name": "string",
      "quantity": 10,
      "confidence": 0.95
    }
  ],
  "confidence_score": 0.95,
  "notes": "string"
}`;

  const contents = [
    {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: fileBase64
          }
        },
        {
          text: "Ekstrak nama PT pemesan, alamat pengiriman, dan seluruh daftar material geosintetik beserta kuantitasnya dari dokumen ini."
        }
      ]
    }
  ];

  // Try models in order
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const data = await callGeminiApi(apiKey, model, contents, systemPrompt);
      return data;
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying fallback:`, err);
    }
  }

  throw lastError || new Error("Gagal mengekstrak dokumen dengan Gemini Vision.");
}

/**
 * AI Calculation Engine for Load Optimization & Indonesian Price Estimation
 */
export async function calculateLogisticsWithGemini({
  companyName,
  destination,
  distanceKm,
  durationText,
  selectedItems,
  packingResult,
  selectedFleet,
  apiKey = ""
}) {
  const truckCount = packingResult?.totalTrucksCount || 1;
  const targetFleet = selectedFleet || packingResult?.targetFleet;
  const truckCategory = targetFleet?.truck_category || "Fuso Standar";

  // Deterministic calculation baseline (used as fallback or validation)
  const baseRatePerTruck = targetFleet?.base_rate || 2800000;
  const ratePerKm = targetFleet?.rate_per_km || 16500;
  const fuelKmPerLiter = targetFleet?.fuel_consumption_km_l || 4.0;
  
  const estimatedFuelLiters = Math.round((distanceKm / fuelKmPerLiter) * 10) / 10;
  const estimatedFuelCost = Math.round(estimatedFuelLiters * PRICING_PARAMETERS.fuel_price_per_liter) * truckCount;
  const estimatedTollCostSingle = estimateTollCost(distanceKm, truckCategory);
  const estimatedTollCostTotal = estimatedTollCostSingle * truckCount;
  const handlingCost = Math.round(packingResult.summary.totalRolls * PRICING_PARAMETERS.labor_handling_per_roll);
  const driverAllowance = Math.round(PRICING_PARAMETERS.driver_allowance_per_day * Math.max(1, Math.ceil(distanceKm / 400))) * truckCount;
  
  const distanceBasedRentalCost = Math.round(baseRatePerTruck + (distanceKm * ratePerKm)) * truckCount;
  const calculatedTotalCost = distanceBasedRentalCost + estimatedTollCostTotal + handlingCost;

  // Fallback structure if no API key
  const fallbackResult = {
    load_analysis: {
      total_trucks_required: truckCount,
      fleet_type: truckCategory,
      packing_summary: `Dibutuhkan ${truckCount} unit armada ${truckCategory} untuk memuat ${packingResult.summary.totalRolls} roll material dengan total berat ${packingResult.summary.totalWeightKg.toLocaleString('id-ID')} kg.`,
      distribution_strategy: packingResult.trucks.map((t, idx) => ({
        truck_index: idx + 1,
        weight_kg: t.currentWeightKg,
        weight_utilization: `${t.weightUtilizationPercent}%`,
        rolls_count: t.loadedRolls.length,
        notes: `Muatan aman dalam kapasitas ${t.maxTonnageKg.toLocaleString('id-ID')} kg.`
      })),
      securing_recommendations: [
        "Gunakan lashing ratchet strap minimal 5 ton di setiap tier roll.",
        "Pasang stopper balok kayu segitiga di sisi kiri & kanan roda bak agar roll tidak menggelinding.",
        "Tutup bak dengan terpal kedap air berlapis ganda (HDPE tarp) untuk melindungi dari cuaca."
      ]
    },
    cost_estimation: {
      currency: "IDR",
      truck_rental_base: distanceBasedRentalCost,
      estimated_fuel_cost: estimatedFuelCost,
      estimated_toll_cost: estimatedTollCostTotal,
      handling_labor_cost: handlingCost,
      driver_allowance: driverAllowance,
      total_estimated_cost: calculatedTotalCost,
      cost_per_roll: Math.round(calculatedTotalCost / (packingResult.summary.totalRolls || 1)),
      pricing_basis_explanation: `Perhitungan menggunakan tarif pasar logistik trucking Indonesia untuk rute Gudang Bitung Tangerang ke ${destination.name || destination.address} (${distanceKm} km, durasi ${durationText}). Termasuk komponen sewa unit ${truckCategory} (${truckCount}x), bahan bakar solar industri, estimasi tol, dan penanganan material geosintetik.`
    },
    ai_insights: `Kapasitas angkut optimal dengan utilisasi ${packingResult.trucks[0]?.weightUtilizationPercent || 80}%. Pengiriman langsung dari Hub Bitung Tangerang.`
  };

  if (!apiKey || apiKey.trim().length === 0) {
    return fallbackResult;
  }

  // Call Gemini Flash API with comprehensive payload
  const systemPrompt = `Anda adalah AI Chief Logistics & Supply Chain Estimator untuk PT Multibangun Rekatama Patria (Indonesia).
Anda menghitung estimasi penataan muatan (bin-packing geosintetik) dan harga riil pasar angkutan logistik truk di Indonesia.
Gunakan data jarak PASTI (${distanceKm} km) dan durasi perjalanan (${durationText}) dari Google Maps.
JANGAN MENGARANG JARAK. Gunakan titik asal tetap: Gudang PT Multibangun Rekatama Patria, Bitung, Tangerang.

Hitung secara rinci dan realistis:
1. Total armada yang dibutuhkan dan analisis distribusi tier roll.
2. Estimasi biaya pasar trucking Indonesia:
   - Biaya sewa armada per km & base rate untuk tipe armada ${truckCategory}
   - Estimasi BBM Solar Industri/Dexlite
   - Estimasi tarif Tol (misal Tol Tangerang-Merak, Tol Trans-Jawa, Cipularang, dsb.)
   - Biaya bongkar muat & driver allowance
   - Total estimasi biaya pengiriman dalam Rupiah (IDR).

Format output HARUS berupa JSON murni dengan skema:
{
  "load_analysis": {
    "total_trucks_required": ${truckCount},
    "fleet_type": "${truckCategory}",
    "packing_summary": "string",
    "distribution_strategy": [
      {
        "truck_index": 1,
        "weight_kg": 1000,
        "weight_utilization": "85%",
        "rolls_count": 10,
        "notes": "string"
      }
    ],
    "securing_recommendations": ["string", "string"]
  },
  "cost_estimation": {
    "currency": "IDR",
    "truck_rental_base": 0,
    "estimated_fuel_cost": 0,
    "estimated_toll_cost": 0,
    "handling_labor_cost": 0,
    "driver_allowance": 0,
    "total_estimated_cost": 0,
    "cost_per_roll": 0,
    "pricing_basis_explanation": "string"
  },
  "ai_insights": "string"
}`;

  const payloadPrompt = `Hitung optimasi muatan dan estimasi biaya logistik untuk:
- Klien: ${companyName || 'PT Pengguna Jasa'}
- Asal: ${FIXED_ORIGIN.name}, ${FIXED_ORIGIN.short_address}
- Tujuan: ${destination.name || destination.address}
- Jarak Tempuh Google Maps: ${distanceKm} km
- Estimasi Waktu Tempuh: ${durationText}
- Jenis Truk Terpilih: ${truckCategory} (Kapasitas: ${targetFleet?.max_tonnage_kg} kg, Dimensi: ${targetFleet?.cargo_dimensions?.max_length_m}m x ${targetFleet?.cargo_dimensions?.max_width_m}m x ${targetFleet?.cargo_dimensions?.max_height_m}m)
- Total Roll: ${packingResult.summary.totalRolls} roll
- Total Berat Kotor: ${packingResult.summary.totalWeightKg} kg
- Rincian Material:
${selectedItems.map(item => `  * ${item.sku} (${item.category} ${item.specification}): ${item.quantity} roll @ ${item.weight_kg}kg, P=${item.shipping_dimensions?.cylinder_length_m}m, D=${item.shipping_dimensions?.cylinder_diameter_m}m, Max Tier=${item.logistics_rules?.max_stack_tier}`).join('\n')}`;

  const contents = [
    {
      parts: [{ text: payloadPrompt }]
    }
  ];

  for (const model of GEMINI_MODELS) {
    try {
      const aiData = await callGeminiApi(apiKey, model, contents, systemPrompt);
      // Ensure required numeric fields exist
      if (aiData?.cost_estimation?.total_estimated_cost > 0) {
        return aiData;
      }
    } catch (err) {
      console.warn(`Gemini pricing calculation with ${model} failed, fallback to deterministic:`, err);
    }
  }

  return fallbackResult;
}
