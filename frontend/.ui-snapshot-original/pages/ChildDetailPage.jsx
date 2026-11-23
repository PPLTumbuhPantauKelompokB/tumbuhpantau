import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { apiRequest } from '../api/client.js';
import { ZScoreBar } from '../components/ZScoreBar.jsx';
import { Icon } from '../components/Icon.jsx';
import {
  CLINICAL_DISCLAIMER,
  formatCategoryInfo,
  formatReviewStatusInfo,
  formatPositionLabel,
  formatFollowUpStatusInfo,
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function ChildDetailPage() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('charts');

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_relationship: 'Ibu',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

  const [guardiansList, setGuardiansList] = useState([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState('');
  const [relRole, setRelRole] = useState('Ibu');

  const [revisingMeasurement, setRevisingMeasurement] = useState(null);
  const [reviseForm, setReviseForm] = useState({
    weight_kg: '',
    length_height_cm: '',
    position: 'recumbent',
    correction_reason: ''
  });
  const [submittingRevise, setSubmittingRevise] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest(`/children/${id}`);
      setData(res);
      setEditForm({
        name: res.child.name,
        guardian_name: res.child.guardian_name,
        guardian_phone: res.child.guardian_phone || '',
        guardian_relationship: res.child.guardian_relationship || 'Ibu',
        is_active: res.child.inactive_on === null
      });
      setSelectedGuardianId(res.child.guardian_id ? String(res.child.guardian_id) : '');
      setRelRole(res.child.guardian_relationship || 'Ibu');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat detail balita.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (data?.child?.organization_id) {
      apiRequest(`/guardians?organization_id=${data.child.organization_id}`)
        .then((gList) => {
          setGuardiansList(gList || []);
        })
        .catch(() => {});
    }
  }, [data?.child?.organization_id]);

  const handleUpdateChild = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest(`/children/${id}`, {
        method: 'PATCH',
        body: editForm
      });
      setEditMode(false);
      setFeedback({ type: 'success', text: 'Identitas balita berhasil diperbarui.' });
      await loadDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal memperbarui data balita.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Yakin ingin menonaktifkan profil balita ${data.child.name}? Riwayat tetap tersimpan.`)) {
      return;
    }
    try {
      await apiRequest(`/children/${id}/deactivate`, { method: 'PATCH' });
      setFeedback({ type: 'info', text: 'Profil balita telah dinonaktifkan.' });
      await loadDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    }
  };

  const handleActivate = async () => {
    try {
      await apiRequest(`/children/${id}/activate`, { method: 'PATCH' });
      setFeedback({ type: 'success', text: 'Profil balita berhasil diaktifkan kembali.' });
      await loadDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    }
  };

  const handleUpdateGuardianRelation = async (detach = false) => {
    try {
      await apiRequest(`/children/${id}/guardian`, {
        method: 'PATCH',
        body: {
          guardian_id: detach ? null : Number(selectedGuardianId),
          guardian_relationship: detach ? 'Tanpa Wali' : relRole
        }
      });
      setFeedback({
        type: 'success',
        text: detach ? 'Relasi wali berhasil dilepas.' : 'Wali berhasil dikaitkan.'
      });
      await loadDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    }
  };

  const openReviseModal = (m) => {
    setRevisingMeasurement(m);
    setReviseForm({
      weight_kg: String(m.weight_kg ?? ''),
      length_height_cm: String(m.length_height_cm ?? ''),
      position: m.position || 'recumbent',
      correction_reason: ''
    });
  };

  const handleReviseSubmit = async (e) => {
    e.preventDefault();
    if (!revisingMeasurement) return;
    setSubmittingRevise(true);
    setFeedback(null);
    try {
      const res = await apiRequest(`/measurements/${revisingMeasurement.measurement_id}/revisions`, {
        method: 'POST',
        body: {
          weight_kg: Number(reviseForm.weight_kg),
          length_height_cm: Number(reviseForm.length_height_cm),
          position: reviseForm.position,
          correction_reason: reviseForm.correction_reason,
          expected_revision_no: revisingMeasurement.revision_no
        }
      });
      setRevisingMeasurement(null);
      setFeedback({
        type: 'success',
        text: `Koreksi berhasil disimpan sebagai Revisi #${res.measurement.revision_no} (Z-Score baru: ${res.assessment.z_score} SD).`
      });
      await loadDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSubmittingRevise(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="tp-card text-center py-5">
        <div className="spinner-border text-success mb-2" role="status" />
        <div className="small text-secondary">Memuat profil dan kurva pertumbuhan balita...</div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="alert alert-danger">{errorMsg}</div>;
  }

  if (!data) return null;

  const {
    child,
    attendances = [],
    audit_history = [],
    whoCurves = [],
    activeHistory = [],
    allRevisions = [],
    followUps = []
  } = data;

  const latestActive = activeHistory.length > 0 ? activeHistory[activeHistory.length - 1] : null;
  const avatarTone = getAvatarToneClass(child.internal_code || child.name);

  const childPointsByMonth = new Map();
  for (const item of activeHistory) {
    if (item.assessment) {
      const approxMonth = Math.min(60, Math.max(0, Math.round(item.assessment.age_days / 30.4375)));
      childPointsByMonth.set(approxMonth, item.assessment.adjusted_length_height_cm);
    }
  }

  const whoChartData = {
    labels: (whoCurves || []).map((c) => `${c.month}`),
    datasets: [
      {
        label: 'Hasil Ukur Anak (Terkoreksi)',
        data: (whoCurves || []).map((c) =>
          childPointsByMonth.has(c.month) ? childPointsByMonth.get(c.month) : null
        ),
        borderColor: '#059669',
        backgroundColor: '#059669',
        pointRadius: 6,
        pointHoverRadius: 8,
        borderWidth: 3,
        spanGaps: true
      },
      {
        label: '+3 SD',
        data: (whoCurves || []).map((c) => c.sdPos3),
        borderColor: '#3B82F6',
        borderWidth: 1.2,
        borderDash: [4, 4],
        pointRadius: 0
      },
      {
        label: '+2 SD',
        data: (whoCurves || []).map((c) => c.sdPos2),
        borderColor: '#10B981',
        borderWidth: 1.2,
        borderDash: [3, 3],
        pointRadius: 0
      },
      {
        label: '0 SD (Median)',
        data: (whoCurves || []).map((c) => c.sd0),
        borderColor: '#15803D',
        borderWidth: 2,
        pointRadius: 0
      },
      {
        label: '-2 SD (Pendek)',
        data: (whoCurves || []).map((c) => c.sdNeg2),
        borderColor: '#F59E0B',
        borderWidth: 1.5,
        borderDash: [4, 3],
        pointRadius: 0
      },
      {
        label: '-3 SD (Sangat Pendek)',
        data: (whoCurves || []).map((c) => c.sdNeg3),
        borderColor: '#EF4444',
        borderWidth: 1.5,
        pointRadius: 0
      }
    ]
  };

  const weightChartData = {
    labels: activeHistory.map(
      (h) => `${h.session_date} (${h.assessment?.age_months ?? 0} bln)`
    ),
    datasets: [
      {
        label: 'Berat Badan Aktual (kg)',
        data: activeHistory.map((h) => h.weight_kg),
        borderColor: '#1A56DB',
        backgroundColor: '#EFF6FF',
        pointBackgroundColor: '#1A56DB',
        pointRadius: 5,
        borderWidth: 2.5,
        tension: 0.2
      }
    ]
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <Link
          to="/anak"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-3"
        >
          <Icon name="arrow-left" size={16} />
          <span>Kembali ke Daftar Balita</span>
        </Link>

        <div className="d-flex gap-2">
          {!editMode && (
            <button
              type="button"
              className="btn btn-sm btn-tp-soft"
              onClick={() => setEditMode(true)}
            >
              <Icon name="edit" size={15} />
              <span>Koreksi Identitas</span>
            </button>
          )}
          {child.inactive_on === null ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-3"
              onClick={handleDeactivate}
            >
              Nonaktifkan Balita
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-tp-primary"
              onClick={handleActivate}
            >
              <Icon name="user-check" size={15} />
              <span>Aktifkan Kembali Balita</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type} py-2 small mb-0 rounded-3`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="tp-hero-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-0">
        <div className="d-flex align-items-center gap-3">
          <span
            className={`tp-avatar ${avatarTone}`}
            style={{ width: '48px', height: '48px', fontSize: '1rem' }}
          >
            {getInitials(child.name)}
          </span>
          <div>
            <div className="small text-secondary font-mono-num mb-1">
              {child.internal_code} &middot; {child.sex === 'L' ? 'Laki-laki' : 'Perempuan'}
            </div>
            <h2 className="h5 fw-bold text-dark mb-0">{child.name}</h2>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="tp-badge tp-badge-neutral font-mono-num">
            {child.age_months_current} bulan ({child.age_days_current} hari)
          </span>
          <span className={`tp-badge ${child.inactive_on ? 'tp-badge-neutral' : 'tp-badge-green'}`}>
            {child.inactive_on ? `Nonaktif (${child.inactive_on})` : 'Aktif'}
          </span>
        </div>
      </div>

      {editMode && (
        <div className="tp-card border-success" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
            <h3 className="h6 fw-bold mb-0">Form Koreksi Identitas Balita</h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setEditMode(false)}
              aria-label="Tutup form"
            />
          </div>

          <form onSubmit={handleUpdateChild} className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Nama Lengkap Balita</label>
              <input
                type="text"
                className="form-control"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Nama Orang Tua / Wali</label>
              <input
                type="text"
                className="form-control"
                value={editForm.guardian_name}
                onChange={(e) => setEditForm({ ...editForm, guardian_name: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Hubungan Pengasuh</label>
              <input
                type="text"
                className="form-control"
                value={editForm.guardian_relationship}
                onChange={(e) => setEditForm({ ...editForm, guardian_relationship: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">No. Telepon Wali</label>
              <input
                type="text"
                className="form-control font-mono-num"
                value={editForm.guardian_phone}
                onChange={(e) => setEditForm({ ...editForm, guardian_phone: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Status Keaktifan</label>
              <select
                className="form-select"
                value={editForm.is_active ? '1' : '0'}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === '1' })}
              >
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </div>

            <div className="col-12 d-flex justify-content-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setEditMode(false)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-tp-primary" disabled={submitting}>
                <Icon name="check-shield" size={16} />
                <span>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="tp-card h-100">
            <h3 className="h6 fw-bold text-dark mb-3">Informasi Identitas & Posyandu</h3>
            <div className="d-flex flex-column gap-2 small">
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Kode Internal:</span>
                <span className="font-mono-num fw-semibold text-dark">{child.internal_code}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Tanggal Lahir:</span>
                <span className="font-mono-num fw-semibold text-dark">{child.birth_date}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Jenis Kelamin:</span>
                <span className="fw-semibold text-dark">
                  {child.sex === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                </span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Tanggal Terdaftar:</span>
                <span className="font-mono-num text-dark">{child.registered_on}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Unit Posyandu:</span>
                <span className="fw-semibold text-dark">
                  {child.posyandu_name} ({child.posyandu_code})
                </span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-secondary">Puskesmas Pembina:</span>
                <span className="text-dark">{child.puskesmas_name || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="tp-card h-100">
            <h3 className="h6 fw-bold text-dark mb-3">Orang Tua / Wali Balita</h3>
            <div className="d-flex flex-column gap-2 small mb-3">
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Nama Wali:</span>
                <span className="fw-semibold text-dark">{child.guardian_name}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Hubungan:</span>
                <span className="text-dark">{child.guardian_relationship}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Kontak Telepon:</span>
                <span className="font-mono-num text-dark">
                  {child.guardian_phone || 'Belum diisi'}
                </span>
              </div>
            </div>

            <div className="border-top pt-3">
              <div className="fw-semibold small text-dark mb-2">Kelola Hubungan Wali:</div>
              <div className="row g-2 align-items-center">
                <div className="col-7">
                  <select
                    className="form-select form-select-sm"
                    value={selectedGuardianId}
                    onChange={(e) => setSelectedGuardianId(e.target.value)}
                  >
                    <option value="">Pilih Wali di Posyandu</option>
                    {guardiansList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.phone || 'tanpa HP'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-5 d-flex gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-tp-primary flex-fill"
                    disabled={
                      !selectedGuardianId || selectedGuardianId === String(child.guardian_id)
                    }
                    onClick={() => handleUpdateGuardianRelation(false)}
                  >
                    Kaitkan
                  </button>
                  {child.guardian_id && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleUpdateGuardianRelation(true)}
                    >
                      Lepas
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="tp-card h-100">
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
              <h3 className="h6 fw-bold mb-0">Status Pertumbuhan Terkini</h3>
              {latestActive && (
                <div className="d-flex gap-1">
                  <Link
                    to={`/pengukuran/detail/${latestActive.measurement_id}`}
                    className="btn btn-sm btn-outline-secondary rounded-3"
                  >
                    Detail
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-tp-soft"
                    onClick={() => openReviseModal(latestActive)}
                  >
                    <Icon name="ruler" size={14} />
                    <span>Koreksi</span>
                  </button>
                </div>
              )}
            </div>

            {latestActive?.assessment ? (
              <div>
                <ZScoreBar
                  zScore={latestActive.assessment.z_score}
                  category={latestActive.assessment.category}
                  qualityStatus={latestActive.assessment.quality_status}
                />
                <div className="row g-2 mt-3 pt-2 border-top small">
                  <div className="col-6">
                    <span className="text-secondary">Sesi:</span>{' '}
                    <strong className="font-mono-num">{latestActive.session_date}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-secondary">Usia Ukur:</span>{' '}
                    <strong className="font-mono-num">{latestActive.assessment.age_days} hr</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-secondary">PB/TB Aktual:</span>{' '}
                    <strong className="font-mono-num">{latestActive.length_height_cm} cm</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-secondary">Terkoreksi:</span>{' '}
                    <strong className="font-mono-num">
                      {latestActive.assessment.adjusted_length_height_cm} cm
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-secondary small py-4 text-center">
                Belum ada pengukuran terkirim untuk balita ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {revisingMeasurement && (
        <div
          className="tp-card border-warning"
          style={{ borderWidth: '2px', backgroundColor: '#FFFBEB' }}
        >
          <div className="d-flex justify-content-between align-items-start pb-3 mb-3 border-bottom">
            <div>
              <h3 className="h6 fw-bold mb-1">
                Koreksi Pengukuran Imutabel (Sesi {revisingMeasurement.session_date} - Rev #
                {revisingMeasurement.revision_no})
              </h3>
              <div className="small text-secondary">
                Versi lama tetap tersimpan sebagai <code>voided</code> dan digantikan oleh Revisi #
                {revisingMeasurement.revision_no + 1}.
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setRevisingMeasurement(null)}
              aria-label="Tutup form koreksi"
            />
          </div>

          <form onSubmit={handleReviseSubmit} className="row g-3">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Berat Badan Baru (kg)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                max="50"
                className="form-control font-mono-num"
                value={reviseForm.weight_kg}
                onChange={(e) => setReviseForm({ ...reviseForm, weight_kg: e.target.value })}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold">Panjang / Tinggi Baru (cm)</label>
              <input
                type="number"
                step="0.1"
                min="25"
                max="150"
                className="form-control font-mono-num"
                value={reviseForm.length_height_cm}
                onChange={(e) =>
                  setReviseForm({ ...reviseForm, length_height_cm: e.target.value })
                }
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Cara Pengukuran</label>
              <select
                className="form-select"
                value={reviseForm.position}
                onChange={(e) => setReviseForm({ ...reviseForm, position: e.target.value })}
              >
                <option value="recumbent">Terlentang / PB (&lt; 24 bln)</option>
                <option value="standing">Berdiri / TB (&ge; 24 bln)</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">
                Alasan Koreksi Wajib (Tercatat pada Log Audit)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Koreksi hasil bacaan papan ukur setelah pengukuran ulang."
                value={reviseForm.correction_reason}
                onChange={(e) =>
                  setReviseForm({ ...reviseForm, correction_reason: e.target.value })
                }
                minLength={5}
                required
              />
            </div>

            <div className="col-12 d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setRevisingMeasurement(null)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-tp-primary" disabled={submittingRevise}>
                {submittingRevise
                  ? 'Menyimpan...'
                  : `Simpan Revisi #${revisingMeasurement.revision_no + 1}`}
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <div className="tp-segmented-tabs" role="tablist" aria-label="Detail Pertumbuhan Anak">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'charts'}
            className={`tp-segmented-btn ${activeTab === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveTab('charts')}
          >
            <Icon name="chart" size={16} />
            <span>Grafik Pertumbuhan WHO</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`tp-segmented-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Icon name="clipboard" size={16} />
            <span>Riwayat Tabel & Revisi ({allRevisions.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'attendance'}
            className={`tp-segmented-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <Icon name="calendar" size={16} />
            <span>Kehadiran & Log Audit ({attendances.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'charts' && (
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="tp-card h-100">
              <div className="mb-3">
                <h3 className="h6 fw-bold mb-1">Kurva Pertumbuhan WHO PB/U dan TB/U (0-60 Bulan)</h3>
                <div className="small text-secondary">
                  Garis standar deviasi WHO ({child.sex === 'L' ? 'Laki-laki' : 'Perempuan'}) vs
                  titik ukur balita (menggunakan versi revisi aktif terbaru)
                </div>
              </div>

              <div style={{ height: '320px' }}>
                <Line
                  data={whoChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { title: { display: true, text: 'Umur (Bulan)' } },
                      y: { title: { display: true, text: 'Panjang / Tinggi Badan (cm)' } }
                    },
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="tp-card h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="mb-3">
                  <h3 className="h6 fw-bold mb-1">Grafik Berat Badan Aktual (kg)</h3>
                  <div className="small text-secondary">
                    Perkembangan berat badan lintas sesi Posyandu
                  </div>
                </div>

                <div style={{ height: '275px' }}>
                  {activeHistory.length === 0 ? (
                    <div className="text-center py-5 small text-secondary">
                      Belum ada riwayat berat badan terkirim.
                    </div>
                  ) : (
                    <Line
                      data={weightChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { title: { display: true, text: 'Berat Badan (kg)' }, beginAtZero: false }
                        },
                        plugins: {
                          legend: { position: 'bottom' }
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="p-2 rounded-3 border bg-light small text-secondary mt-3">
                <Icon name="check-shield" size={14} className="text-success me-1" />
                <strong>Disclaimer Klinis:</strong> {CLINICAL_DISCLAIMER}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="d-flex flex-column gap-4">
          <div className="tp-card p-0 overflow-hidden">
            <div className="tp-card-header">
              <div>
                <h3 className="h6 fw-bold mb-1">Riwayat Pengukuran & Rantai Revisi Imutabel</h3>
                <div className="small text-secondary">
                  Menampilkan seluruh versi rekaman termasuk versi yang telah digantikan (voided).
                </div>
              </div>
            </div>

            {allRevisions.length === 0 ? (
              <div className="text-center py-5 small text-secondary">
                Belum ada catatan pengukuran untuk balita ini.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table tp-table">
                  <thead>
                    <tr>
                      <th>Sesi & Versi</th>
                      <th>Usia Ukur</th>
                      <th>Status</th>
                      <th>BB & PB/TB</th>
                      <th>Posisi & Koreksi</th>
                      <th>Z-Score & Kategori</th>
                      <th>Catatan Koreksi / Review</th>
                      <th className="text-end">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRevisions.map((m) => {
                      const catInfo = formatCategoryInfo(m.assessment?.category);
                      const revInfo = formatReviewStatusInfo(m.assessment?.review_status);
                      const isVoided = m.status === 'voided';

                      return (
                        <tr
                          key={m.measurement_id}
                          style={isVoided ? { opacity: 0.65, backgroundColor: '#F8FAFC' } : undefined}
                        >
                          <td>
                            <div className="font-mono-num fw-bold text-dark">{m.session_date}</div>
                            <div className="small text-secondary font-mono-num">
                              Rev #{m.revision_no}
                              {m.supersedes_id ? ` (Ganti #${m.supersedes_id})` : ''}
                            </div>
                          </td>
                          <td className="font-mono-num small">
                            {m.assessment ? (
                              <>
                                <div className="fw-semibold text-dark">
                                  {m.assessment.age_months} bulan
                                </div>
                                <div className="text-secondary">({m.assessment.age_days} hr)</div>
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            <span
                              className={`tp-badge ${
                                m.status === 'submitted'
                                  ? 'tp-badge-green'
                                  : m.status === 'draft'
                                    ? 'tp-badge-amber'
                                    : 'tp-badge-neutral'
                              }`}
                            >
                              {m.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="font-mono-num">
                            <div className="fw-bold text-dark">
                              {m.length_height_cm ? `${m.length_height_cm} cm` : '-'}
                            </div>
                            <div className="small text-secondary">
                              {m.weight_kg ? `${m.weight_kg} kg` : '-'}
                            </div>
                          </td>
                          <td className="small">
                            <div>{formatPositionLabel(m.position)}</div>
                            {m.assessment && (
                              <div className="text-secondary font-mono-num">
                                Terkoreksi: {m.assessment.adjusted_length_height_cm} cm
                              </div>
                            )}
                          </td>
                          <td>
                            {m.assessment ? (
                              <div className="d-flex flex-column align-items-start gap-1">
                                <span className="font-mono-num fw-bold">
                                  {m.assessment.z_score} SD
                                </span>
                                <div className="d-flex flex-wrap gap-1">
                                  <span className={`tp-badge ${catInfo.badgeClass}`}>
                                    {catInfo.label}
                                  </span>
                                  <span className={`tp-badge ${revInfo.badgeClass}`}>
                                    {revInfo.label}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="small" style={{ maxWidth: '250px' }}>
                            {m.correction_reason && (
                              <div className="mb-1">
                                <strong>Koreksi:</strong> {m.correction_reason}
                              </div>
                            )}
                            {m.assessment?.review_note && (
                              <div className="text-secondary">
                                <strong>Review:</strong> {m.assessment.review_note}
                              </div>
                            )}
                            {!m.correction_reason && !m.assessment?.review_note && '-'}
                          </td>
                          <td className="text-end">
                            <div className="d-inline-flex gap-1">
                              <Link
                                to={`/pengukuran/detail/${m.measurement_id}`}
                                className="btn btn-sm btn-outline-secondary rounded-3"
                              >
                                Detail
                              </Link>
                              {m.status === 'submitted' && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-tp-soft"
                                  onClick={() => openReviseModal(m)}
                                >
                                  Koreksi
                                </button>
                              )}
                              {m.status === 'draft' && (
                                <Link
                                  to={`/pengukuran/${m.attendance_id}`}
                                  className="btn btn-sm btn-tp-primary"
                                >
                                  Lanjutkan
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
            )}
          </div>

          {followUps.length > 0 && (
            <div className="tp-card p-0 overflow-hidden">
              <div className="tp-card-header">
                <h3 className="h6 fw-bold mb-0">Tugas Tindak Lanjut Terkait Balita Ini</h3>
              </div>
              <div className="table-responsive">
                <table className="table tp-table">
                  <thead>
                    <tr>
                      <th>ID Tugas</th>
                      <th>Deskripsi</th>
                      <th>Penanggung Jawab</th>
                      <th>Tenggat</th>
                      <th>Status</th>
                      <th className="text-end">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUps.map((f) => {
                      const stInfo = formatFollowUpStatusInfo(f.status);
                      return (
                        <tr key={f.id}>
                          <td className="font-mono-num fw-bold">#{f.id}</td>
                          <td>{f.description}</td>
                          <td>{f.assigned_to_name}</td>
                          <td className="font-mono-num">{f.due_date}</td>
                          <td>
                            <span className={`tp-badge ${stInfo.badgeClass}`}>{stInfo.label}</span>
                          </td>
                          <td className="text-end">
                            <Link to={`/tindak-lanjut/${f.id}`} className="btn btn-sm btn-tp-soft">
                              <span>Buka Tugas</span>
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
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="d-flex flex-column gap-4">
          <div className="tp-card p-0 overflow-hidden">
            <div className="p-3 border-bottom">
              <h3 className="h6 fw-bold text-dark mb-0">Riwayat Kehadiran Sesi Posyandu</h3>
              <p className="small text-secondary mb-0">
                Catatan kehadiran balita pada sesi kegiatan bulanan Posyandu.
              </p>
            </div>

            {attendances.length === 0 ? (
              <div className="text-center py-4 small text-secondary">
                Belum ada catatan kehadiran sesi untuk balita ini.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table tp-table">
                  <thead>
                    <tr>
                      <th>Tanggal Sesi</th>
                      <th>Status Kehadiran</th>
                      <th>Waktu Pencatatan</th>
                      <th>Petugas Pencatat</th>
                      <th className="text-end">Aksi Sesi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.map((a) => (
                      <tr key={a.attendance_id}>
                        <td>
                          <div className="font-mono-num fw-bold text-dark">{a.session_date}</div>
                        </td>
                        <td>
                          <span
                            className={`tp-badge ${
                              a.attendance_status === 'present'
                                ? 'tp-badge-green'
                                : 'tp-badge-neutral'
                            }`}
                          >
                            {a.attendance_status === 'present' ? 'Hadir' : 'Tidak Hadir'}
                          </span>
                        </td>
                        <td className="font-mono-num small text-secondary">{a.recorded_at}</td>
                        <td className="small text-dark">{a.recorded_by_name}</td>
                        <td className="text-end">
                          <Link to={`/sesi/${a.session_id}`} className="btn btn-sm btn-tp-soft">
                            <span>Lihat Sesi</span>
                            <Icon name="arrow-right" size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="tp-card p-0 overflow-hidden">
            <div className="p-3 border-bottom">
              <h3 className="h6 fw-bold text-dark mb-0">Catatan Log Audit Balita</h3>
              <p className="small text-secondary mb-0">
                Rekam jejak registrasi, pembaruan, aktivasi, dan perubahan relasi balita.
              </p>
            </div>

            {audit_history.length === 0 ? (
              <div className="text-center py-4 small text-secondary">
                Belum ada catatan log audit khusus untuk balita ini.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table tp-table">
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Jenis Aksi</th>
                      <th>Petugas</th>
                      <th>Ringkasan Perubahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit_history.map((h) => (
                      <tr key={h.id}>
                        <td className="font-mono-num small text-secondary">{h.occurred_at}</td>
                        <td>
                          <span className="tp-badge tp-badge-neutral font-mono-num">{h.action}</span>
                        </td>
                        <td className="small text-dark fw-semibold">{h.actor_name || '-'}</td>
                        <td className="small text-secondary">{h.change_summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
