import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';
import {
  formatFollowUpStatusInfo,
  formatFollowUpTypeLabel,
  formatCategoryInfo,
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';

function formatResultLabel(result) {
  switch (result) {
    case 'contacted':
      return 'Wali Dihubungi';
    case 'visited':
      return 'Kunjungan Rumah Dilakukan';
    case 'unreachable':
      return 'Wali Belum Dapat Dihubungi';
    case 'referred':
      return 'Dirujuk ke Puskesmas';
    case 'remeasured':
      return 'Pengukuran Ulang Selesai';
    case 'system_revision_notice':
      return 'Pemberitahuan Otomatis Revisi Pengukuran';
    default:
      return result;
  }
}

export function FollowUpDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isPetugas = user?.role === 'petugas_puskesmas';

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [resultType, setResultType] = useState('visited');
  const [note, setNote] = useState('');
  const [closureNote, setClosureNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiRequest(`/follow-ups/${id}`);
      setDetail(data);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat detail tindak lanjut.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleAddUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest(`/follow-ups/${id}/updates`, {
        method: 'POST',
        body: { result: resultType, note }
      });
      setNote('');
      setFeedback({
        type: 'success',
        text: 'Catatan progres berhasil ditambahkan (status diperbarui menjadi Berjalan).'
      });
      await loadDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest(`/follow-ups/${id}/close`, {
        method: 'PATCH',
        body: { closure_note: closureNote }
      });
      setClosureNote('');
      setFeedback({
        type: 'success',
        text: 'Tugas tindak lanjut resmi ditutup oleh Petugas Puskesmas.'
      });
      await loadDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="tp-card text-center py-5">
        <div className="spinner-border text-success mb-2" role="status" />
        <div className="small text-secondary">Memuat lini masa tindak lanjut...</div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="alert alert-danger">{errorMsg}</div>;
  }

  if (!detail) return null;

  const { followUp, updates } = detail;
  const stInfo = formatFollowUpStatusInfo(followUp.status, followUp.is_overdue);
  const catInfo = formatCategoryInfo(followUp.category);
  const isClosed = followUp.status === 'closed';
  const avatarTone = getAvatarToneClass(followUp.internal_code || followUp.child_name);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <Link
          to="/tindak-lanjut"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-3"
        >
          <Icon name="arrow-left" size={16} />
          <span>Daftar Tindak Lanjut</span>
        </Link>
        <Link to={`/anak/${followUp.child_id}`} className="btn btn-sm btn-tp-soft">
          <span>Profil & Kurva {followUp.child_name}</span>
          <Icon name="arrow-right" size={15} />
        </Link>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type} py-2 small mb-0 rounded-3`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="tp-card h-100">
            <div className="d-flex justify-content-between align-items-start gap-2 pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-3">
                <span className={`tp-avatar ${avatarTone}`}>
                  {getInitials(followUp.child_name)}
                </span>
                <div>
                  <div className="small text-secondary font-mono-num">
                    Tugas #{followUp.id} &middot; {followUp.posyandu_name}
                  </div>
                  <h2 className="h5 fw-bold text-dark mb-0">{followUp.child_name}</h2>
                </div>
              </div>
              <span className={`tp-badge ${stInfo.badgeClass}`}>{stInfo.label}</span>
            </div>

            <div className="d-flex flex-column gap-2 small">
              <div>
                <span className="text-secondary">Kode Internal:</span>{' '}
                <strong className="font-mono-num">
                  {followUp.internal_code} ({followUp.sex})
                </strong>
              </div>
              <div>
                <span className="text-secondary">Orang Tua / Wali:</span>{' '}
                <strong>
                  {followUp.guardian_name} ({followUp.guardian_phone || '-'})
                </strong>
              </div>
              <div>
                <span className="text-secondary">Kategori Intervensi:</span>{' '}
                <strong>
                  {followUp.intervention_category || formatFollowUpTypeLabel(followUp.type)}
                </strong>
              </div>
              <div>
                <span className="text-secondary">Penanggung Jawab:</span>{' '}
                <strong>{followUp.assigned_to_name}</strong>
              </div>
              <div>
                <span className="text-secondary">Tenggat Waktu:</span>{' '}
                <strong className="font-mono-num">{followUp.due_date}</strong>
              </div>

              {followUp.z_score !== null && (
                <div className="p-3 rounded-3 border bg-light mt-2">
                  <div className="fw-semibold mb-1">Hasil Ukur Pemicu:</div>
                  <div className="font-mono-num mb-1">
                    PB/TB Terkoreksi: {followUp.adjusted_length_height_cm} cm &middot; Z-Score:{' '}
                    <strong>{followUp.z_score} SD</strong>
                  </div>
                  <span className={`tp-badge ${catInfo.badgeClass}`}>{catInfo.label}</span>
                </div>
              )}

              <div className="p-3 rounded-3 border bg-light mt-2">
                <div className="fw-semibold mb-1">Deskripsi Tugas:</div>
                <div>{followUp.description}</div>
              </div>

              {isClosed && (
                <div
                  className="p-3 rounded-3 border mt-2"
                  style={{ backgroundColor: '#ECFDF5', color: '#065F46' }}
                >
                  <div className="fw-bold mb-1">Tugas Telah Selesai &amp; Ditutup</div>
                  <div>
                    Oleh: {followUp.closed_by_name} ({followUp.closed_at})
                  </div>
                  <div>Kesimpulan Evaluasi: {followUp.closure_note}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="tp-card mb-4">
            <div className="pb-3 mb-3 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <h3 className="h6 fw-bold mb-1">Lini Masa Progres Lapangan</h3>
                <div className="small text-secondary">
                  Catatan kunjungan rumah dan perkembangan intervensi.
                </div>
              </div>
              <span className="tp-badge tp-badge-neutral">{updates.length} catatan</span>
            </div>

            {updates.length === 0 ? (
              <div className="text-center py-4 small text-secondary">
                Belum ada catatan progres lapangan pada tugas ini.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 mb-4">
                {updates.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-3 border"
                    style={{
                      backgroundColor:
                        u.result === 'system_revision_notice' ? '#EFF6FF' : '#F8FAFC'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                      <span className="small fw-bold text-dark">{formatResultLabel(u.result)}</span>
                      <span className="small text-secondary font-mono-num">{u.activity_at}</span>
                    </div>
                    <div className="small mb-1">{u.note}</div>
                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                      Oleh: <strong>{u.actor_name}</strong> ({u.actor_role})
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isClosed && (
              <form onSubmit={handleAddUpdate} className="border-top pt-3">
                <h4 className="h6 fw-bold mb-2">Tambah Catatan Kunjungan / Progres</h4>
                <div className="row g-2">
                  <div className="col-md-5">
                    <label className="form-label small fw-semibold">Hasil Kegiatan</label>
                    <select
                      className="form-select form-select-sm"
                      value={resultType}
                      onChange={(e) => setResultType(e.target.value)}
                    >
                      <option value="visited">Kunjungan Rumah Dilakukan</option>
                      <option value="contacted">Wali Dihubungi via Telepon/WA</option>
                      <option value="referred">Dirujuk ke Layanan Gizi Puskesmas</option>
                      <option value="remeasured">Pengukuran Ulang Selesai</option>
                      <option value="unreachable">Wali Belum Dapat Dihubungi</option>
                    </select>
                  </div>
                  <div className="col-md-7">
                    <label className="form-label small fw-semibold">Catatan Kemajuan</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Tuliskan hasil kunjungan atau tindak lanjut..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      minLength={5}
                      required
                    />
                  </div>
                  <div className="col-12 d-flex justify-content-end mt-2">
                    <button type="submit" className="btn btn-sm btn-tp-primary" disabled={submitting}>
                      <Icon name="plus" size={16} />
                      <span>Simpan Catatan Progres</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {isPetugas && !isClosed && (
            <div className="tp-card">
              <div className="pb-3 mb-3 border-bottom">
                <h3 className="h6 fw-bold mb-1">Evaluasi & Penutupan Tugas (Puskesmas)</h3>
                <div className="small text-secondary">
                  Tutup tugas setelah intervensi tindak lanjut lapangan dinilai tuntas.
                </div>
              </div>

              <form onSubmit={handleCloseTask}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    Kesimpulan Hasil Evaluasi Penutupan (Wajib)
                  </label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm rounded-3"
                    placeholder="Contoh: Wali dan balita telah hadir konseling gizi di Puskesmas, jadwal PMT berjalan baik."
                    value={closureNote}
                    onChange={(e) => setClosureNote(e.target.value)}
                    minLength={5}
                    required
                  />
                </div>
                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    className="btn btn-tp-primary"
                    disabled={submitting}
                  >
                    <Icon name="check-shield" size={16} />
                    <span>Selesaikan & Tutup Tugas</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
