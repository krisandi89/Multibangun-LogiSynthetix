/**
 * Gemini Flash API Service (Google AI Studio)
 * Supports OCR / Vision Document Ingestion and AI Load & Price Calculation
 */

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

/**
 * Helper to call Gemini REST API
 */
async function callGeminiApi(
  apiKey,
  model,
  contents,
  systemInstruction = null,
) {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "Google Gemini API Key belum dikonfigurasi. Silakan masukkan API Key di menu Pengaturan.",
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

  const body = {
    contents: contents,
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      responseMimeType: "application/json",
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
export async function extractQuotationDocument(
  fileBase64,
  mimeType,
  availableSkus = [],
  apiKey = "",
) {
  if (!apiKey) {
    throw new Error(
      "Silakan masukkan Google Gemini API Key di Pengaturan untuk menggunakan fitur OCR AI.",
    );
  }

  const systemPrompt = `Anda adalah sistem OCR AI presisi tinggi untuk PT Multibangun Rekatama Patria (distributor & aplikator geosintetik di Indonesia).
Tugas Anda adalah membaca dokumen pesanan/quotation/purchase order/surat jalan dan mengekstrak informasi:
1. "company_name": Nama PT / Perusahaan / Instansi Pemesan
2. "project_name": Nama Proyek / Referensi Dokumen
3. "destination": Alamat atau Kota Pengiriman
4. "extracted_items": Array daftar material yang dipesan dengan format:
   - "matched_sku": SKU material yang paling cocok dari daftar database: ${availableSkus.map((s) => s.sku).join(", ")}
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
            data: fileBase64,
          },
        },
        {
          text: "Ekstrak nama PT pemesan, alamat pengiriman, dan seluruh daftar material geosintetik beserta kuantitasnya dari dokumen ini.",
        },
      ],
    },
  ];

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

  throw (
    lastError || new Error("Gagal mengekstrak dokumen dengan Gemini Vision.")
  );
}
