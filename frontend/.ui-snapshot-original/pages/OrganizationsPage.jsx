import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatOrgTypeLabel } from '../utils/formatters.js';
import { Icon } from '../components/Icon.jsx';

export function OrganizationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'administrator';

  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState({
    type: 'posyandu',
    parent_id: '',
    code: '',
    name: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiRequest('/organizations');
      setOrgs(data || []);
      const firstPuskesmas = (data || []).find((o) => o.type === 'puskesmas');
      if (firstPuskesmas) {
        setFormState((prev) => ({
          ...prev,
          parent_id: prev.parent_id || String(firstPuskesmas.id)
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar unit organisasi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const parentOptions = orgs.filter((o) => {
    if (formState.type === 'puskesmas') return o.type === 'dinas_kesehatan';
    if (formState.type === 'posyandu') return o.type === 'puskesmas';
    return false;
  });

  const handleTypeChange = (nextType) => {
    const validParents = orgs.filter((o) => {
      if (nextType === 'puskesmas') return o.type === 'dinas_kesehatan';
      if (nextType === 'posyandu') return o.type === 'puskesmas';
      return false;
    });
    setFormState({
      ...formState,
      type: nextType,
      parent_id: validParents.length > 0 ? String(validParents[0].id) : ''
    });
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await apiRequest('/organizations', {
        method: 'POST',
        body: {
          type: formState.type,
          parent_id: formState.type === 'dinas_kesehatan' ? null : Number(formState.parent_id),
          code: formState.code,
          name: formState.name
        }
      });
      setShowCreateForm(false);
      setFormState((prev) => ({ ...prev, code: '', name: '' }));
      setFeedback({
        type: 'success',
        text: `Unit organisasi ${created.name} (${created.code}) berhasil ditambahkan.`
      });
      await loadOrganizations();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal menambahkan organisasi.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (org) => {
    try {
      await apiRequest(`/organizations/${org.id}`, {
        method: 'PATCH',
        body: { is_active: !org.is_active }
      });
      setFeedback({
        type: 'info',
        text: `Status organisasi ${org.name} berhasil diperbarui.`
      });
      await loadOrganizations();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal mengubah status.' });
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
          <h2 className="h5 fw-bold text-dark mb-1">Hierarki Unit Organisasi</h2>
          <p className="small text-secondary mb-0">
            Struktur wilayah kerja Dinas Kesehatan, Puskesmas pembina, dan Posyandu.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-tp-primary"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            <Icon name={showCreateForm ? 'close' : 'plus'} size={17} />
            <span>{showCreateForm ? 'Tutup Form' : 'Tambah Unit Organisasi'}</span>
          </button>
        )}
      </div>

      {isAdmin && showCreateForm && (
        <div className="tp-card border-success" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
            <h3 className="h6 fw-bold mb-0">Tambah Unit Organisasi Baru</h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowCreateForm(false)}
              aria-label="Tutup form"
            />
          </div>

          <form onSubmit={handleCreateOrg} className="row g-3">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Tipe Unit</label>
              <select
                className="form-select"
                value={formState.type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="posyandu">Posyandu</option>
                <option value="puskesmas">Puskesmas</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Unit Induk Pembina</label>
              <select
                className="form-select"
                value={formState.parent_id}
                onChange={(e) => setFormState({ ...formState, parent_id: e.target.value })}
                required
              >
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label small fw-semibold">Kode Unit</label>
              <input
                type="text"
                className="form-control font-mono-num"
                placeholder="POS-MLT-05"
                value={formState.code}
                onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold">Nama Unit Organisasi</label>
              <input
                type="text"
                className="form-control"
                placeholder="Posyandu Melati 05"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                required
              />
            </div>

            <div className="col-12 d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-tp-primary" disabled={submitting}>
                <Icon name="building" size={16} />
                <span>{submitting ? 'Menyimpan...' : 'Simpan Organisasi'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {errorMsg && <div className="alert alert-danger py-2 small">{errorMsg}</div>}

      <div className="tp-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5 small text-secondary">Memuat data organisasi...</div>
        ) : (
          <div className="table-responsive">
            <table className="table tp-table">
              <thead>
                <tr>
                  <th>Kode Unit</th>
                  <th>Nama Unit Organisasi</th>
                  <th>Tingkat Organisasi</th>
                  <th>Induk Pembina</th>
                  <th className="text-center">Pengguna</th>
                  <th className="text-center">Balita Sasaran</th>
                  <th>Status</th>
                  {isAdmin && <th className="text-end">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <span className="font-mono-num fw-bold text-dark">{org.code}</span>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{org.name}</div>
                    </td>
                    <td>
                      <span className="tp-badge tp-badge-neutral">
                        {formatOrgTypeLabel(org.type)}
                      </span>
                    </td>
                    <td>
                      <span className="small text-secondary">{org.parent_name || 'Tingkat Kota'}</span>
                    </td>
                    <td className="text-center font-mono-num small text-dark">
                      {org.user_count} akun
                    </td>
                    <td className="text-center font-mono-num small text-dark">
                      {org.active_children_count} balita
                    </td>
                    <td>
                      <span
                        className={`tp-badge ${
                          org.is_active ? 'tp-badge-green' : 'tp-badge-neutral'
                        }`}
                      >
                        {org.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary rounded-3"
                          onClick={() => handleToggleActive(org)}
                        >
                          {org.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    )}
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
