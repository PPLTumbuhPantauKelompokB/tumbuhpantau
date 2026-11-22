import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';

export function GuardianDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadGuardianDetail = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest(`/guardians/${id}`);
      setData(res);
      setEditForm({
        name: res.guardian.name,
        phone: res.guardian.phone || '',
        address: res.guardian.address || ''
      });
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat profil orang tua/wali.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGuardianDetail();
  }, [loadGuardianDetail]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest(`/guardians/${id}`, {
        method: 'PUT',
        body: editForm
      });
      setEditMode(false);
      setFeedback({ type: 'success', text: 'Data orang tua/wali berhasil diperbarui.' });
      await loadGuardianDetail();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal menyimpan perubahan.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="tp-card text-center py-5">
        <div className="small text-secondary">Memuat profil wali...</div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="alert alert-danger">{errorMsg}</div>;
  }

  if (!data) return null;

  const { guardian, children = [] } = data;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <Link
          to="/wali"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-3"
        >
          <Icon name="arrow-left" size={16} />
          <span>Kembali ke Daftar Wali</span>
        </Link>

        {!editMode && (
          <button
            type="button"
            className="btn btn-sm btn-tp-soft"
            onClick={() => setEditMode(true)}
          >
            <Icon name="edit" size={15} />
            <span>Ubah Kontak / Data</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type} py-2 small mb-0 rounded-3`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="tp-hero-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-0">
        <div>
          <span className="tp-badge tp-badge-blue mb-1">
            <Icon name="users" size={14} /> Profil Orang Tua / Wali
          </span>
          <h2 className="h5 fw-bold text-dark mb-0">{guardian.name}</h2>
          <div className="small text-secondary font-mono-num mt-1">
            {guardian.posyandu_name} ({guardian.posyandu_code})
          </div>
        </div>

        <span className="tp-badge tp-badge-green font-mono-num">
          {children.length} Balita Diasuh
        </span>
      </div>

      {editMode && (
        <div className="tp-card border-success" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
            <h3 className="h6 fw-bold mb-0">Ubah Informasi Kontak Wali</h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setEditMode(false)}
              aria-label="Tutup form"
            />
          </div>

          <form onSubmit={handleUpdate} className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Nama Lengkap</label>
              <input
                type="text"
                className="form-control"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Nomor Telepon</label>
              <input
                type="text"
                className="form-control font-mono-num"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="0812-xxxx-xxxx"
              />
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Alamat Tempat Tinggal</label>
              <input
                type="text"
                className="form-control"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
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
        <div className="col-lg-5">
          <div className="tp-card h-100">
            <h3 className="h6 fw-bold text-dark mb-3">Rincian Kontak & Domisili</h3>
            <div className="d-flex flex-column gap-2 small">
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Nama Lengkap:</span>
                <span className="fw-semibold text-dark">{guardian.name}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Telepon:</span>
                <span className="font-mono-num text-dark">{guardian.phone || '-'}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-secondary">Alamat:</span>
                <span className="text-dark">{guardian.address || '-'}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-secondary">Unit Posyandu:</span>
                <span className="fw-semibold text-dark">{guardian.posyandu_name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="tp-card p-0 overflow-hidden h-100">
            <div className="p-3 border-bottom">
              <h3 className="h6 fw-bold text-dark mb-0">Daftar Balita yang Diasuh</h3>
              <p className="small text-secondary mb-0">
                Balita yang tercatat memiliki relasi dengan wali ini.
              </p>
            </div>

            {children.length === 0 ? (
              <div className="text-center py-4 small text-secondary">
                Tidak ada balita yang saat ini terhubung ke wali ini.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table tp-table">
                  <thead>
                    <tr>
                      <th>Nama Balita</th>
                      <th>Kode Internal</th>
                      <th>Hubungan</th>
                      <th>Status</th>
                      <th className="text-end">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="fw-bold text-dark">{c.name}</div>
                          <div className="small text-secondary">{c.birth_date}</div>
                        </td>
                        <td>
                          <span className="font-mono-num small text-dark">{c.internal_code}</span>
                        </td>
                        <td>
                          <span className="small text-secondary">{c.guardian_relationship}</span>
                        </td>
                        <td>
                          <span
                            className={`tp-badge ${
                              c.is_active ? 'tp-badge-green' : 'tp-badge-neutral'
                            }`}
                          >
                            {c.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="text-end">
                          <Link to={`/anak/${c.id}`} className="btn btn-sm btn-tp-soft">
                            <span>Profil</span>
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
        </div>
      </div>
    </div>
  );
}
