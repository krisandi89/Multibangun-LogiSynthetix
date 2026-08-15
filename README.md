# Multibangun LogiSynthetix 🚛🏗️

**Multibangun LogiSynthetix** adalah aplikasi web logistik canggih yang dirancang khusus untuk **PT Multibangun Rekatama Patria** guna menghitung optimasi muatan (*3D cylinder roll bin-packing*), estimasi biaya logistik trucking di Indonesia, integrasi rute Google Maps API, dan ekstraksi otomatis dokumen penawaran via **Gemini Flash Vision OCR**.

---

## 🌟 Fitur Utama

1. **Dual Input & AI Document OCR**:
   - Input manual data klien.
   - Upload dokumen penawaran/PO (PDF / Gambar) dengan ekstraksi otomatis nama PT, lokasi, dan daftar material via **Gemini Flash Vision**.
2. **Logistics & Routing Module (Fixed Hub Bitung)**:
   - Titik awal permanen (*Fixed Origin*): `Gudang PT Multibangun Rekatama Patria, Bitung, Tangerang`.
   - Menghitung jarak tempuh riil $(\text{km})$ dan durasi perjalanan via Google Maps Distance Matrix & OSRM Engine dengan peta interaktif Leaflet.
3. **Master Database Studio (Editable)**:
   - Terhubung langsung dengan `Database JSON Lengkap (Material & Truk).json`.
   - Mengubah spesifikasi material (panjang roll, diameter, berat, tier) & armada truk (CDE, CDD, Fuso, Tronton, Container 20ft & 40ft).
   - Ekspor/Impor file JSON master database.
4. **3D/2D Visual Bin-Packing Engine**:
   - Perhitungan matematis batas dimensi bak, batas tonase, dan tier tumpukan silinder roll geosintetik.
   - Diagram visual tampak samping (*side elevation*) dan tampak belakang (*rear cross-section*).
   - Pembagian multi-truk otomatis jika kapasitas melebihi 1 unit.
5. **AI Indonesian Logistics Pricing Engine**:
   - Perhitungan harga riil pasar angkutan truk: Sewa Unit, BBM Solar Industri, Tarif Tol Trans-Jawa/Jabodetabek, Biaya Bongkar Muat, dan Uang Jalan Driver.
6. **Official Quotation Slip & History**:
   - Preview surat penawaran resmi ber-kop PT Multibangun Rekatama Patria siap print / PDF.
   - Database riwayat proyek lokal yang dapat dicari dan diekspor.

---

## 🚀 Menjalankan Secara Lokal

```bash
# Install dependencies
npm install

# Jalankan server pengembangan lokal
npm run dev

# Build untuk produksi
npm run build
```

---

## ☁️ Deploy ke Vercel

Aplikasi ini sudah dilengkapi dengan konfigurasi `vercel.json` dan siap di-deploy langsung ke [Vercel](https://vercel.com).
Tinggal hubungkan repositori GitHub ini ke Vercel dashboard.

---

## 📄 Lisensi & Hak Cipta
Dibuat untuk **PT Multibangun Rekatama Patria**.
