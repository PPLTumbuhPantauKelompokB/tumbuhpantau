import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ZScoreBar } from '../components/ZScoreBar.jsx';
import { Icon } from '../components/Icon.jsx';
import {
  CLINICAL_DISCLAIMER,
  formatCategoryInfo,
  formatReviewStatusInfo,
  formatPositionLabel,
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';

export function ReviewsPage() {
  const { user } = useAuth();
  const isPetugas = user?.role === 'petugas_puskesmas';

  const [items, setItems] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [orgFilter, setOrgFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [decision, setDecision] = useState('confirmed');
  const [reviewNote, setReviewNote] = useState('');
  const [followUpType, setFollowUpType] = useState('clinical_review');
  const [followUpDesc, setFollowUpDesc] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('2026-11-25');
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ review_status: statusFilter });
      if (categoryFilter) params.set('category', categoryFilter);
      if (orgFilter) params.set('organization_id', orgFilter);

      const endpoint = isPetugas ? '/reviews/queue' : '/reviews';
      const res = await apiRequest(`${endpoint}?${params.toString()}`);
      setItems(res.items || []);
      if (res.items?.length > 0) {
        setSelectedId((prev) =>
          res.items.some((i) => i.assessment_id === prev) ? prev : res.items[0].assessment_id
        );
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat antrean peninjauan.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, orgFilter, isPetugas]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    apiRequest('/organizations')
      .then((orgs) => {
        setOrganizations((orgs || []).filter((o) => o.type === 'posyandu' && o.is_active));
      })
      .catch(() => {});

    if (!isPetugas) return;
    apiRequest('/users')
      .then((uList) => {
        setUsersList(uList || []);
        const firstKader = (uList || []).find((u) => u.role === 'kader');
        if (firstKader) {
          setAssignedTo(String(firstKader.id));
        } else if (uList?.length > 0) {
          setAssignedTo(String(uList[0].id));
        }
      })
      .catch(() => {});
  }, [isPetugas]);

  const filteredItems = [...items]
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.child_name || '').toLowerCase().includes(q) ||
        (item.internal_code || '').toLowerCase().includes(q) ||
        (item.posyandu_name || '').toLowerCase().includes(q) ||
        (item.guardian_name || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'az') return (a.child_name || '').localeCompare(b.child_name || '', 'id');
      if (sortBy === 'za') return (b.child_name || '').localeCompare(a.child_name || '', 'id');
      if (sortBy === 'oldest') return Number(a.measurement_id || 0) - Number(b.measurement_id || 0);
      if (sortBy === 'z_asc') return Number(a.z_score || 0) - Number(b.z_score || 0);
      return Number(b.measurement_id || 0) - Number(a.measurement_id || 0);
    });

  const selectedItem =
    filteredItems.find((i) => i.assessment_id === selectedId) ||
    filteredItems[0] ||
    items.find((i) => i.assessment_id === selectedId) ||
    null;

  useEffect(() => {
    if (!selectedItem) return;
    setReviewNote(selectedItem.review_note || '');
    const matchingKader = usersList.find(
      (u) => u.role === 'kader' && u.organization_id === selectedItem.organization_id
    );
    if (matchingKader) {
      setAssignedTo(String(matchingKader.id));
    }
    setFollowUpDesc(
      `Pendampingan gizi dan pemantauan tumbuh kembang untuk ${selectedItem.child_name} (${selectedItem.internal_code}).`
    );
  }, [selectedId, selectedItem?.organization_id, usersList]);

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const body = {
        decision,
        review_note: reviewNote
      };
      if (decision === 'confirmed') {
        body.follow_up = {
          type: followUpType,
          description: followUpDesc,
          assigned_to: assignedTo ? Number(assignedTo) : undefined,
          due_date: dueDate
        };
      }

      const res = await apiRequest(`/growth-assessments/${selectedItem.assessment_id}/review`, {
        method: 'PATCH',
        body
      });

      setFeedback({
        type: 'success',
        text: `Keputusan peninjauan berhasil disimpan (${res.review_status})${
          res.follow_up_id ? ` beserta tugas tindak lanjut otomatis #${res.follow_up_id}` : ''
        }.`
      });
      await loadReviews();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {feedback && (
        <div className={`alert alert-${feedback.type} py-2 small mb-0 rounded-3`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h5 fw-bold text-dark mb-1">Antrean Peninjauan Hasil Antropometri</h2>
          <p className="small text-secondary mb-0">
            {isPetugas
              ? 'Verifikasi hasil ukur kategori pendek, sangat pendek, tinggi, atau ekstrem di wilayah Puskesmas Anda.'
              : 'Pantau status verifikasi Puskesmas dan permintaan ukur ulang untuk Posyandu Anda.'}
          </p>
        </div>
      </div>

      <div className="tp-filter-bar">
        <div className="row g-2 align-items-center">
          <div className={isPetugas ? 'col-md-4' : 'col-md-5'}>
            <div className="tp-input-icon-group">
              <span className="tp-input-icon-left">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="form-control form-control-sm tp-input-with-icon"
                style={{ minHeight: '38px' }}
                placeholder="Cari nama balita, kode internal, Posyandu, atau wali..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari kasus peninjauan"
              />
            </div>
          </div>

          {isPetugas && (
            <div className="col-md-2">
              <select
                className="form-select form-select-sm rounded-3"
                style={{ minHeight: '38px' }}
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                aria-label="Filter Posyandu"
              >
                <option value="">Semua Posyandu</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="col-md-2">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter Status Peninjauan"
            >
              <option value="pending">Perlu Tinjauan</option>
              <option value="remeasure_requested">Ukur Ulang</option>
              <option value="validated">Tervalidasi</option>
              <option value="all">Semua Status</option>
            </select>
          </div>

          <div className="col-md-2">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter Kategori"
            >
              <option value="">Semua Kategori</option>
              <option value="sangat_pendek">Sangat Pendek</option>
              <option value="pendek">Pendek</option>
              <option value="tinggi">Tinggi</option>
            </select>
          </div>

          <div className={isPetugas ? 'col-md-2' : 'col-md-3'}>
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Urutkan Antrean"
            >
              <option value="newest">Urut: Terbaru Diukur</option>
              <option value="az">Urut: Abjad Nama (A - Z)</option>
              <option value="za">Urut: Abjad Nama (Z - A)</option>
              <option value="z_asc">Urut: Z-Score Terendah</option>
              <option value="oldest">Urut: Terlama Diukur</option>
            </select>
          </div>
        </div>
      </div>

      {errorMsg && <div className="alert alert-danger py-2 small rounded-3">{errorMsg}</div>}

      {loading ? (
        <div className="tp-card text-center py-5 small text-secondary">
          Memuat antrean peninjauan...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="tp-card text-center py-5 small text-secondary">
          Tidak ada hasil pengukuran yang sesuai dengan pencarian/filter.
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="small fw-semibold text-secondary mb-2">
              Daftar Antrean Kasus ({filteredItems.length} hasil ukur)
            </div>
            <div style={{ maxHeight: '640px', overflowY: 'auto' }} className="pe-1">
              {filteredItems.map((item) => {
                const catInfo = formatCategoryInfo(item.category);
                const revInfo = formatReviewStatusInfo(item.review_status);
                const isSelected = item.assessment_id === selectedItem?.assessment_id;
                const avatarTone = getAvatarToneClass(item.internal_code || item.child_name);

                return (
                  <button
                    key={item.assessment_id}
                    type="button"
                    className={`tp-review-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedId(item.assessment_id)}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className={`tp-avatar ${avatarTone}`}>{getInitials(item.child_name)}</span>
                        <div>
                          <div className="fw-bold text-dark">{item.child_name}</div>
                          <div className="small text-secondary font-mono-num">
                            {item.internal_code} &middot; {item.posyandu_name}
                          </div>
                        </div>
                      </div>
                      <span className={`tp-badge ${revInfo.badgeClass}`}>{revInfo.label}</span>
                    </div>

                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2 pt-2 border-top small">
                      <span className="font-mono-num">
                        {item.session_date} &middot; Z: <strong>{item.z_score} SD</strong> (
                        {item.length_height_cm} cm)
                      </span>
                      <span className={`tp-badge ${catInfo.badgeClass}`}>{catInfo.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-lg-7">
            {selectedItem ? (
              <div className="tp-card-static h-100">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 pb-3 mb-3 border-bottom">
                  <div>
                    <span className="font-mono-num small text-secondary">
                      {selectedItem.internal_code} &middot; {selectedItem.posyandu_name}
                    </span>
                    <h3 className="h5 fw-bold text-dark mb-0">{selectedItem.child_name}</h3>
                    <div className="small text-secondary">
                      Lahir: {selectedItem.birth_date} ({selectedItem.sex}) &middot; Wali:{' '}
                      {selectedItem.guardian_name} ({selectedItem.guardian_phone || '-'})
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <Link
                      to={`/pengukuran/detail/${selectedItem.measurement_id}`}
                      className="btn btn-sm btn-outline-secondary rounded-3"
                    >
                      Detail Catatan
                    </Link>
                    <Link
                      to={`/anak/${selectedItem.child_id}`}
                      className="btn btn-sm btn-tp-soft"
                    >
                      <span>Kurva & Profil</span>
                      <Icon name="arrow-right" size={15} />
                    </Link>
                  </div>
                </div>

                <div className="p-3 rounded-3 border bg-light mb-3">
                  <ZScoreBar
                    zScore={selectedItem.z_score}
                    category={selectedItem.category}
                    qualityStatus={selectedItem.quality_status}
                  />

                  <div className="row g-2 mt-3 pt-2 border-top small">
                    <div className="col-sm-6">
                      <span className="text-secondary">Sesi:</span>{' '}
                      <strong className="font-mono-num">
                        {selectedItem.session_date} (Rev #{selectedItem.revision_no})
                      </strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-secondary">Usia Ukur:</span>{' '}
                      <strong className="font-mono-num">
                        {selectedItem.age_months} bln ({selectedItem.age_days} hr)
                      </strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-secondary">PB/TB Aktual:</span>{' '}
                      <strong className="font-mono-num">
                        {selectedItem.length_height_cm} cm (
                        {formatPositionLabel(selectedItem.position)})
                      </strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-secondary">Terkoreksi:</span>{' '}
                      <strong className="font-mono-num">
                        {selectedItem.adjusted_length_height_cm} cm
                      </strong>
                    </div>
                  </div>

                  {selectedItem.review_reason && (
                    <div className="alert alert-warning py-2 px-3 mt-3 mb-0 small rounded-3">
                      <strong>Alasan Antrean:</strong> {selectedItem.review_reason}
                    </div>
                  )}
                </div>

                {isPetugas ? (
                  <form onSubmit={handleDecisionSubmit}>
                    <h4 className="h6 fw-bold mb-3">Keputusan Peninjauan Petugas Puskesmas</h4>

                    <div className="d-flex flex-column gap-2 mb-3">
                      <button
                        type="button"
                        className={`tp-radio-card py-2 px-3 ${
                          decision === 'confirmed' ? 'selected' : ''
                        }`}
                        onClick={() => setDecision('confirmed')}
                      >
                        <Icon name="user-check" size={18} className="text-primary mt-1" />
                        <div>
                          <div className="fw-bold text-dark small">
                            Validasi &amp; Buat Tugas Tindak Lanjut
                          </div>
                          <div className="small text-secondary">
                            Konfirmasi hasil ukur dan tugaskan Kader untuk intervensi gizi.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`tp-radio-card py-2 px-3 ${
                          decision === 'flagged_for_remeasurement' ? 'selected' : ''
                        }`}
                        onClick={() => setDecision('flagged_for_remeasurement')}
                      >
                        <Icon name="ruler" size={18} className="text-danger mt-1" />
                        <div>
                          <div className="fw-bold text-dark small">
                            Minta Kader Ukur Ulang
                          </div>
                          <div className="small text-secondary">
                            Kembalikan ke Posyandu untuk verifikasi pengukuran ulang.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`tp-radio-card py-2 px-3 ${
                          decision === 'monitoring' ? 'selected' : ''
                        }`}
                        onClick={() => setDecision('monitoring')}
                      >
                        <Icon name="check-shield" size={18} className="text-success mt-1" />
                        <div>
                          <div className="fw-bold text-dark small">
                            Validasi &amp; Pantau Rutin
                          </div>
                          <div className="small text-secondary">
                            Data terkonfirmasi valid, lanjutkan pemantauan bulanan tanpa tugas khusus.
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="rev-note" className="form-label small fw-semibold">
                        Catatan Petugas Puskesmas
                      </label>
                      <textarea
                        id="rev-note"
                        rows={2}
                        className="form-control form-control-sm rounded-3"
                        placeholder="Tuliskan catatan verifikasi atau instruksi ukur ulang..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        required={decision === 'flagged_for_remeasurement'}
                      />
                    </div>

                    {decision === 'confirmed' && (
                      <div
                        className="p-3 rounded-3 border mb-3"
                        style={{ backgroundColor: '#ECFDF5' }}
                      >
                        <div className="small fw-bold mb-2 text-dark">
                          Detail Tugas Tindak Lanjut Otomatis
                        </div>
                        <div className="row g-2">
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">
                              Kategori Intervensi
                            </label>
                            <select
                              className="form-select form-select-sm"
                              value={followUpType}
                              onChange={(e) => setFollowUpType(e.target.value)}
                            >
                              <option value="clinical_review">Konseling Gizi & Tinjauan Klinis</option>
                              <option value="operational_measurement">Kunjungan Rumah & PMT</option>
                              <option value="remeasurement">Pengukuran Ulang Terjadwal</option>
                            </select>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">
                              Penanggung Jawab
                            </label>
                            <select
                              className="form-select form-select-sm"
                              value={assignedTo}
                              onChange={(e) => setAssignedTo(e.target.value)}
                              required
                            >
                              {usersList.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.organization_code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-md-8">
                            <label className="form-label small fw-semibold">
                              Deskripsi Rencana Intervensi
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={followUpDesc}
                              onChange={(e) => setFollowUpDesc(e.target.value)}
                              minLength={5}
                              required
                            />
                          </div>

                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Tenggat Waktu</label>
                            <input
                              type="date"
                              className="form-control form-control-sm font-mono-num"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <span className="small text-secondary">
                        <strong>Disclaimer:</strong> {CLINICAL_DISCLAIMER}
                      </span>
                      <button type="submit" className="btn btn-tp-primary" disabled={submitting}>
                        <Icon name="check-shield" size={16} />
                        <span>{submitting ? 'Menyimpan...' : 'Simpan Keputusan'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 rounded-3 border bg-white">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h4 className="h6 fw-bold mb-0">Status Verifikasi Puskesmas</h4>
                      <span className="tp-badge tp-badge-neutral">Mode Baca Saja</span>
                    </div>

                    <p className="small text-secondary mb-3">
                      Keputusan peninjauan hasil antropometri ditetapkan oleh{' '}
                      <strong>Petugas Puskesmas</strong>.
                    </p>

                    {selectedItem.reviewed_by_name && (
                      <div className="p-2 rounded-3 border bg-light small mb-3">
                        <div>
                          <strong>Ditinjau oleh:</strong> {selectedItem.reviewed_by_name} (
                          {selectedItem.reviewed_at})
                        </div>
                        <div>
                          <strong>Catatan Petugas:</strong> {selectedItem.review_note || '-'}
                        </div>
                      </div>
                    )}

                    {selectedItem.review_status === 'remeasure_requested' && (
                      <Link
                        to={`/anak/${selectedItem.child_id}`}
                        className="btn btn-sm btn-tp-primary"
                      >
                        <span>Buka Profil Anak & Koreksi Nilai</span>
                        <Icon name="arrow-right" size={15} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
