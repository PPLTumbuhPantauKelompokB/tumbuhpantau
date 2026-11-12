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
          <h2 className="h5 fw-bold text-dark mb-1">Sesi Kegiatan & Kehadiran Posyandu</h2>
          <p className="small text-secondary mb-0">
            Jadwal kegiatan penimbangan bulanan, status sesi, dan rekapitulasi kehadiran.
          </p>
        </div>

        {user?.role === 'kader' && (
          <button
            type="button"
            className="btn btn-tp-primary"
            onClick={() => setShowOpenModal((prev) => !prev)}
          >
            <Icon name={showOpenModal ? 'close' : 'plus'} size={17} />
            <span>{showOpenModal ? 'Tutup Form' : 'Buka Sesi Baru'}</span>
          </button>
        )}
      </div>

      {user?.role === 'kader' && showOpenModal && (
        <div className="tp-card border-success" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
            <h3 className="h6 fw-bold mb-0">Buka Sesi Pelayanan Posyandu Baru</h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowOpenModal(false)}
              aria-label="Tutup"
            />
          </div>

          <form onSubmit={handleOpenSession} className="row g-3 align-items-end">
            <div className="col-md-4">
              <label htmlFor="new-session-date" className="form-label small fw-semibold mb-1">
                Tanggal Pelaksanaan Sesi
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
            <div className="col-md-5">
              <label htmlFor="new-session-notes" className="form-label small fw-semibold mb-1">
                Catatan / Agenda Sesi (Opsional)
              </label>
              <input
                id="new-session-notes"
                type="text"
                className="form-control"
                placeholder="Contoh: Penimbangan rutin dan vitamin A"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-tp-primary w-100" disabled={creating}>
                <Icon name="calendar" size={16} />
                <span>{creating ? 'Membuka...' : 'Konfirmasi Buka'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {cancelModalSession && (
        <div className="tp-card border-danger" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
            <h3 className="h6 fw-bold text-danger mb-0">
              Konfirmasi Pembatalan Sesi ({cancelModalSession.session_date})
            </h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setCancelModalSession(null)}
              aria-label="Tutup"
            />
          </div>
          <p className="small text-secondary mb-3">
            Tindakan ini akan menandai status sesi sebagai Dibatalkan. Berikan alasan pembatalan:
          </p>
          <form onSubmit={handleConfirmCancel} className="row g-3">
            <div className="col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Ditunda karena cuaca buruk / kendala tempat"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4 d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary flex-fill"
                onClick={() => setCancelModalSession(null)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-danger flex-fill"
                disabled={cancelling}
              >
                {cancelling ? 'Memproses...' : 'Ya, Batalkan Sesi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {errorMsg && <div className="alert alert-danger py-2 small rounded-3">{errorMsg}</div>}

      <div className="tp-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5 small text-secondary">Memuat daftar sesi...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-5 small text-secondary">
            Belum ada sesi Posyandu yang tercatat.
          </div>
        ) : (
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
                {sessions.map((s) => (
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
                      <div className="d-inline-flex gap-1 font-mono-num">
                        <span className="tp-badge tp-badge-green">
                          Hadir: {s.present_count}
                        </span>
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
        )}
      </div>
    </div>
  );
}
