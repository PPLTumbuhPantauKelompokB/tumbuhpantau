import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';

export function SessionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [sessionDate, setSessionDate] = useState('2026-11-20');
  const [sessionNotes, setSessionNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const [cancelModalSession, setCancelModalSession] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiRequest('/sessions');
      setSessions(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar sesi Posyandu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleOpenSession = async (e) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg('');
    setFeedback(null);
    try {
      const created = await apiRequest('/sessions', {
        method: 'POST',
        body: { session_date: sessionDate, notes: sessionNotes }
      });
      navigate(`/sesi/${created.id}`);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal membuka sesi Posyandu.');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelModalSession) return;
    setCancelling(true);
    try {
      await apiRequest(`/sessions/${cancelModalSession.id}/cancel`, {
        method: 'PATCH',
        body: { reason: cancelReason }
      });
      setCancelModalSession(null);
      setCancelReason('');
      setFeedback({ type: 'info', text: 'Sesi Posyandu berhasil dibatalkan.' });
      await loadSessions();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal membatalkan sesi.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {feedback && (
        <div
          className={`alert alert-${feedback.type} d-flex justify-content-between align-items-center mb-0 rounded-3`}
          role="alert"
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setFeedback(null)}
            aria-label="Tutup pesan"
          />
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h5 fw-bold text-dark mb-1">Sesi Kegiatan Posyandu</h2>
          <p className="small text-secondary mb-0">
            Pilih sesi untuk mencatat kehadiran dan pengukuran balita.
          </p>
        </div>

        {user?.role === 'kader' && (
          <button
            type="button"
            className="btn btn-tp-primary"
            onClick={() => setShowOpenModal(true)}
          >
            <Icon name="plus" size={17} />
            <span>Buka Sesi Baru</span>
          </button>
        )}
      </div>

      {user?.role === 'kader' && showOpenModal && (
        <div
          className="tp-popup-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowOpenModal(false)}
        >
          <div className="tp-form-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
              <div>
                <h3 className="h6 fw-bold mb-0">Buka Sesi Posyandu Baru</h3>
                <div className="small text-secondary">
                  Pilih tanggal kegiatan untuk membuka daftar hadir balita.
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowOpenModal(false)}
                aria-label="Tutup"
              />
            </div>

            <form onSubmit={handleOpenSession} className="row g-3">
              <div className="col-md-5">
                <label htmlFor="new-session-date" className="form-label small fw-semibold mb-1">
                  Tanggal Pelaksanaan
                </label>
                <input
                  id="new-session-date"
                  type="date"
                  className="form-control font-mono-num"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-7">
                <label htmlFor="new-session-notes" className="form-label small fw-semibold mb-1">
                  Catatan / Agenda (Opsional)
                </label>
                <input
                  id="new-session-notes"
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Penimbangan rutin bulanan"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                />
              </div>
              <div className="col-12 d-flex justify-content-end gap-2 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowOpenModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-tp-primary" disabled={creating}>
                  <Icon name="calendar" size={16} />
                  <span>{creating ? 'Membuka...' : 'Simpan & Buka Sesi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelModalSession && (
        <div
          className="tp-popup-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setCancelModalSession(null)}
        >
          <div className="tp-form-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
              <h3 className="h6 fw-bold text-danger mb-0">
                Batalkan Sesi ({cancelModalSession.session_date})
              </h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setCancelModalSession(null)}
                aria-label="Tutup"
              />
            </div>
            <form onSubmit={handleConfirmCancel} className="row g-3">
              <div className="col-12">
                <label className="form-label small fw-semibold">Alasan Pembatalan</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Ditunda karena cuaca buruk"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="col-12 d-flex justify-content-end gap-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setCancelModalSession(null)}
                >
                  Kembali
                </button>
                <button type="submit" className="btn btn-danger" disabled={cancelling}>
                  {cancelling ? 'Memproses...' : 'Ya, Batalkan Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {errorMsg && <div className="alert alert-danger py-2 small rounded-3">{errorMsg}</div>}

      <div className="tp-filter-bar">
        <div className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="tp-input-icon-group">
              <span className="tp-input-icon-left">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="form-control form-control-sm tp-input-with-icon"
                style={{ minHeight: '38px' }}
                placeholder="Cari tanggal sesi, nama Posyandu, catatan, atau petugas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari sesi Posyandu"
              />
            </div>
          </div>

          <div className="col-md-3">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter Status Sesi"
            >
              <option value="all">Semua Status Sesi</option>
              <option value="open">Status: Terbuka</option>
              <option value="closed">Status: Selesai</option>
              <option value="cancelled">Status: Dibatalkan</option>
            </select>
          </div>

          <div className="col-md-4">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Urutkan Sesi"
            >
              <option value="newest">Urutkan: Tanggal Terbaru</option>
              <option value="oldest">Urutkan: Tanggal Terlama</option>
              <option value="az">Urutkan: Abjad Posyandu (A - Z)</option>
              <option value="present_desc">Urutkan: Kehadiran Terbanyak</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tp-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5 small text-secondary">Memuat daftar sesi...</div>
        ) : (() => {
            const filteredSessions = sessions
              .filter((s) => {
                if (statusFilter !== 'all' && s.status !== statusFilter) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  (s.session_date || '').toLowerCase().includes(q) ||
                  (s.posyandu_name || '').toLowerCase().includes(q) ||
                  (s.posyandu_code || '').toLowerCase().includes(q) ||
                  (s.notes || '').toLowerCase().includes(q) ||
                  (s.created_by_name || '').toLowerCase().includes(q)
                );
              })
              .sort((a, b) => {
                if (sortBy === 'az') {
                  return (a.posyandu_name || '').localeCompare(b.posyandu_name || '', 'id');
                }
                if (sortBy === 'oldest') {
                  return (a.session_date || '').localeCompare(b.session_date || '');
                }
                if (sortBy === 'present_desc') {
                  return Number(b.present_count || 0) - Number(a.present_count || 0);
                }
                return (b.session_date || '').localeCompare(a.session_date || '');
              });

            if (filteredSessions.length === 0) {
              return (
                <div className="text-center py-5 small text-secondary">
                  Tidak ada sesi Posyandu yang sesuai dengan pencarian/filter.
                </div>
              );
            }

            return (
              <div className="table-responsive">
                <table className="table tp-table">
                  <thead>
                    <tr>
                      <th>Tanggal Sesi</th>
                      <th>Unit Posyandu</th>
                      <th>Status Sesi</th>
                      <th>Catatan / Keterangan</th>
                      <th className="text-center">Kehadiran Balita</th>
                      <th>Petugas Pembuka</th>
                      <th className="text-end">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="font-mono-num fw-bold text-dark">{s.session_date}</div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{s.posyandu_name}</div>
                      <div className="small text-secondary font-mono-num">{s.posyandu_code}</div>
                    </td>
                    <td>
                      <span
                        className={`tp-badge ${
                          s.status === 'open'
                            ? 'tp-badge-green'
                            : s.status === 'cancelled'
                              ? 'tp-badge-red'
                              : 'tp-badge-neutral'
                        }`}
                      >
                        {s.status === 'open'
                          ? 'Terbuka'
                          : s.status === 'cancelled'
                            ? 'Dibatalkan'
                            : 'Selesai'}
                      </span>
                    </td>
                    <td>
                      <div className="small text-secondary">
                        {s.status === 'cancelled' ? (
                          <span className="text-danger">Alasan: {s.cancel_reason}</span>
                        ) : (
                          s.notes || '-'
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="d-inline-flex flex-wrap justify-content-center gap-1 font-mono-num">
                        <span className="tp-badge tp-badge-green">
                          Hadir: {s.present_count}
                        </span>
                        <span className="tp-badge tp-badge-blue">
                          Diukur: {s.measured_submitted_count || 0}
                        </span>
                        {s.measured_draft_count > 0 && (
                          <span className="tp-badge tp-badge-amber">
                            Draf: {s.measured_draft_count}
                          </span>
                        )}
                        <span className="tp-badge tp-badge-neutral">
                          Absen: {s.absent_count}
                        </span>
                      </div>
                    </td>
                    <td className="small text-secondary">{s.created_by_name}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <Link to={`/sesi/${s.id}`} className="btn btn-sm btn-tp-soft">
                          <span>Kelola</span>
                          <Icon name="arrow-right" size={14} />
                        </Link>
                        {user?.role === 'kader' && s.status === 'open' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              setCancelModalSession(s);
                              setCancelReason('');
                            }}
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            );
          })()}
      </div>
    </div>
  );
}
