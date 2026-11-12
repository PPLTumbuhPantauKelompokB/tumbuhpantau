import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';
import { Icon } from '../components/Icon.jsx';

export function ChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [orgFilter, setOrgFilter] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState({
    organization_id: user?.role === 'kader' ? String(user.organization_id) : '',
    name: '',
    birth_date: '2025-05-15',
    sex: 'L',
    guardian_name: '',
    guardian_phone: '',
    guardian_relationship: 'Ibu'
  });
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (orgFilter) params.set('organization_id', orgFilter);

      const data = await apiRequest(`/children?${params.toString()}`);
      setChildren(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar balita.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, orgFilter]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    apiRequest('/organizations')
      .then((orgs) => {
        const posyandus = (orgs || []).filter((o) => o.type === 'posyandu' && o.is_active);
        setOrganizations(posyandus);
        if (!formState.organization_id && posyandus.length > 0) {
          setFormState((prev) => ({ ...prev, organization_id: String(posyandus[0].id) }));
        }
      })
      .catch(() => {});
  }, []);

  const submitChildRegistration = async (forceCreate = false) => {
    setSubmitting(true);
    setFormFeedback(null);
    try {
      const created = await apiRequest('/children', {
        method: 'POST',
        body: {
          ...formState,
          organization_id: Number(formState.organization_id || user.organization_id),
          force_create: forceCreate
        }
      });
      setDuplicateWarning(null);
      setShowCreateForm(false);
      setFormState((prev) => ({
        ...prev,
        name: '',
        guardian_name: '',
        guardian_phone: ''
      }));
      setFormFeedback({
        type: 'success',
        text: `Balita ${created.name} berhasil didaftarkan dengan kode ${created.internal_code}.`
      });
      await loadChildren();
    } catch (err) {
      if (err.code === 'DUPLICATE_CHILD_WARNING') {
        setDuplicateWarning({
          message: err.message
        });
      } else {
        setFormFeedback({
          type: 'danger',
          text: err.message || 'Gagal mendaftarkan balita.'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    submitChildRegistration(false);
  };

  return (
    <div className="d-flex flex-column gap-4">
      {formFeedback && (
        <div
          className={`alert alert-${formFeedback.type} d-flex justify-content-between align-items-center mb-0 rounded-3`}
          role="alert"
        >
          <span>{formFeedback.text}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setFormFeedback(null)}
            aria-label="Tutup pesan"
          />
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h5 fw-bold text-dark mb-1">Data Balita Terdaftar</h2>
          <p className="small text-secondary mb-0">
            Daftar anak usia 0-59 bulan dengan kode unik Posyandu dan data orang tua/wali.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-tp-primary"
          onClick={() => {
            setShowCreateForm((prev) => !prev);
            setDuplicateWarning(null);
          }}
        >
          <Icon name={showCreateForm ? 'close' : 'plus'} size={17} />
          <span>{showCreateForm ? 'Tutup Form' : 'Daftar Balita Baru'}</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="tp-card border-success" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
            <div>
              <h3 className="h6 fw-bold mb-0">Pendaftaran Balita Baru (0-59 Bulan)</h3>
              <div className="small text-secondary">
                Kode unik internal akan dibuat otomatis berdasarkan unit Posyandu.
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowCreateForm(false)}
              aria-label="Tutup form pendaftaran"
            />
          </div>

          {duplicateWarning && (
            <div className="alert alert-warning rounded-3">
              <div className="fw-bold mb-1">Peringatan Kemungkinan Data Duplikat</div>
              <div className="small mb-2">{duplicateWarning.message}</div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-warning fw-semibold"
                  onClick={() => submitChildRegistration(true)}
                  disabled={submitting}
                >
                  Tetap Simpan (Balita Berbeda)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setDuplicateWarning(null)}
                >
                  Periksa Kembali
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateSubmit}>
            <div className="row g-3">
              {user?.role !== 'kader' && (
                <div className="col-md-4">
                  <label htmlFor="child-org" className="form-label small fw-semibold">
                    Unit Posyandu
                  </label>
                  <select
                    id="child-org"
                    className="form-select"
                    value={formState.organization_id}
                    onChange={(e) =>
                      setFormState({ ...formState, organization_id: e.target.value })
                    }
                    required
                  >
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-md-4">
                <label htmlFor="child-name" className="form-label small fw-semibold">
                  Nama Lengkap Balita
                </label>
                <input
                  id="child-name"
                  type="text"
                  className="form-control"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="Contoh: Arka Pratama"
                  required
                />
              </div>

              <div className="col-md-2">
                <label htmlFor="child-dob" className="form-label small fw-semibold">
                  Tanggal Lahir
                </label>
                <input
                  id="child-dob"
                  type="date"
                  className="form-control font-mono-num"
                  value={formState.birth_date}
                  onChange={(e) => setFormState({ ...formState, birth_date: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-2">
                <label htmlFor="child-sex" className="form-label small fw-semibold">
                  Jenis Kelamin
                </label>
                <select
                  id="child-sex"
                  className="form-select"
                  value={formState.sex}
                  onChange={(e) => setFormState({ ...formState, sex: e.target.value })}
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div className="col-md-4">
                <label htmlFor="guardian-name" className="form-label small fw-semibold">
                  Nama Orang Tua / Wali
                </label>
                <input
                  id="guardian-name"
                  type="text"
                  className="form-control"
                  value={formState.guardian_name}
                  onChange={(e) => setFormState({ ...formState, guardian_name: e.target.value })}
                  placeholder="Contoh: Ibu Wulandari"
                  required
                />
              </div>

              <div className="col-md-4">
                <label htmlFor="guardian-rel" className="form-label small fw-semibold">
                  Hubungan Pengasuh
                </label>
                <select
                  id="guardian-rel"
                  className="form-select"
                  value={formState.guardian_relationship}
                  onChange={(e) =>
                    setFormState({ ...formState, guardian_relationship: e.target.value })
                  }
                >
                  <option value="Ibu">Ibu Kandung</option>
                  <option value="Ayah">Ayah Kandung</option>
                  <option value="Nenek/Kakek">Nenek / Kakek</option>
                  <option value="Wali Lainnya">Wali Lainnya</option>
                </select>
              </div>

              <div className="col-md-4">
                <label htmlFor="guardian-phone" className="form-label small fw-semibold">
                  No. Telepon Wali (Opsional)
                </label>
                <input
                  id="guardian-phone"
                  type="text"
                  className="form-control font-mono-num"
                  value={formState.guardian_phone}
                  onChange={(e) => setFormState({ ...formState, guardian_phone: e.target.value })}
                  placeholder="0812-xxxx-xxxx"
                />
              </div>

              <div className="col-12 d-flex justify-content-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-tp-primary" disabled={submitting}>
                  <Icon name="user-check" size={16} />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Data Balita'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

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
                placeholder="Cari nama balita, kode internal, atau nama wali"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari balita"
              />
            </div>
          </div>

          {user?.role !== 'kader' && (
            <div className="col-md-4">
              <select
                className="form-select form-select-sm rounded-3"
                style={{ minHeight: '38px' }}
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                aria-label="Filter Posyandu"
              >
                <option value="">Semua Unit Posyandu</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="col-md-3">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter Status Keaktifan"
            >
              <option value="active">Status: Balita Aktif</option>
              <option value="inactive">Status: Nonaktif</option>
              <option value="all">Semua Status</option>
            </select>
          </div>
        </div>
      </div>

      {errorMsg && <div className="alert alert-danger py-2 small">{errorMsg}</div>}

      <div className="tp-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5 small text-secondary">Memuat daftar balita...</div>
        ) : children.length === 0 ? (
          <div className="text-center py-5 small text-secondary">
            Tidak ditemukan data balita yang sesuai dengan filter.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table tp-table">
              <thead>
                <tr>
                  <th>Profil Balita</th>
                  <th>Usia & Tgl Lahir</th>
                  <th>Orang Tua / Wali</th>
                  <th>Unit Posyandu</th>
                  <th>Riwayat Kehadiran</th>
                  <th>Status</th>
                  <th className="text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {children.map((c) => {
                  const avatarTone = getAvatarToneClass(c.internal_code || c.name);

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <span className={`tp-avatar ${avatarTone}`}>{getInitials(c.name)}</span>
                          <div>
                            <Link
                              to={`/anak/${c.id}`}
                              className="fw-bold text-dark text-decoration-none d-block"
                            >
                              {c.name}
                            </Link>
                            <div className="small text-secondary font-mono-num">
                              {c.internal_code} &middot; {c.sex === 'L' ? 'Laki-laki' : 'Perempuan'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tp-badge tp-badge-neutral font-mono-num mb-1">
                          {c.age_months_current} bulan
                        </span>
                        <div className="small text-secondary font-mono-num">{c.birth_date}</div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{c.guardian_name}</div>
                        <div className="small text-secondary font-mono-num">
                          {c.guardian_relationship}
                          {c.guardian_phone ? ` \u00B7 ${c.guardian_phone}` : ''}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{c.posyandu_name}</div>
                        <div className="small text-secondary font-mono-num">{c.posyandu_code}</div>
                      </td>
                      <td>
                        <span className="tp-badge tp-badge-green font-mono-num">
                          {c.attendance_count} kali hadir
                        </span>
                      </td>
                      <td>
                        <span
                          className={`tp-badge ${
                            c.inactive_on ? 'tp-badge-neutral' : 'tp-badge-green'
                          }`}
                        >
                          {c.inactive_on ? 'Nonaktif' : 'Aktif'}
                        </span>
                      </td>
                      <td className="text-end">
                        <Link to={`/anak/${c.id}`} className="btn btn-sm btn-tp-soft">
                          <span>Profil & Riwayat</span>
                          <Icon name="arrow-right" size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
