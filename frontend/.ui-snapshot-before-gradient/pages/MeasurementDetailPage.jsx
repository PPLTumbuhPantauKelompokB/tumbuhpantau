import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { ZScoreBar } from '../components/ZScoreBar.jsx';
import { Icon } from '../components/Icon.jsx';
import {
  CLINICAL_DISCLAIMER,
  formatCategoryInfo,
  formatPositionLabel,
  formatReviewStatusInfo,
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';

export function MeasurementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [showReviseForm, setShowReviseForm] = useState(false);
  const [reviseForm, setReviseForm] = useState({
    weight_kg: '',
    length_height_cm: '',
    position: 'recumbent',
    correction_reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest(`/measurements/${id}`);
      setData(res);
      if (res?.measurement) {
        setReviseForm({
          weight_kg: res.measurement.weight_kg !== null ? String(res.measurement.weight_kg) : '',
          length_height_cm:
            res.measurement.length_height_cm !== null ? String(res.measurement.length_height_cm) : '',
          position: res.measurement.position || 'recumbent',
          correction_reason: ''
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat detail catatan pengukuran.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleReviseSubmit = async (e) => {
    e.preventDefault();
    if (!data?.measurement) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiRequest(`/measurements/${data.measurement.id}/revisions`, {
        method: 'POST',
        body: {
          weight_kg: Number(reviseForm.weight_kg),
          length_height_cm: Number(reviseForm.length_height_cm),
          position: reviseForm.position,
          correction_reason: reviseForm.correction_reason,
          expected_revision_no: data.measurement.revision_no
        }
      });
      setShowReviseForm(false);
      setFeedback({
        type: 'success',
        text: `Berhasil membuat Revisi #${res.measurement.revision_no} (Z-Score: ${res.assessment.z_score} SD).`
      });
      navigate(`/pengukuran/detail/${res.measurement.id}`);
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal menyimpan revisi pengukuran.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!data?.measurement || data.measurement.status !== 'draft') return;
    if (!window.confirm('Yakin ingin membatalkan dan menghapus draf pengukuran ini?')) {
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest(`/measurements/drafts/${data.measurement.id}`, {
        method: 'DELETE'
      });
      navigate(`/sesi/${data.measurement.session_id}`);
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal menghapus draf.' });
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="tp-card text-center py-5">
        <div className="spinner-border text-success mb-2" role="status" />
        <div className="small text-secondary">Memuat detail catatan pengukuran...</div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="alert alert-danger">{errorMsg}</div>;
  }

  if (!data) return null;

  const { measurement, child, revision_history = [], disclaimer } = data;
  const avatarTone = getAvatarToneClass(child.internal_code || child.name);
  const isSubmitted = measurement.status === 'submitted';
  const isDraft = measurement.status === 'draft';
  const isVoided = measurement.status === 'voided';

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex flex-wrap gap-2">
          <Link
            to={`/anak/${child.id}`}
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-3"
          >
            <Icon name="arrow-left" size={16} />
            <span>Profil Balita ({child.name})</span>
          </Link>
          <Link
            to={`/sesi/${measurement.session_id}`}
            className="btn btn-sm btn-outline-secondary rounded-3"
          >
            <span>Lihat Sesi {measurement.session_date}</span>
          </Link>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {isSubmitted && (
            <button
              type="button"
              className="btn btn-sm btn-tp-primary"
              onClick={() => setShowReviseForm((prev) => !prev)}
            >
              <Icon name="edit" size={15} />
              <span>{showReviseForm ? 'Tutup Form Koreksi' : 'Koreksi / Buat Revisi Baru'}</span>
            </button>
          )}
          {isDraft && (
            <>
              <Link
                to={`/pengukuran/${measurement.attendance_id}`}
                className="btn btn-sm btn-tp-primary"
              >
                <Icon name="ruler" size={15} />
                <span>Lanjutkan Input Draf</span>
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger rounded-3"
                onClick={handleDeleteDraft}
                disabled={submitting}
              >
                Batalkan Draf
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type} py-2 small mb-0 rounded-3`} role="alert">
          {feedback.text}
        </div>
      )}

      {isVoided && (
        <div className="alert alert-secondary py-2 px-3 small mb-0 rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span>
            <strong>Arsip Versi Lama (Voided):</strong> Catatan pengukuran Revisi #
            {measurement.revision_no} ini telah digantikan oleh revisi yang lebih baru dan disimpan
            sebagai arsip audit (baca saja).
          </span>
          {revision_history.find((r) => r.status === 'submitted') && (
            <Link
              to={`/pengukuran/detail/${revision_history.find((r) => r.status === 'submitted').id}`}
              className="btn btn-sm btn-tp-soft"
            >
              Buka Versi Aktif Terbaru
            </Link>
          )}
        </div>
      )}

      {showReviseForm && isSubmitted && (
        <div
          className="tp-card border-warning"
          style={{ borderWidth: '2px', backgroundColor: '#FFFBEB' }}
        >
          <div className="d-flex justify-content-between align-items-start pb-3 mb-3 border-bottom">
            <div>
              <h3 className="h6 fw-bold mb-1">
                Koreksi Pengukuran Imutabel (Dari Revisi #{measurement.revision_no} ke Revisi #
                {measurement.revision_no + 1})
              </h3>
              <div className="small text-secondary">
                Baris lama (#{measurement.id}) tidak diedit, melainkan ditandai <code>voided</code>{' '}
                dan ditautkan via <code>supersedes_id</code>.
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowReviseForm(false)}
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
              <label className="form-label small fw-semibold">Posisi Pengukuran</label>
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
                Alasan Koreksi Wajib (Minimal 5 Karakter)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Koreksi hasil bacaan papan ukur panjang badan setelah verifikasi ulang."
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
                onClick={() => setShowReviseForm(false)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-tp-primary" disabled={submitting}>
                {submitting
                  ? 'Menyimpan...'
                  : `Simpan Revisi #${measurement.revision_no + 1}`}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="tp-card h-100">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-3">
                <span className={`tp-avatar ${avatarTone}`} style={{ width: '46px', height: '46px' }}>
                  {getInitials(child.name)}
                </span>
                <div>
                  <div className="small text-secondary font-mono-num">
                    Catatan Pengukuran #{measurement.id} &middot; Revisi #{measurement.revision_no}
                  </div>
                  <h2 className="h5 fw-bold text-dark mb-0">{child.name}</h2>
                  <div className="small text-secondary font-mono-num">
                    {child.internal_code} &middot; {measurement.posyandu_name} ({measurement.posyandu_code})
                  </div>
                </div>
              </div>

              <span
                className={`tp-badge ${
                  isSubmitted
                    ? 'tp-badge-green'
                    : isDraft
                      ? 'tp-badge-amber'
                      : 'tp-badge-neutral'
                }`}
              >
                {isSubmitted ? 'SUBMITTED (Aktif)' : isDraft ? 'DRAFT' : 'VOIDED (Digantikan)'}
              </span>
            </div>

            <div className="row g-3 small">
              <div className="col-sm-6">
                <div className="text-secondary">Tanggal & Waktu Ukur</div>
                <div className="fw-bold font-mono-num text-dark">{measurement.measured_at}</div>
              </div>
              <div className="col-sm-6">
                <div className="text-secondary">Petugas Pencatat</div>
                <div className="fw-bold text-dark">{measurement.created_by_name}</div>
              </div>
              <div className="col-sm-4">
                <div className="p-3 rounded-3 border bg-light">
                  <div className="text-secondary">Berat Badan</div>
                  <div className="fs-5 fw-bold font-mono-num text-dark">
                    {measurement.weight_kg !== null ? `${measurement.weight_kg} kg` : '-'}
                  </div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="p-3 rounded-3 border bg-light">
                  <div className="text-secondary">PB / TB Aktual</div>
                  <div className="fs-5 fw-bold font-mono-num text-dark">
                    {measurement.length_height_cm !== null
                      ? `${measurement.length_height_cm} cm`
                      : '-'}
                  </div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="p-3 rounded-3 border bg-light">
                  <div className="text-secondary">Posisi Ukur</div>
                  <div className="fw-bold text-dark mt-1">
                    {formatPositionLabel(measurement.position)}
                  </div>
                </div>
              </div>

              <div className="col-sm-6">
                <div className="text-secondary">Nomor Revisi (`revision_no`)</div>
                <div className="fw-bold font-mono-num text-dark">
                  Revisi #{measurement.revision_no}
                  {measurement.supersedes_id
                    ? ` (Menggantikan catatan #${measurement.supersedes_id})`
                    : ' (Catatan Awal)'}
                </div>
              </div>

              <div className="col-sm-6">
                <div className="text-secondary">Token Idempotensi</div>
                <div className="font-mono-num text-secondary text-truncate">
                  {measurement.request_token}
                </div>
              </div>

              {measurement.correction_reason && (
                <div className="col-12">
                  <div
                    className="p-3 rounded-3 border"
                    style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}
                  >
                    <div className="fw-bold text-dark mb-1">
                      Alasan Koreksi (`correction_reason`):
                    </div>
                    <div className="text-dark">{measurement.correction_reason}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="tp-card h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="pb-3 mb-3 border-bottom">
                <h3 className="h6 fw-bold mb-1">Penilaian Antropometri WHO</h3>
                <div className="small text-secondary">
                  Standar Permenkes RI No. 2 Tahun 2020 (PB/U dan TB/U)
                </div>
              </div>

              {measurement.assessment ? (
                <div className="d-flex flex-column gap-3">
                  <ZScoreBar
                    zScore={measurement.assessment.z_score}
                    category={measurement.assessment.category}
                    qualityStatus={measurement.assessment.quality_status}
                  />

                  <div className="row g-2 pt-2">
                    <div className="col-4">
                      <div className="p-2 rounded-3 border bg-light text-center">
                        <div className="small text-secondary">Usia Ukur</div>
                        <div className="font-mono-num fw-bold text-dark">
                          {measurement.assessment.age_days} hr
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 rounded-3 border bg-light text-center">
                        <div className="small text-secondary">Koreksi Posisi</div>
                        <div className="font-mono-num fw-bold text-dark">
                          {measurement.assessment.adjustment_cm >= 0
                            ? `+${measurement.assessment.adjustment_cm}`
                            : measurement.assessment.adjustment_cm}{' '}
                          cm
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 rounded-3 border bg-light text-center">
                        <div className="small text-secondary">PB/TB Terkoreksi</div>
                        <div className="font-mono-num fw-bold text-dark">
                          {measurement.assessment.adjusted_length_height_cm} cm
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-3 border bg-white small">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-secondary fw-semibold">Status Verifikasi Puskesmas:</span>
                      <span
                        className={`tp-badge ${
                          formatReviewStatusInfo(measurement.assessment.review_status).badgeClass
                        }`}
                      >
                        {formatReviewStatusInfo(measurement.assessment.review_status).label}
                      </span>
                    </div>
                    {measurement.assessment.reviewed_by_name && (
                      <div className="text-secondary mt-2 pt-2 border-top">
                        <div>
                          <strong>Ditinjau oleh:</strong> {measurement.assessment.reviewed_by_name}{' '}
                          ({measurement.assessment.reviewed_at})
                        </div>
                        {measurement.assessment.review_note && (
                          <div>
                            <strong>Catatan:</strong> {measurement.assessment.review_note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 small text-secondary">
                  Catatan pengukuran ini masih berstatus draf dan belum memiliki kalkulasi Z-Score
                  resmi.
                </div>
              )}
            </div>

            <div className="p-2 rounded-3 border bg-light small text-secondary mt-3">
              <Icon name="check-shield" size={14} className="text-success me-1" />
              <strong>Disclaimer:</strong> {disclaimer || CLINICAL_DISCLAIMER}
            </div>
          </div>
        </div>
      </div>

      <div className="tp-card p-0 overflow-hidden">
        <div className="tp-card-header">
          <div>
            <h3 className="h6 fw-bold mb-1">
              Riwayat Versi pada Kehadiran Sesi Ini ({revision_history.length} Versi)
            </h3>
            <div className="small text-secondary">
              Seluruh versi revisi tersimpan secara permanen (append-only) tanpa mengubah riwayat
              sebelumnya.
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table tp-table">
            <thead>
              <tr>
                <th>Versi & ID</th>
                <th>Waktu Ukur</th>
                <th>Status</th>
                <th>BB & PB/TB</th>
                <th>Posisi & Terkoreksi</th>
                <th>Z-Score & Kategori</th>
                <th>Pencatat & Alasan Koreksi</th>
                <th className="text-end">Lihat Versi</th>
              </tr>
            </thead>
            <tbody>
              {revision_history.map((ver) => {
                const catInfo = formatCategoryInfo(ver.assessment?.category);
                const isCurrentView = ver.id === measurement.id;
                return (
                  <tr
                    key={ver.id}
                    style={
                      ver.status === 'voided'
                        ? { opacity: 0.72, backgroundColor: '#F8FAFC' }
                        : undefined
                    }
                  >
                    <td className="font-mono-num">
                      <div className="fw-bold text-dark">
                        Rev #{ver.revision_no} (#{ver.id})
                      </div>
                      {ver.supersedes_id && (
                        <div className="small text-secondary">
                          Menggantikan #{ver.supersedes_id}
                        </div>
                      )}
                    </td>
                    <td className="font-mono-num small">{ver.measured_at}</td>
                    <td>
                      <span
                        className={`tp-badge ${
                          ver.status === 'submitted'
                            ? 'tp-badge-green'
                            : ver.status === 'draft'
                              ? 'tp-badge-amber'
                              : 'tp-badge-neutral'
                        }`}
                      >
                        {ver.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-mono-num">
                      <div className="fw-bold text-dark">
                        {ver.length_height_cm !== null ? `${ver.length_height_cm} cm` : '-'}
                      </div>
                      <div className="small text-secondary">
                        {ver.weight_kg !== null ? `${ver.weight_kg} kg` : '-'}
                      </div>
                    </td>
                    <td className="small">
                      <div>{formatPositionLabel(ver.position)}</div>
                      {ver.assessment && (
                        <div className="font-mono-num text-secondary">
                          Terkoreksi: {ver.assessment.adjusted_length_height_cm} cm
                        </div>
                      )}
                    </td>
                    <td>
                      {ver.assessment ? (
                        <div className="d-flex flex-column align-items-start gap-1">
                          <span className="font-mono-num fw-bold">
                            {ver.assessment.z_score} SD
                          </span>
                          <span className={`tp-badge ${catInfo.badgeClass}`}>{catInfo.label}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="small" style={{ maxWidth: '280px' }}>
                      <div className="fw-semibold text-dark">{ver.created_by_name}</div>
                      {ver.correction_reason ? (
                        <div className="text-secondary">Alasan: {ver.correction_reason}</div>
                      ) : (
                        <div className="text-secondary">Pencatatan awal</div>
                      )}
                    </td>
                    <td className="text-end">
                      {isCurrentView ? (
                        <span className="tp-badge tp-badge-blue">Sedang Dilihat</span>
                      ) : (
                        <Link
                          to={`/pengukuran/detail/${ver.id}`}
                          className="btn btn-sm btn-outline-secondary rounded-3"
                        >
                          Buka Versi #{ver.revision_no}
                        </Link>
                      )}
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
