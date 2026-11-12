import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';
import { Icon } from '../components/Icon.jsx';

export function ChildDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

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

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest(`/children/${id}`);
      setData(res);
      setEditForm({
        name: res.child.name,
        guardian_name: res.child.guardian_name,
        guardian_phone: res.child.guardian_phone,
        guardian_relationship: res.child.guardian_relationship,
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

  if (loading && !data) {
    return (
      <div className="tp-card text-center py-5">
        <div className="small text-secondary">Memuat profil balita...</div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="alert alert-danger">{errorMsg}</div>;
  }

  if (!data) return null;

  const { child, attendances = [], audit_history = [] } = data;
  const avatarTone = getAvatarToneClass(child.internal_code || child.name);

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
          {child.inactive_on === null && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-3"
              onClick={handleDeactivate}
            >
              Nonaktifkan Balita
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
          <span className={`tp-avatar ${avatarTone}`} style={{ width: '48px', height: '48px', fontSize: '1rem' }}>
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
            {child.inactive_on ? 'Nonaktif' : 'Aktif'}
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
        <div className="col-lg-6">
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
                <span className="fw-semibold text-dark">{child.posyandu_name} ({child.posyandu_code})</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-secondary">Puskesmas Pembina:</span>
                <span className="text-dark">{child.puskesmas_name || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
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
                <span className="font-mono-num text-dark">{child.guardian_phone || 'Belum diisi'}</span>
              </div>
            </div>

            <div className="border-top pt-3">
              <div className="fw-semibold small text-dark mb-2">Kelola Hubungan Wali (SCRUM-19):</div>
              <div className="row g-2 align-items-center">
                <div className="col-7">
                  <select
                    className="form-select form-select-sm"
                    value={selectedGuardianId}
                    onChange={(e) => setSelectedGuardianId(e.target.value)}
                  >
                    <option value="">Pilih Wali Lain di Posyandu</option>
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
                    disabled={!selectedGuardianId || selectedGuardianId === String(child.guardian_id)}
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
      </div>

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
                          a.attendance_status === 'present' ? 'tp-badge-green' : 'tp-badge-neutral'
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
            Rekam jejak registrasi, pembaruan, dan perubahan relasi balita.
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
  );
}
