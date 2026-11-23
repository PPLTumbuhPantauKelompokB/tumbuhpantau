import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { ZScoreBar } from '../components/ZScoreBar.jsx';
import { Icon } from '../components/Icon.jsx';
import {
  CLINICAL_DISCLAIMER,
  formatPositionLabel,
  formatReviewStatusInfo,
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';

export function MeasurementFormPage() {
  const { attendanceId } = useParams();

  const [contextData, setContextData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [measuredDate, setMeasuredDate] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [lengthHeightCm, setLengthHeightCm] = useState('');
  const [position, setPosition] = useState('recumbent');
  const [requestToken, setRequestToken] = useState(() => `req-${attendanceId}-${Date.now()}`);
  const [previewResult, setPreviewResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAttendanceMeasurement = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiRequest(`/measurements/attendance/${attendanceId}`);
      setContextData(data);

      const active = data.activeMeasurement;
      if (active) {
        setMeasuredDate(
          active.measured_at
            ? String(active.measured_at).slice(0, 10)
            : data.attendance.session_date
        );
        setWeightKg(active.weight_kg !== null ? String(active.weight_kg) : '');
        setLengthHeightCm(active.length_height_cm !== null ? String(active.length_height_cm) : '');
        setPosition(active.position || data.child.recommended_position);
        if (active.assessment) {
          setPreviewResult({
            ageDays: active.assessment.age_days,
            ageMonthsApprox: active.assessment.age_months,
            adjustmentCm: active.assessment.adjustment_cm,
            adjustedLengthHeightCm: active.assessment.adjusted_length_height_cm,
            zScore: active.assessment.z_score,
            category: active.assessment.category,
            qualityStatus: active.assessment.quality_status,
            reviewStatus: active.assessment.review_status,
            reviewReason: active.assessment.review_reason
          });
        } else {
          setPreviewResult(null);
        }
      } else {
        setMeasuredDate(data.attendance.session_date);
        setWeightKg('');
        setLengthHeightCm('');
        setPosition(data.child.recommended_position);
        setPreviewResult(null);
        setRequestToken(`req-${attendanceId}-${Date.now()}`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data formulir pengukuran.');
    } finally {
      setLoading(false);
    }
  }, [attendanceId]);

  useEffect(() => {
    loadAttendanceMeasurement();
  }, [loadAttendanceMeasurement]);

  const handleCalculatePreview = useCallback(async () => {
    if (!contextData || !lengthHeightCm) return;
    const numHeight = Number(lengthHeightCm);
    if (!Number.isFinite(numHeight) || numHeight < 25 || numHeight > 150) return;
    setFeedback(null);
    try {
      const res = await apiRequest('/measurements/preview', {
        method: 'POST',
        silentPopup: true,
        body: {
          birth_date: contextData.child.birth_date,
          measured_at: measuredDate || contextData.attendance.session_date,
          sex: contextData.child.sex,
          length_height_cm: numHeight,
          position
        }
      });
      setPreviewResult(res);
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    }
  }, [contextData, lengthHeightCm, measuredDate, position]);

  useEffect(() => {
    if (!contextData || contextData.activeMeasurement?.status === 'submitted') return;
    const numHeight = Number(lengthHeightCm);
    if (!Number.isFinite(numHeight) || numHeight < 25 || numHeight > 150) return;
    const timer = setTimeout(() => {
      handleCalculatePreview();
    }, 300);
    return () => clearTimeout(timer);
  }, [contextData, lengthHeightCm, position, measuredDate, handleCalculatePreview]);

  const handleSaveDraft = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest(`/attendances/${attendanceId}/measurements/drafts`, {
        method: 'POST',
        body: {
          attendance_id: Number(attendanceId),
          measured_at: measuredDate ? `${measuredDate} 09:00:00` : undefined,
          weight_kg: weightKg !== '' ? Number(weightKg) : null,
          length_height_cm: lengthHeightCm !== '' ? Number(lengthHeightCm) : null,
          position
        }
      });
      setFeedback({
        type: 'info',
        text: 'Draf pengukuran berhasil disimpan (belum menghasilkan Z-Score resmi).'
      });
      await loadAttendanceMeasurement();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDraft = async () => {
    const active = contextData?.activeMeasurement;
    if (!active || active.status !== 'draft') return;
    if (!window.confirm('Yakin ingin membatalkan dan menghapus draf pengukuran ini?')) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest(`/measurements/drafts/${active.id}`, {
        method: 'DELETE'
      });
      setFeedback({
        type: 'info',
        text: 'Draf pengukuran berhasil dibatalkan dan dihapus.'
      });
      await loadAttendanceMeasurement();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal menghapus draf pengukuran.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFinal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiRequest(`/attendances/${attendanceId}/measurements/submit`, {
        method: 'POST',
        body: {
          attendance_id: Number(attendanceId),
          measured_at: measuredDate ? `${measuredDate} 09:00:00` : undefined,
          weight_kg: Number(weightKg),
          length_height_cm: Number(lengthHeightCm),
          position,
          request_token: requestToken
        }
      });
      setFeedback({
        type: 'success',
        text: `Pengukuran berhasil dikirim dan dinilai (Z-Score: ${res.assessment.z_score} SD).`
      });
      await loadAttendanceMeasurement();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !contextData) {
    return (
      <div className="tp-card text-center py-5">
        <div className="spinner-border text-success mb-2" role="status" />
        <div className="small text-secondary">Memuat formulir pengukuran...</div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="alert alert-danger">{errorMsg}</div>;
  }

  if (!contextData) return null;

  const { attendance, child, activeMeasurement } = contextData;
  const isSubmitted = activeMeasurement?.status === 'submitted';
  const isDraft = activeMeasurement?.status === 'draft';
  const isPositionMismatch = position !== child.recommended_position;
  const avatarTone = getAvatarToneClass(child.internal_code || child.name);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <Link
          to={`/sesi/${attendance.session_id}`}
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-3"
        >
          <Icon name="arrow-left" size={16} />
          <span>Kembali ke Sesi {attendance.session_date}</span>
        </Link>

        <div className="d-flex flex-wrap gap-2">
          {activeMeasurement && (
            <Link
              to={`/pengukuran/detail/${activeMeasurement.id}`}
              className="btn btn-sm btn-outline-secondary rounded-3 d-inline-flex align-items-center gap-1"
            >
              <Icon name="eye" size={15} />
              <span>Detail Catatan & Versi (#{activeMeasurement.id})</span>
            </Link>
          )}
          <Link to={`/anak/${child.id}`} className="btn btn-sm btn-tp-soft">
            <span>Profil & Kurva {child.name}</span>
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type} py-2 small mb-0 rounded-3`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="tp-card h-100">
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-3">
                <span className={`tp-avatar ${avatarTone}`}>{getInitials(child.name)}</span>
                <div>
                  <h2 className="h5 fw-bold text-dark mb-0">{child.name}</h2>
                  <div className="small text-secondary font-mono-num">
                    {child.internal_code} &middot; Usia sesi: {child.age_months_at_session} bln (
                    {child.age_days_at_session} hr)
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
                {isSubmitted
                  ? `Terkirim (Rev #${activeMeasurement.revision_no})`
                  : isDraft
                    ? 'Mode Draf'
                    : 'Input Baru'}
              </span>
            </div>

            <form onSubmit={handleSubmitFinal}>
              <div className="row g-4">
                <div className="col-md-4">
                  <label htmlFor="input-date" className="form-label small fw-bold text-dark">
                    1. Tanggal Ukur
                  </label>
                  <input
                    id="input-date"
                    type="date"
                    className="form-control font-mono-num"
                    style={{ minHeight: '48px' }}
                    value={measuredDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setMeasuredDate(e.target.value)}
                    disabled={isSubmitted}
                    required
                  />
                  <div className="form-text small">Tidak boleh di masa depan</div>
                </div>

                <div className="col-md-4">
                  <label htmlFor="input-weight" className="form-label small fw-bold text-dark">
                    2. Berat Badan (kg)
                  </label>
                  <input
                    id="input-weight"
                    type="number"
                    step="0.01"
                    min="1.0"
                    max="50.0"
                    className="form-control tp-large-number-input"
                    placeholder="0.00"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    disabled={isSubmitted}
                    required
                  />
                  <div className="form-text small">Rentang valid: 1,0 - 50,0 kg</div>
                </div>

                <div className="col-md-4">
                  <label htmlFor="input-height" className="form-label small fw-bold text-dark">
                    3. PB / TB (cm)
                  </label>
                  <input
                    id="input-height"
                    type="number"
                    step="0.1"
                    min="25.0"
                    max="150.0"
                    className="form-control tp-large-number-input"
                    placeholder="0.0"
                    value={lengthHeightCm}
                    onChange={(e) => setLengthHeightCm(e.target.value)}
                    disabled={isSubmitted}
                    required
                  />
                  <div className="form-text small">Rentang valid: 25,0 - 150,0 cm</div>
                </div>

                <div className="col-12">
                  <label className="form-label small fw-bold text-dark d-block mb-2">
                    4. Pilih Posisi Pengukuran
                  </label>
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <button
                        type="button"
                        className={`tp-radio-card ${position === 'recumbent' ? 'selected' : ''}`}
                        onClick={() => !isSubmitted && setPosition('recumbent')}
                        disabled={isSubmitted}
                      >
                        <div className="tp-stat-icon-box tp-stat-icon-green" style={{ width: '42px', height: '42px' }}>
                          <Icon name="ruler" size={20} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">Terlentang (PB)</div>
                          <div className="small text-secondary">
                            Standar usia &lt; 24 bulan (731 hari)
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="col-sm-6">
                      <button
                        type="button"
                        className={`tp-radio-card ${position === 'standing' ? 'selected' : ''}`}
                        onClick={() => !isSubmitted && setPosition('standing')}
                        disabled={isSubmitted}
                      >
                        <div className="tp-stat-icon-box tp-stat-icon-blue" style={{ width: '42px', height: '42px' }}>
                          <Icon name="child" size={20} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">Berdiri (TB)</div>
                          <div className="small text-secondary">
                            Standar usia &ge; 24 bulan (731 hari)
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {isPositionMismatch && (
                    <div className="alert alert-warning py-2 px-3 mt-3 mb-0 small rounded-3 d-flex align-items-center gap-2">
                      <Icon name="alert-circle" size={18} />
                      <span>
                        Usia anak <strong>{child.age_days_at_session} hari</strong> diukur{' '}
                        <strong>{formatPositionLabel(position)}</strong>. Koreksi otomatis{' '}
                        <strong className="font-mono-num">
                          {child.age_days_at_session < 731 ? '+0,7 cm' : '-0,7 cm'}
                        </strong>{' '}
                        diterapkan sesuai Permenkes No. 2/2020.
                      </span>
                    </div>
                  )}
                </div>

                {!isSubmitted ? (
                  <div className="col-12 d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 border-top">
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-tp-soft"
                        onClick={handleCalculatePreview}
                        disabled={!lengthHeightCm}
                      >
                        <Icon name="chart" size={16} />
                        <span>Pratinjau Z-Score</span>
                      </button>

                      {isDraft && (
                        <button
                          type="button"
                          className="btn btn-outline-danger rounded-3"
                          onClick={handleDeleteDraft}
                          disabled={submitting}
                        >
                          Batalkan Draf
                        </button>
                      )}
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary rounded-3"
                        onClick={handleSaveDraft}
                        disabled={submitting}
                      >
                        Simpan Draf
                      </button>
                      <button
                        type="submit"
                        className="btn btn-tp-primary"
                        disabled={submitting}
                      >
                        <Icon name="check-shield" size={16} />
                        <span>{submitting ? 'Memproses...' : 'Kirim Pengukuran'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="col-12 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="small text-secondary">
                      Hasil ukur telah terkirim dan dikunci secara imutabel.
                    </div>
                    <div className="d-flex gap-2">
                      <Link
                        to={`/pengukuran/detail/${activeMeasurement.id}`}
                        className="btn btn-sm btn-outline-secondary rounded-3"
                      >
                        <span>Lihat Detail & Versi</span>
                      </Link>
                      <Link to={`/anak/${child.id}`} className="btn btn-sm btn-tp-soft">
                        <span>Koreksi Nilai di Profil Anak</span>
                        <Icon name="arrow-right" size={15} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="tp-card h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="pb-3 mb-3 border-bottom">
                <h3 className="h6 fw-bold mb-1">Indikator Z-Score WHO</h3>
                <div className="small text-secondary">
                  Panjang/Tinggi Badan menurut Umur (PB/U dan TB/U)
                </div>
              </div>

              {previewResult ? (
                <div className="d-flex flex-column gap-3">
                  <ZScoreBar
                    zScore={previewResult.zScore}
                    category={previewResult.category}
                    qualityStatus={previewResult.qualityStatus}
                  />

                  <div className="row g-2 pt-2">
                    <div className="col-4">
                      <div className="p-2 rounded-3 border bg-light text-center">
                        <div className="small text-secondary">Usia Hari</div>
                        <div className="font-mono-num fw-bold text-dark">
                          {previewResult.ageDays} hr
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 rounded-3 border bg-light text-center">
                        <div className="small text-secondary">Koreksi</div>
                        <div className="font-mono-num fw-bold text-dark">
                          {previewResult.adjustmentCm >= 0
                            ? `+${previewResult.adjustmentCm}`
                            : previewResult.adjustmentCm}{' '}
                          cm
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 rounded-3 border bg-light text-center">
                        <div className="small text-secondary">Terkoreksi</div>
                        <div className="font-mono-num fw-bold text-dark">
                          {previewResult.adjustedLengthHeightCm} cm
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center p-3 rounded-3 border bg-white small">
                    <span className="text-secondary fw-semibold">Status Antrean Puskesmas:</span>
                    <span
                      className={`tp-badge ${
                        formatReviewStatusInfo(previewResult.reviewStatus).badgeClass
                      }`}
                    >
                      {formatReviewStatusInfo(previewResult.reviewStatus).label}
                    </span>
                  </div>

                  {previewResult.reviewReason && (
                    <div className="alert alert-warning py-2 px-3 small mb-0 rounded-3">
                      <strong>Catatan Otomatis:</strong> {previewResult.reviewReason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-5 small text-secondary">
                  <div className="tp-stat-icon-box tp-stat-icon-green mx-auto mb-3">
                    <Icon name="ruler" size={24} />
                  </div>
                  Masukkan PB/TB lalu klik <strong>Pratinjau Z-Score</strong> untuk melihat posisi
                  pertumbuhan balita pada kurva WHO.
                </div>
              )}
            </div>

            <div className="p-2 rounded-3 border bg-light small text-secondary mt-3">
              <Icon name="check-shield" size={14} className="text-success me-1" />
              <strong>Disclaimer Klinis:</strong> {CLINICAL_DISCLAIMER}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
