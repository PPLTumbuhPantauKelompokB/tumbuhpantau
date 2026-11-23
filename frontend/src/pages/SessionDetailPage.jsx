import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  formatCategoryInfo,
  formatPositionLabel,
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';
import { Icon } from '../components/Icon.jsx';

export function SessionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [attFilter, setAttFilter] = useState('all');
  const [sortBy, setSortBy] = useState('az');

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

  const handleToggleSingleAttendance = async (childItem, nextStatus) => {
    if (childItem.attendance_id) {
      setSavingAttendance(true);
      setFeedback(null);
      try {
        await apiRequest(`/sessions/${id}/attendances/${childItem.attendance_id}`, {
          method: 'PATCH',
          body: { status: nextStatus }
        });
        await loadSessionDetail();
        setFeedback({
          type: 'success',
          text: `Status kehadiran ${childItem.child_name} diperbarui menjadi ${nextStatus === 'present' ? 'Hadir' : 'Tidak Hadir'}.`
        });
      } catch (err) {
        setFeedback({ type: 'danger', text: err.message || 'Gagal mengubah status kehadiran.' });
      } finally {
        setSavingAttendance(false);
      }
      return;
    }
    await recordAttendanceItems([{ child_id: childItem.child_id, status: nextStatus }]);
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

  const filteredChildren = children
    .filter((c) => {
      if (attFilter === 'present' && c.attendance_status !== 'present') return false;
      if (attFilter === 'absent' && c.attendance_status !== 'absent') return false;
      if (attFilter === 'unrecorded' && c.attendance_status) return false;
      if (attFilter === 'measured' && c.measurement?.status !== 'submitted') return false;
      if (
        attFilter === 'unmeasured' &&
        (c.attendance_status !== 'present' || c.measurement?.status === 'submitted')
      ) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.child_name.toLowerCase().includes(q) ||
        c.internal_code.toLowerCase().includes(q) ||
        (c.guardian_name && c.guardian_name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'za') return (b.child_name || '').localeCompare(a.child_name || '', 'id');
      if (sortBy === 'newest') {
        const aId = Number(a.measurement?.id || a.attendance_id || a.child_id || 0);
        const bId = Number(b.measurement?.id || b.attendance_id || b.child_id || 0);
        return bId - aId;
      }
      if (sortBy === 'age_asc') {
        return Number(a.age_days_at_session || 0) - Number(b.age_days_at_session || 0);
      }
      return (a.child_name || '').localeCompare(b.child_name || '', 'id');
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
        <div
          className="tp-popup-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowEditSchedule(false)}
        >
          <div className="tp-form-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
              <h3 className="h6 fw-bold mb-0">Ubah Jadwal & Catatan Sesi</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowEditSchedule(false)}
                aria-label="Tutup form"
              />
            </div>
            <form onSubmit={handleUpdateSchedule} className="row g-3">
              <div className="col-md-5">
                <label className="form-label small fw-semibold">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  className="form-control font-mono-num"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-7">
                <label className="form-label small fw-semibold">Catatan / Agenda</label>
                <input
                  type="text"
                  className="form-control"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan pelaksanaan sesi"
                />
              </div>
              <div className="col-12 d-flex justify-content-end gap-2 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowEditSchedule(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-tp-primary" disabled={updatingSchedule}>
                  {updatingSchedule ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div
          className="tp-popup-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCancelModal(false)}
        >
          <div className="tp-form-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
              <h3 className="h6 fw-bold text-danger mb-0">Batalkan Sesi Kegiatan</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowCancelModal(false)}
                aria-label="Tutup"
              />
            </div>
            <form onSubmit={handleConfirmCancel} className="row g-3">
              <div className="col-12">
                <label className="form-label small fw-semibold">Alasan Pembatalan</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Posko Posyandu direnovasi"
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
                  onClick={() => setShowCancelModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-danger" disabled={cancelling}>
                  {cancelling ? 'Memproses...' : 'Ya, Batalkan'}
                </button>
              </div>
            </form>
          </div>
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
          <div className="col-md-5">
            <div className="tp-input-icon-group">
              <span className="tp-input-icon-left">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="form-control form-control-sm tp-input-with-icon"
                style={{ minHeight: '38px' }}
                placeholder="Cari nama balita, kode internal, atau nama wali..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari balita di sesi"
              />
            </div>
          </div>

          <div className="col-md-3">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={attFilter}
              onChange={(e) => setAttFilter(e.target.value)}
              aria-label="Filter Status Kehadiran"
            >
              <option value="all">Semua Sasaran ({children.length})</option>
              <option value="present">Status: Hadir ({presentCount})</option>
              <option value="absent">Status: Tidak Hadir ({absentCount})</option>
              <option value="unrecorded">Status: Belum Dicatat ({unrecordedCount})</option>
              <option value="measured">Sudah Diukur Lengkap</option>
              <option value="unmeasured">Hadir Belum Diukur / Draf</option>
            </select>
          </div>

          <div className="col-md-4">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Urutkan Balita di Sesi"
            >
              <option value="az">Urutkan: Abjad Nama (A - Z)</option>
              <option value="za">Urutkan: Abjad Nama (Z - A)</option>
              <option value="newest">Urutkan: Terbaru Diinput / Diukur</option>
              <option value="age_asc">Urutkan: Usia Termuda</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tp-card p-0 overflow-hidden">
        {isKader && isOpen && (
          <div
            className="px-3 py-2 border-bottom small d-flex align-items-center gap-2"
            style={{ backgroundColor: '#E8F5F1', color: '#065F46' }}
          >
            <Icon name="check-shield" size={16} />
            <span>
              <strong>Panduan Singkat:</strong> Klik tombol <strong>Hadir</strong> pada balita yang
              datang, lalu klik tombol hijau <strong>Input Ukur</strong> untuk mengisi BB &amp; TB.
            </span>
          </div>
        )}
        <div className="table-responsive">
          <table className="table tp-table">
            <thead>
              <tr>
                <th>Balita & Wali</th>
                <th>Usia & Posisi</th>
                <th>Kehadiran</th>
                <th>Hasil Ukur & Status Gizi</th>
                <th className="text-end">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filteredChildren.map((c) => {
                const m = c.measurement;
                const catInfo = formatCategoryInfo(m?.assessment?.category);
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
                        {c.age_months_at_session} bln ({c.age_days_at_session} hr)
                      </div>
                      <div className="small text-secondary">
                        {formatPositionLabel(c.recommended_position)}
                      </div>
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
                            onClick={() => handleToggleSingleAttendance(c, 'present')}
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
                            onClick={() => handleToggleSingleAttendance(c, 'absent')}
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
                      {c.attendance_recorded_by_name && (
                        <div className="text-muted font-mono-num mt-1" style={{ fontSize: '0.72rem' }}>
                          {c.attendance_recorded_by_name}
                        </div>
                      )}
                    </td>
                    <td>
                      {m?.status === 'submitted' && m.assessment ? (
                        <div className="d-flex flex-wrap align-items-center gap-2 font-mono-num small">
                          <span className="fw-bold text-dark">
                            {m.length_height_cm} cm &middot; {m.weight_kg} kg
                          </span>
                          <span className={`tp-badge ${catInfo.badgeClass}`}>
                            {catInfo.label} ({m.assessment.z_score} SD)
                          </span>
                        </div>
                      ) : m?.status === 'draft' ? (
                        <span className="tp-badge tp-badge-amber font-mono-num">
                          Draf ({m.weight_kg ?? '-'} kg / {m.length_height_cm ?? '-'} cm)
                        </span>
                      ) : c.attendance_status === 'present' ? (
                        <span className="tp-badge tp-badge-neutral">Belum Diinput</span>
                      ) : (
                        <span className="small text-secondary">-</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex align-items-center gap-1">
                        {m && (
                          <Link
                            to={`/pengukuran/detail/${m.id}`}
                            className="btn btn-sm btn-outline-secondary rounded-3"
                            title="Lihat detail catatan pengukuran"
                          >
                            Detail
                          </Link>
                        )}
                        {c.attendance_id && c.attendance_status === 'present' ? (
                          <Link
                            to={`/pengukuran/${c.attendance_id}`}
                            className={`btn btn-sm ${
                              m?.status === 'submitted' ? 'btn-tp-soft' : 'btn-tp-primary'
                            }`}
                          >
                            <Icon name="ruler" size={15} />
                            <span>
                              {m?.status === 'submitted'
                                ? 'Lihat Hasil'
                                : m?.status === 'draft'
                                  ? 'Lanjutkan Draf'
                                  : 'Input Ukur'}
                            </span>
                          </Link>
                        ) : isKader && isOpen ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-tp-soft"
                            disabled={savingAttendance}
                            onClick={async () => {
                              setSavingAttendance(true);
                              try {
                                let targetAttId = c.attendance_id;
                                if (targetAttId) {
                                  await apiRequest(`/sessions/${id}/attendances/${targetAttId}`, {
                                    method: 'PATCH',
                                    body: { status: 'present' },
                                    silentPopup: true
                                  });
                                } else {
                                  const res = await apiRequest(`/sessions/${id}/attendances`, {
                                    method: 'POST',
                                    body: { items: [{ child_id: c.child_id, status: 'present' }] },
                                    silentPopup: true
                                  });
                                  targetAttId = res?.attendances?.[0]?.id;
                                }
                                if (targetAttId) {
                                  navigate(`/pengukuran/${targetAttId}`);
                                } else {
                                  await loadSessionDetail();
                                }
                              } catch (err) {
                                setFeedback({ type: 'danger', text: err.message });
                              } finally {
                                setSavingAttendance(false);
                              }
                            }}
                          >
                            <Icon name="ruler" size={14} />
                            <span>Hadir &amp; Ukur</span>
                          </button>
                        ) : (
                          <Link to={`/anak/${c.child_id}`} className="btn btn-sm btn-tp-soft">
                            <span>Profil</span>
                            <Icon name="arrow-right" size={14} />
                          </Link>
                        )}
                      </div>
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
