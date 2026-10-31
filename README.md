# Multibangun LogiSynthetix v2

Ruang kerja perencanaan pengiriman geosintetik: material → armada & muatan → konfirmasi rute & biaya.

## Menjalankan

Gunakan Node.js 20.19+ atau 22+.

```sh
npm ci
npm test
npm run build
npm run preview
```

Buka `http://127.0.0.1:4173`. Untuk pengembangan dengan hot reload: `npm run dev`. `PORT=4174 npm run dev` memakai port lain. Konfigurasi Vite diimpor langsung oleh `scripts/run.mjs` untuk menghindari pemuatan ulang config melalui bundler pada filesystem desktop.

Vercel: preset Vite, build `npm run build`, output `dist`. Tidak memerlukan environment variable untuk kalkulasi, peta, atau riwayat lokal.

## Perubahan utama

- Validasi panjang, diameter, payload, pintu opsional, kuantitas, aturan tumpukan, dan batas beban atas opsional.
- Packing menggunakan envelope persegi di sekitar silinder dengan koordinat x/y/z; tiga urutan penempatan deterministik dibandingkan per tipe armada. Tidak ada toleransi penempatan di luar bak. Seluruh roll masuk ke hasil loaded atau unplaced; hasil parsial tidak dinyatakan lengkap.
- AUTO membandingkan jumlah perjalanan ketika belum ada rute. Setelah rute tersedia, AUTO membandingkan biaya seluruh kandidat yang lolos; tiap kandidat memakai satu tipe armada. Tidak mengklaim optimum global atau optimasi campuran tipe.
- Visualisasi atas/samping/belakang memakai ukuran dan posisi sebenarnya dalam model. Proyeksi dapat menutupi roll di belakangnya; daftar koordinat memuat semuanya.
- Pencarian alamat menampilkan kandidat Nominatim. Koordinat pin dan URL tempat Google Maps didukung. Pengguna mengonfirmasi pin sebelum OSRM menghitung geometri jalan. Perubahan input atau pin membatalkan request lama dan mengosongkan harga/rute lama.
- Kegagalan geocoding/routing ditampilkan sebagai kesalahan; tidak ada lokasi PIK 2 atau jarak Haversine yang disisipkan diam-diam.
- Shortlink Google Maps harus dibuka oleh pengguna lalu disalin sebagai koordinat/alamat lengkap. Aplikasi tidak mengirim link ke proxy publik.
- Biaya dihitung deterministik dengan mode all-in atau komponen. Total tepat menjumlah komponen aktif. Harga BBM, tol, pengemudi, tambahan, dan cakupan jarak mengikuti input pengguna.
- OCR Gemini tetap tersedia secara opt-in. API key hanya di memori dialog. Dokumen maksimum 10 MB. SKU tidak dikenali dan jumlah tidak valid harus ditinjau; tidak diganti dengan SKU/jumlah bawaan.
- Master material/armada dapat diedit dan ditambah; tersedia sumber/tanggal verifikasi. Riwayat menyimpan snapshot perhitungan, bukan referensi ke master yang bisa berubah. Ekspor JSON, salin teks WA, dan cetak/simpan PDF memakai snapshot yang sama.
- Tata letak responsif; pemeriksaan desktop 1280 px dan ponsel 390 px tidak menemukan overflow horizontal.

## Data dan batas pemakaian

Lima template material dan enam armada berasal dari versi sebelumnya. Ini bukan verifikasi payload kendaraan aktual atau tarif pasar terkini. Nama kategori kendaraan tidak cukup untuk menentukan batas operasional. Operator perlu memasukkan spesifikasi unit/vendor yang benar.

Model konservatif mengizinkan tumpukan hanya di atas satu footprint pendukung yang mencakup roll di atasnya, tidak lebih berat dari roll penyangga, dengan aturan tingkat minimum sepanjang rantai. Batas beban atas jika diisi diterapkan terhadap jumlah seluruh beban di atasnya. Batas yang kosong berarti belum diketahui, bukan sudah dinyatakan aman. Tumpukan memerlukan penyangga/pemisah. Model tidak memverifikasi kestabilan silinder, pengikat, kemampuan alas, titik berat atau beban sumbu. Tidak melakukan nesting/hexagonal packing, rotasi melintang, atau overhang. Maksimal 2.000 roll per rencana untuk membatasi pemrosesan browser.

Rute OSRM adalah rute kendaraan umum. Pembatasan truk, jam operasional, akses proyek dan ferry harus diperiksa operator. Nominatim/OSRM publik tidak memiliki jaminan layanan; pencarian hanya atas klik pengguna, bukan autocomplete setiap ketikan. Tile OSM/CARTO mencantumkan atribusi.

Tarif template belum terkonfirmasi. Mode komponen memerlukan tarif sewa yang tidak mencakup BBM/tol/pengemudi agar tidak menghitung ganda. Mode all-in berarti komponen tersebut termasuk paket; tambahan merupakan biaya di luar paket. Tol tidak ditebak dari jarak.

Database dan riwayat disimpan di localStorage (`mb_logisynthetix_v2`) pada browser/domain yang sama, tanpa sinkronisasi tim. Master v1 yang valid dapat dibaca pada kunjungan awal di domain lama. Riwayat v1 tidak ditampilkan sebagai perhitungan v2, tetapi tetap dipertahankan dan disertakan pada ekspor cadangan. API key v1 tidak dimigrasikan. Draf aktif belum memiliki autosave; simpan estimasi yang ingin dipertahankan. Impor JSON saat ini mengimpor master, bukan memulihkan seluruh riwayat.

## Pengujian

`npm test` menjalankan uji regresi Node terhadap packing, batas tumpukan/dukungan/pintu, konservasi roll, 51 perjalanan, pilihan biaya, rekonsiliasi pricing, parsing pin, geocoder kosong, dan kegagalan routing. Pengujian service menggunakan fetch tiruan; pemeriksaan browser terpisah berhasil mengambil rute OSRM nyata Bitung–koordinat Semarang (472,4 km pada waktu uji).

OCR berbayar tidak dipanggil selama pengujian karena tidak memakai API key/dokumen pelanggan. Hasil perhitungan bukan sertifikasi muatan atau penawaran vendor final.
