import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  formatRoleLabel,
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';
import { Icon } from '../components/Icon.jsx';

export function UsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState({
    role: 'kader',
    organization_id: '',
    name: '',
    username: '',
    password: '123456'
  });
  const [submitting, setSubmitting] = useState(false);

  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('123456');
  const [savingPassword, setSavingPassword] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [uData, oData] = await Promise.all([
        apiRequest('/users'),
        apiRequest('/organizations')
      ]);
      setUsers(uData || []);
      setOrgs(oData || []);
      const firstPosyandu = (oData || []).find((o) => o.type === 'posyandu');
      if (firstPosyandu) {
        setFormState((prev) => ({
          ...prev,
          organization_id: prev.organization_id || String(firstPosyandu.id)
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const matchingOrgs = orgs.filter((o) => {
    if (formState.role === 'kader') return o.type === 'posyandu';
    if (formState.role === 'petugas_puskesmas') return o.type === 'puskesmas';
    if (formState.role === 'dinas_kesehatan') return o.type === 'dinas_kesehatan';
    return true;
  });

  const handleRoleChange = (nextRole) => {
    const validOrgs = orgs.filter((o) => {
      if (nextRole === 'kader') return o.type === 'posyandu';
      if (nextRole === 'petugas_puskesmas') return o.type === 'puskesmas';
      if (nextRole === 'dinas_kesehatan') return o.type === 'dinas_kesehatan';
      return true;
    });
    setFormState({
      ...formState,
      role: nextRole,
      organization_id: validOrgs.length > 0 ? String(validOrgs[0].id) : ''
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await apiRequest('/users', {
        method: 'POST',
        body: {
          ...formState,
          organization_id: Number(formState.organization_id)
        }
      });
      setShowCreateForm(false);
      setFormState((prev) => ({ ...prev, name: '', username: '' }));
      setFeedback({
        type: 'success',
        text: `Akun pengguna ${created.username} (${formatRoleLabel(created.role)}) berhasil dibuat.`
      });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal membuat akun.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (targetUser) => {
    try {
      await apiRequest(`/users/${targetUser.id}`, {
        method: 'PATCH',
        body: { is_active: !targetUser.is_active }
      });
      setFeedback({
        type: 'info',
        text: `Status keaktifan akun ${targetUser.username} diperbarui.`
      });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal mengubah status akun.' });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setSavingPassword(true);
    try {
      await apiRequest(`/users/${resetModalUser.id}`, {
        method: 'PATCH',
        body: { password: newPassword }
      });
      setFeedback({
        type: 'success',
        text: `Password akun ${resetModalUser.username} berhasil diatur ulang.`
      });
      setResetModalUser(null);
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Gagal memperbarui password.' });
    } finally {
      setSavingPassword(false);
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
          <h2 className="h5 fw-bold text-dark mb-1">Manajemen Akun Pengguna</h2>
          <p className="small text-secondary mb-0">
            Kelola akun Kader Posyandu, Petugas Puskesmas, Dinas Kesehatan, dan Administrator.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-tp-primary"
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          <Icon name={showCreateForm ? 'close' : 'plus'} size={17} />
          <span>{showCreateForm ? 'Tutup Form' : 'Buat Akun Pengguna'}</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="tp-card border-success" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
            <h3 className="h6 fw-bold mb-0">Formulir Akun Pengguna Baru</h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowCreateForm(false)}
              aria-label="Tutup form"
            />
          </div>

          <form onSubmit={handleCreateUser} className="row g-3">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Peran (Role)</label>
              <select
                className="form-select"
                value={formState.role}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <option value="kader">Kader Posyandu</option>
                <option value="petugas_puskesmas">Petugas Puskesmas</option>
                <option value="dinas_kesehatan">Dinas Kesehatan</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Unit Organisasi Penempatan</label>
              <select
                className="form-select"
                value={formState.organization_id}
                onChange={(e) =>
                  setFormState({ ...formState, organization_id: e.target.value })
                }
                required
              >
                {matchingOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-5">
              <label className="form-label small fw-semibold">Nama Lengkap Petugas</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Ibu Kartika Sari"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Username Login</label>
              <input
                type="text"
                className="form-control font-mono-num"
                placeholder="kader.nama"
                value={formState.username}
                onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Password Awal</label>
              <input
                type="password"
                className="form-control font-mono-num"
                value={formState.password}
                onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4 d-flex align-items-end">
              <div className="small text-secondary pb-2">
                Password default: <code>123456</code>
              </div>
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
                <span>{submitting ? 'Memproses...' : 'Simpan Akun Pengguna'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {resetModalUser && (
        <div className="tp-card border-warning" style={{ borderWidth: '1.5px' }}>
          <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
            <h3 className="h6 fw-bold mb-0">
              Reset Password Akun ({resetModalUser.username})
            </h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setResetModalUser(null)}
              aria-label="Tutup"
            />
          </div>
          <form onSubmit={handleResetPassword} className="row g-3">
            <div className="col-md-8">
              <label className="form-label small fw-semibold">Password Baru</label>
              <input
                type="password"
                className="form-control font-mono-num"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
              />
            </div>
            <div className="col-md-4 d-flex align-items-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary flex-fill"
                onClick={() => setResetModalUser(null)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-warning flex-fill" disabled={savingPassword}>
                {savingPassword ? 'Menyimpan...' : 'Perbarui Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {errorMsg && <div className="alert alert-danger py-2 small">{errorMsg}</div>}

      <div className="tp-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5 small text-secondary">Memuat daftar pengguna...</div>
        ) : (
          <div className="table-responsive">
            <table className="table tp-table">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Username</th>
                  <th>Peran Sistem</th>
                  <th>Unit Penempatan</th>
                  <th>Status</th>
                  <th className="text-end">Aksi Akun</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const avatarTone = getAvatarToneClass(u.username);
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`tp-avatar ${avatarTone}`}>{getInitials(u.name)}</span>
                          <div>
                            <div className="fw-semibold text-dark">{u.name}</div>
                            {isCurrent && (
                              <span className="tp-badge tp-badge-blue" style={{ fontSize: '0.68rem' }}>
                                Akun Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono-num text-dark fw-semibold">{u.username}</span>
                      </td>
                      <td>
                        <span className="tp-badge tp-badge-neutral">{formatRoleLabel(u.role)}</span>
                      </td>
                      <td>
                        <div className="small fw-semibold text-dark">{u.organization_name}</div>
                        <div className="small text-secondary font-mono-num">{u.organization_code}</div>
                      </td>
                      <td>
                        <span
                          className={`tp-badge ${
                            u.is_active ? 'tp-badge-green' : 'tp-badge-neutral'
                          }`}
                        >
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-3"
                            onClick={() => {
                              setResetModalUser(u);
                              setNewPassword('123456');
                            }}
                          >
                            Reset Password
                          </button>
                          {!isCurrent && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary rounded-3"
                              onClick={() => handleToggleActive(u)}
                            >
                              {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
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
    </div>
  );
}
