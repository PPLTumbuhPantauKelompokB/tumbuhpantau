import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';
import { Icon } from '../components/Icon.jsx';

export function SessionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updatingSchedule, setUpdatingSchedule] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadSessionDetail = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiRequest(`/sessions/${id}`);
      setSessionData(data);
      if (data?.session) {
        setEditDate(data.session.session_date);
        setEditNotes(data.session.notes || '');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat detail sesi Posyandu.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSessionDetail();
  }, [loadSessionDetail]);

  const recordAttendanceItems = async (items) => {
    setSavingAttendance(true);
    setFeedback(null);
    try {
      await apiRequest(`/sessions/${id}/attendances`, {
        method: 'POST',
        body: { items }
      });
      await loadSessionDetail();
      setFeedback({
        type: 'success',
        text: `Berhasil mencatat kehadiran ${items.length} balita.`
      });
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal mencatat kehadiran.' });
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleBulkMarkPresent = () => {
    if (!sessionData) return;
    const unrecorded = sessionData.children
      .filter((c) => !c.attendance_status)
      .map((c) => ({ child_id: c.child_id, status: 'present' }));

    if (unrecorded.length === 0) {
      setFeedback({
        type: 'info',
        text: 'Seluruh balita pada sesi ini sudah memiliki catatan kehadiran.'
      });
      return;
    }
    recordAttendanceItems(unrecorded);
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    setUpdatingSchedule(true);
    setFeedback(null);
    try {
      await apiRequest(`/sessions/${id}`, {
        method: 'PUT',
        body: { session_date: editDate, notes: editNotes }
      });
      setShowEditSchedule(false);
      setFeedback({
        type: 'success',
        text: 'Jadwal dan catatan sesi Posyandu berhasil diperbarui.'
      });
      await loadSessionDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal menyesuaikan jadwal sesi.' });
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const handleCloseSession = async () => {
    if (!window.confirm('Yakin ingin menutup sesi Posyandu ini? Sesi yang ditutup tidak dapat diubah lagi.')) {
      return;
    }
    try {
      await apiRequest(`/sessions/${id}/close`, { method: 'POST' });
      setFeedback({ type: 'success', text: 'Sesi pelayanan Posyandu berhasil ditutup.' });
      await loadSessionDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal menutup sesi.' });
    }
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    setCancelling(true);
    try {
      await apiRequest(`/sessions/${id}/cancel`, {
        method: 'PATCH',
        body: { reason: cancelReason }
      });
      setShowCancelModal(false);
      setCancelReason('');
      setFeedback({ type: 'info', text: 'Sesi Posyandu berhasil dibatalkan.' });
      await loadSessionDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal membatalkan sesi.' });
    } finally {
      setCancelling(false);
    }
  };

  if (loading && !sessionData) {
    return (
      <div className="tp-card text-center py-5">
        <div className="small text-secondary">Memuat detail sesi dan daftar kehadiran...</div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="alert alert-danger">{errorMsg}</div>;
  }

  if (!sessionData) return null;

  const { session, children = [] } = sessionData;
  const isKader = user?.role === 'kader';
  const isOpen = session.status === 'open';

  const filteredChildren = children.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.child_name.toLowerCase().includes(q) ||
      c.internal_code.toLowerCase().includes(q) ||
      (c.guardian_name && c.guardian_name.toLowerCase().includes(q))
    );
  });

  const presentCount = children.filter((c) => c.attendance_status === 'present').length;
  const absentCount = children.filter((c) => c.attendance_status === 'absent').length;
  const unrecordedCount = children.filter((c) => !c.attendance_status).length;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <Link
          to="/sesi"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-3"
        >
          <Icon name="arrow-left" size={16} />
          <span>Kembali ke Daftar Sesi</span>
        </Link>

        {isKader && isOpen && (
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-3"
              onClick={() => setShowEditSchedule((prev) => !prev)}
            >
              <Icon name="edit" size={15} />
              <span>{showEditSchedule ? 'Tutup Ubah Jadwal' : 'Sesuaikan Jadwal'}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-tp-soft"
              onClick={handleBulkMarkPresent}
              disabled={savingAttendance || unrecordedCount === 0}
            >
              <Icon name="user-check" size={16} />
              <span>Tandai Semua Hadir ({unrecordedCount})</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-3"
              onClick={() => setShowCancelModal(true)}
            >
              Batalkan Sesi
            </button>
            <button
              type="button"
              className="btn btn-sm btn-tp-primary"
              onClick={handleCloseSession}
            >
              <Icon name="check-shield" size={16} />
              <span>Tutup Sesi Selesai</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type} py-2 small mb-0 rounded-3`} role="alert">
          {feedback.text}
        </div>
      )}

      {showEditSchedule && (
        <div className="tp-card border-success" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
            <h3 className="h6 fw-bold mb-0">Penyesuaian Jadwal & Catatan Sesi (SCRUM-23)</h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowEditSchedule(false)}
              aria-label="Tutup form"
            />
          </div>
          <form onSubmit={handleUpdateSchedule} className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Tanggal Pelaksanaan Sesi</label>
              <input
                type="date"
                className="form-control font-mono-num"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />
            </div>
            <div className="col-md-8">
              <label className="form-label small fw-semibold">Catatan / Agenda Pelayanan</label>
              <input
                type="text"
                className="form-control"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Catatan pelaksanaan sesi"
              />
            </div>
            <div className="col-12 d-flex justify-content-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowEditSchedule(false)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-tp-primary" disabled={updatingSchedule}>
                {updatingSchedule ? 'Menyimpan...' : 'Simpan Perubahan Jadwal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCancelModal && (
        <div className="tp-card border-danger" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
            <h3 className="h6 fw-bold text-danger mb-0">Pembatalan Sesi Kegiatan Posyandu</h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowCancelModal(false)}
              aria-label="Tutup"
            />
          </div>
          <p className="small text-secondary mb-3">
            Tindakan ini akan membatalkan sesi Posyandu. Berikan alasan pembatalan kegiatan:
          </p>
          <form onSubmit={handleConfirmCancel} className="row g-3">
            <div className="col-md-9">
              <input
                type="text"
                className="form-control"
                placeholder="Alasan pembatalan (contoh: Posko Posyandu direnovasi)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary flex-fill"
                onClick={() => setShowCancelModal(false)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-danger flex-fill" disabled={cancelling}>
                {cancelling ? 'Memproses...' : 'Ya, Batalkan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tp-hero-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-0">
        <div>
          <div className="small text-secondary font-mono-num mb-1">
            {session.posyandu_code} &middot; Petugas: {session.created_by_name}
          </div>
          <h2 className="h5 fw-bold text-dark mb-1">
            {session.posyandu_name} &middot; Tanggal {session.session_date}
          </h2>
          {session.notes && <div className="small text-secondary">Catatan: {session.notes}</div>}
          {session.status === 'cancelled' && (
            <div className="small text-danger fw-semibold mt-1">
              Dibatalkan: {session.cancel_reason} ({session.cancelled_at})
            </div>
          )}
          {session.status === 'closed' && (
            <div className="small text-secondary font-mono-num mt-1">
              Selesai ditutup pada: {session.closed_at}
            </div>
          )}
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <span
            className={`tp-badge ${
              isOpen
                ? 'tp-badge-green'
                : session.status === 'cancelled'
                  ? 'tp-badge-red'
                  : 'tp-badge-neutral'
            }`}
          >
            {isOpen ? 'Sesi Terbuka' : session.status === 'cancelled' ? 'Dibatalkan' : 'Selesai'}
          </span>
          <span className="tp-badge tp-badge-green font-mono-num">
            {presentCount} Hadir
          </span>
          <span className="tp-badge tp-badge-neutral font-mono-num">
            {absentCount} Absen
          </span>
          <span className="tp-badge tp-badge-amber font-mono-num">
            {unrecordedCount} Belum Dicatat
          </span>
        </div>
      </div>

      <div className="tp-filter-bar">
        <div className="row g-2 align-items-center">
          <div className="col-md-6">
            <div className="tp-input-icon-group">
              <span className="tp-input-icon-left">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="form-control form-control-sm tp-input-with-icon"
                style={{ minHeight: '38px' }}
                placeholder="Cari balita di sesi ini berdasarkan nama, kode, atau wali"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari balita di sesi"
              />
            </div>
          </div>
          <div className="col-md-6 text-md-end small text-secondary">
            Menampilkan <strong>{filteredChildren.length}</strong> dari <strong>{children.length}</strong> sasaran balita
          </div>
        </div>
      </div>

      <div className="tp-card p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table tp-table">
            <thead>
              <tr>
                <th>Profil Balita & Orang Tua</th>
                <th>Usia pada Hari Sesi</th>
                <th>Rekomendasi Posisi Ukur</th>
                <th>Pencatatan Kehadiran (1-Klik)</th>
                <th>Waktu Catat</th>
                <th className="text-end">Profil Balita</th>
              </tr>
            </thead>
            <tbody>
              {filteredChildren.map((c) => {
                const avatarTone = getAvatarToneClass(c.internal_code || c.child_name);

                return (
                  <tr key={c.child_id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <span className={`tp-avatar ${avatarTone}`}>
                          {getInitials(c.child_name)}
                        </span>
                        <div>
                          <Link
                            to={`/anak/${c.child_id}`}
                            className="fw-bold text-dark text-decoration-none d-block"
                          >
                            {c.child_name}
                          </Link>
                          <div className="small text-secondary font-mono-num">
                            {c.internal_code} &middot; Wali: {c.guardian_name} ({c.guardian_relationship})
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-mono-num fw-semibold text-dark">
                        {c.age_months_at_session} bulan
                      </div>
                      <div className="small text-secondary font-mono-num">
                        ({c.age_days_at_session} hari)
                      </div>
                    </td>
                    <td>
                      <span className="small text-dark fw-semibold">
                        {c.recommended_position === 'recumbent'
                          ? 'Terlentang (< 24 bln)'
                          : 'Berdiri (>= 24 bln)'}
                      </span>
                    </td>
                    <td>
                      {isKader && isOpen ? (
                        <div className="btn-group btn-group-sm" role="group">
                          <button
                            type="button"
                            className={`btn ${
                              c.attendance_status === 'present'
                                ? 'btn-success'
                                : 'btn-outline-secondary'
                            }`}
                            onClick={() =>
                              recordAttendanceItems([{ child_id: c.child_id, status: 'present' }])
                            }
                            disabled={savingAttendance}
                          >
                            Hadir
                          </button>
                          <button
                            type="button"
                            className={`btn ${
                              c.attendance_status === 'absent'
                                ? 'btn-secondary'
                                : 'btn-outline-secondary'
                            }`}
                            onClick={() =>
                              recordAttendanceItems([{ child_id: c.child_id, status: 'absent' }])
                            }
                            disabled={savingAttendance}
                          >
                            Tidak Hadir
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`tp-badge ${
                            c.attendance_status === 'present'
                              ? 'tp-badge-green'
                              : c.attendance_status === 'absent'
                                ? 'tp-badge-neutral'
                                : 'tp-badge-amber'
                          }`}
                        >
                          {c.attendance_status === 'present'
                            ? 'Hadir'
                            : c.attendance_status === 'absent'
                              ? 'Tidak Hadir'
                              : 'Belum Dicatat'}
                        </span>
                      )}
                    </td>
                    <td className="small text-secondary font-mono-num">
                      {c.attendance_recorded_at || '-'}
                    </td>
                    <td className="text-end">
                      <Link to={`/anak/${c.child_id}`} className="btn btn-sm btn-tp-soft">
                        <span>Lihat Profil</span>
                        <Icon name="arrow-right" size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
