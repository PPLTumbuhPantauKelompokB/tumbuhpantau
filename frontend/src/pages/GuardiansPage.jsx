import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';

export function GuardiansPage() {
  const { user } = useAuth();
  const [guardians, setGuardians] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState({
    organization_id: user?.role === 'kader' ? String(user.organization_id) : '',
    name: '',
    phone: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadGuardians = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (orgFilter) params.set('organization_id', orgFilter);

      const data = await apiRequest(`/guardians?${params.toString()}`);
      setGuardians(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data orang tua/wali.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, orgFilter]);

  useEffect(() => {
    loadGuardians();
  }, [loadGuardians]);

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

  const handleCreateGuardian = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await apiRequest('/guardians', {
        method: 'POST',
        body: {
          ...formState,
          organization_id: Number(formState.organization_id || user.organization_id)
        }
      });
      setShowCreateForm(false);
      setFormState({
        organization_id: formState.organization_id,
        name: '',
        phone: '',
        address: ''
      });
      setFeedback({
        type: 'success',
        text: `Orang tua/wali ${created.name} berhasil ditambahkan.`
      });
      await loadGuardians();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal menambahkan wali.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {feedback && (
        <div
          className={`alert alert-${feedback.type} d-flex justify-content-between align-items-center mb-0 rounded-3`}
          role="alert"
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setFeedback(null)}
            aria-label="Tutup pesan"
          />
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h5 fw-bold text-dark mb-1">Data Orang Tua & Wali Balita</h2>
          <p className="small text-secondary mb-0">
            Kelola kontak, alamat, dan daftar asuhan keluarga balita di Posyandu.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-tp-primary"
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          <Icon name={showCreateForm ? 'close' : 'plus'} size={17} />
          <span>{showCreateForm ? 'Tutup Form' : 'Tambah Wali Baru'}</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="tp-card border-success" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
            <h3 className="h6 fw-bold mb-0">Tambah Data Orang Tua / Wali</h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowCreateForm(false)}
              aria-label="Tutup form"
            />
          </div>

          <form onSubmit={handleCreateGuardian} className="row g-3">
            {user?.role !== 'kader' && (
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Unit Posyandu</label>
                <select
                  className="form-select"
                  value={formState.organization_id}
                  onChange={(e) => setFormState({ ...formState, organization_id: e.target.value })}
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
              <label className="form-label small fw-semibold">Nama Lengkap Orang Tua / Wali</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Ibu Siti Aminah"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                className="form-control font-mono-num"
                placeholder="0812-xxxx-xxxx"
                value={formState.phone}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
              />
            </div>

            <div className="col-md-12">
              <label className="form-label small fw-semibold">Alamat Tempat Tinggal</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: RT 03/RW 02 Kelurahan Melati"
                value={formState.address}
                onChange={(e) => setFormState({ ...formState, address: e.target.value })}
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
                <span>{submitting ? 'Menyimpan...' : 'Simpan Data Wali'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tp-filter-bar">
        <div className="row g-2 align-items-center">
          <div className="col-md-7">
            <div className="tp-input-icon-group">
              <span className="tp-input-icon-left">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="form-control form-control-sm tp-input-with-icon"
                style={{ minHeight: '38px' }}
                placeholder="Cari nama wali, nomor telepon, atau alamat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari wali"
              />
            </div>
          </div>

          {user?.role !== 'kader' && (
            <div className="col-md-5">
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
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {errorMsg && <div className="alert alert-danger py-2 small">{errorMsg}</div>}

      <div className="tp-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5 small text-secondary">Memuat daftar wali...</div>
        ) : guardians.length === 0 ? (
          <div className="text-center py-5 small text-secondary">
            Belum ada data orang tua / wali yang sesuai filter.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table tp-table">
              <thead>
                <tr>
                  <th>Nama Orang Tua / Wali</th>
                  <th>Kontak Telepon</th>
                  <th>Alamat Domisili</th>
                  <th>Unit Posyandu</th>
                  <th className="text-center">Jumlah Balita</th>
                  <th className="text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {guardians.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className="fw-bold text-dark">{g.name}</div>
                    </td>
                    <td>
                      <div className="font-mono-num text-secondary">{g.phone || '-'}</div>
                    </td>
                    <td>
                      <div className="small text-secondary">{g.address || '-'}</div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{g.posyandu_name}</div>
                      <div className="small text-secondary font-mono-num">{g.posyandu_code}</div>
                    </td>
                    <td className="text-center">
                      <span className="tp-badge tp-badge-green font-mono-num">
                        {g.active_children_count} balita
                      </span>
                    </td>
                    <td className="text-end">
                      <Link to={`/wali/${g.id}`} className="btn btn-sm btn-tp-soft">
                        <span>Detail Profil</span>
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
  );
}
