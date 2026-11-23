import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';

export function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('2026-11');
  const [posyanduId, setPosyanduId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('az');
  const [organizations, setOrganizations] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    apiRequest('/organizations')
      .then((orgs) => {
        setOrganizations((orgs || []).filter((o) => o.type === 'posyandu' && o.is_active));
      })
      .catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ period });
      if (posyanduId) params.set('posyanduId', posyanduId);
      const data = await apiRequest(`/reports/aggregate?${params.toString()}`);
      setReport(data);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat laporan agregat.');
    } finally {
      setLoading(false);
    }
  }, [period, posyanduId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ period });
      if (posyanduId) params.set('posyanduId', posyanduId);
      const res = await fetch(`/api/v1/reports/export-csv?${params.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Gagal mengunduh file CSV.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tumbuhpantau-agregat-${period}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h5 fw-bold text-dark mb-1">Laporan Agregat & Ekspor CSV</h2>
          <p className="small text-secondary mb-0">
            Data rekapitulasi bulanan teranonimisasi tanpa NIK/data sensitif (standar UTF-8) siap
            dibuka di aplikasi spreadsheet.
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {user?.role !== 'kader' && (
            <select
              className="form-select form-select-sm rounded-3"
              style={{ width: '215px', minHeight: '38px' }}
              value={posyanduId}
              onChange={(e) => setPosyanduId(e.target.value)}
              aria-label="Filter Posyandu Laporan"
            >
              <option value="">Semua Unit Posyandu</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </select>
          )}

          <select
            className="form-select form-select-sm font-mono-num rounded-3"
            style={{ width: '135px', minHeight: '38px' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Pilih Periode Laporan"
          >
            <option value="2026-11">2026-11</option>
            <option value="2026-10">2026-10</option>
            <option value="2026-09">2026-09</option>
          </select>

          <button
            type="button"
            className="btn btn-tp-primary"
            onClick={handleDownloadCsv}
            disabled={downloading || loading}
          >
            <Icon name="download" size={16} />
            <span>{downloading ? 'Menyiapkan CSV...' : 'Unduh CSV Agregat'}</span>
          </button>
        </div>
      </div>

      {errorMsg && <div className="alert alert-danger py-2 small rounded-3">{errorMsg}</div>}

      <div className="tp-filter-bar">
        <div className="row g-2 align-items-center">
          <div className="col-md-7">
            <div className="tp-input-icon-group">
              <span className="tp-input-icon-left">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="form-control form-control-sm tp-input-with-icon"
                style={{ minHeight: '38px' }}
                placeholder="Cari nama Posyandu atau kode organisasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari unit di laporan"
              />
            </div>
          </div>

          <div className="col-md-5">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Urutkan Laporan"
            >
              <option value="az">Urutkan: Abjad Nama Posyandu (A - Z)</option>
              <option value="za">Urutkan: Abjad Nama Posyandu (Z - A)</option>
              <option value="active_desc">Urutkan: Balita Aktif Terbanyak</option>
              <option value="measured_desc">Urutkan: Terukur Lengkap Terbanyak</option>
            </select>
          </div>
        </div>
      </div>

      {report?.isMaskedForDinas && (
        <div className="alert alert-info py-2 px-3 small mb-0 rounded-3 d-flex align-items-center gap-2">
          <Icon name="check-shield" size={17} />
          <span>
            <strong>Penyamaran Privasi Dinas Kesehatan Aktif:</strong> Sel kategori sensitif bernilai{' '}
            <code>1</code> s.d. <code>4</code> ditampilkan sebagai <code>&lt;5</code>.
          </span>
        </div>
      )}

      <div className="tp-card p-0 overflow-hidden">
        {loading || !report ? (
          <div className="text-center py-5 small text-secondary">
            Memuat tabel laporan agregat...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table tp-table">
              <thead>
                <tr>
                  <th>Unit Posyandu</th>
                  <th className="text-center">Balita Aktif</th>
                  <th style={{ minWidth: '185px' }}>Cakupan Ukur</th>
                  <th>Ringkasan Status Pertumbuhan</th>
                  <th className="text-center">Perlu Review</th>
                  <th className="text-center">Tindak Lanjut (Aktif / Selesai)</th>
                  <th className="text-center">Disamarkan</th>
                </tr>
              </thead>
              <tbody>
                {report.rows
                  .filter((r) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      (r.nama_organisasi || '').toLowerCase().includes(q) ||
                      (r.kode_organisasi || '').toLowerCase().includes(q)
                    );
                  })
                  .sort((a, b) => {
                    if (sortBy === 'za') {
                      return (b.nama_organisasi || '').localeCompare(a.nama_organisasi || '', 'id');
                    }
                    if (sortBy === 'active_desc') {
                      return Number(b.total_anak_aktif || 0) - Number(a.total_anak_aktif || 0);
                    }
                    if (sortBy === 'measured_desc') {
                      return Number(b.jumlah_diukur_lengkap || 0) - Number(a.jumlah_diukur_lengkap || 0);
                    }
                    return (a.nama_organisasi || '').localeCompare(b.nama_organisasi || '', 'id');
                  })
                  .map((r) => {
                  const totalActive = Number(r.total_anak_aktif) || 0;
                  const measured = Number(r.jumlah_diukur_lengkap) || 0;
                  const pct = totalActive > 0 ? Math.round((measured / totalActive) * 100) : 0;

                  return (
                    <tr key={r.kode_organisasi}>
                      <td>
                        <div className="fw-bold text-dark">{r.nama_organisasi}</div>
                        <div className="small text-secondary font-mono-num">
                          {r.kode_organisasi} &middot; Periode {r.periode}
                        </div>
                      </td>
                      <td className="text-center font-mono-num fw-bold">{r.total_anak_aktif}</td>
                      <td>
                        <div className="d-flex justify-content-between small mb-1 font-mono-num">
                          <span className="fw-semibold">
                            {r.jumlah_diukur_lengkap} / {r.total_anak_aktif}
                          </span>
                          <span className="text-secondary">{pct}%</span>
                        </div>
                        <div className="tp-progress">
                          <div className="tp-progress-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <span className="tp-badge tp-badge-red font-mono-num">
                            SP: {r.kategori_sangat_pendek}
                          </span>
                          <span className="tp-badge tp-badge-amber font-mono-num">
                            P: {r.kategori_pendek}
                          </span>
                          <span className="tp-badge tp-badge-green font-mono-num">
                            N: {r.kategori_normal}
                          </span>
                          <span className="tp-badge tp-badge-blue font-mono-num">
                            T: {r.kategori_tinggi}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="tp-badge tp-badge-amber font-mono-num">
                          {r.perlu_peninjauan}
                        </span>
                      </td>
                      <td className="text-center font-mono-num">
                        <span className="tp-badge tp-badge-blue me-1">
                          Aktif: {r.tindak_lanjut_aktif}
                        </span>
                        <span className="tp-badge tp-badge-green">
                          Selesai: {r.tindak_lanjut_selesai}
                        </span>
                      </td>
                      <td className="text-center">
                        <span
                          className={`tp-badge ${
                            r.disamarkan === 'Ya' ? 'tp-badge-amber' : 'tp-badge-neutral'
                          }`}
                        >
                          {r.disamarkan}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
