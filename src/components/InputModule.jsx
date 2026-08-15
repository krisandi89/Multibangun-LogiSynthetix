import React, { useState, useRef } from 'react';
import { FileUp, Building2, Sparkles, CheckCircle2, AlertCircle, Loader2, FileText, X } from 'lucide-react';
import { extractQuotationDocument } from '../services/geminiService';

export function InputModule({
  companyName,
  setCompanyName,
  projectName,
  setProjectName,
  notes,
  setNotes,
  onOcrExtracted,
  availableSkus = [],
  apiKey = ""
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrError, setOcrError] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileProcess = async (file) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setOcrLoading(true);
    setOcrError(null);
    setOcrResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result.split(',')[1];
          const mimeType = file.type || 'image/jpeg';
          
          const result = await extractQuotationDocument(base64Data, mimeType, availableSkus, apiKey);
          setOcrResult(result);
          
          // Auto-fill form fields
          if (result.company_name) setCompanyName(result.company_name);
          if (result.project_name) setProjectName(result.project_name);
          if (result.notes) setNotes(result.notes);
          
          if (onOcrExtracted) {
            onOcrExtracted(result);
          }
        } catch (err) {
          console.error("OCR process error:", err);
          setOcrError(err.message || "Gagal memproses dokumen.");
        } finally {
          setOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setOcrError("Gagal membaca file.");
      setOcrLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <Building2 size={18} color="var(--accent-cyan)" />
            <span>1. Data Klien & Ingest Dokumen (OCR)</span>
          </div>
          <div className="panel-subtitle">
            Input manual nama PT atau unggah file quotation/PO (PDF / Gambar)
          </div>
        </div>
        <span className="badge badge-cyan">
          <Sparkles size={12} /> Gemini Flash Vision
        </span>
      </div>

      {/* Dual Input: Manual form + Drag & Drop OCR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
        {/* Left: Manual Entry Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="form-group">
            <label className="form-label">
              <span>Nama PT / Perusahaan Pemesan <span style={{ color: 'var(--accent-rose)' }}>*</span></span>
              {companyName && <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Terisi</span>}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="cth: PT Waskita Karya (Persero) Tbk"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">No. Proyek / Ref PO (Opsional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="cth: PO-MB-2026-081"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="cth: Proyek Bendungan, butuh pengiriman bertahap"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Right: Document Upload Dropzone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="form-label">
            <span>Scan Dokumen PO / Penawaran</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PDF, JPG, PNG</span>
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".pdf,image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
          />

          <div
            className={`dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ height: '100%', minHeight: '135px' }}
          >
            {ocrLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={28} color="var(--accent-cyan)" className="pulsing-glow" style={{ animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: '0.825rem', fontWeight: '600', color: 'var(--accent-cyan)' }}>
                  Menganalisis Dokumen via Gemini AI...
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Mengekstrak PT, Alamat, & Material
                </div>
              </div>
            ) : uploadedFileName ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <FileText size={24} color="var(--accent-emerald)" />
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', wordBreak: 'break-all', maxWidth: '200px' }}>
                  {uploadedFileName}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                  Klik untuk ganti file
                </div>
              </div>
            ) : (
              <>
                <FileUp size={24} color="var(--accent-cyan)" />
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Drop Dokumen atau Klik Upload
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    Auto-fill Form & Material dari Dokumen
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* OCR Status Banner */}
      {ocrResult && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={16} color="var(--accent-emerald)" />
            <span style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
              <strong>OCR Berhasil!</strong> Ditemukan <strong>{ocrResult.extracted_items?.length || 0} material</strong> untuk <em>{ocrResult.company_name || 'Klien'}</em>.
            </span>
          </div>
          <button 
            className="btn btn-sm btn-secondary" 
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
            onClick={() => setOcrResult(null)}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {ocrError && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={15} color="var(--accent-rose)" />
          <span style={{ fontSize: '0.775rem', color: '#fecdd3' }}>
            {ocrError}
          </span>
        </div>
      )}
    </div>
  );
}
