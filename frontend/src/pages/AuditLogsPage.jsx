import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';

export function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (actionFilter) params.set('action', actionFilter);
      const data = await apiRequest(`/audit-logs?${params.toString()}`);
      setLogs(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat catatan audit.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h5 fw-bold text-dark mb-1">Log Audit Aktivitas Sistem</h2>
          <p className="small text-secondary mb-0">
            {user?.role === 'administrator'
              ? 'Rekam jejak login, pengelolaan organisasi, pembuatan dan pembaruan akun pengguna.'
              : 'Rekam jejak registrasi balita, pengelolaan wali, pembukaan sesi, dan pencatatan kehadiran.'}
          </p>
        </div>

        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm font-mono-num rounded-3"
            style={{ width: '240px', minHeight: '38px' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter Jenis Aksi Audit"
          >
            <option value="">Semua Jenis Aksi</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_LOGOUT">USER_LOGOUT</option>
            <option value="CHILD_REGISTERED">CHILD_REGISTERED</option>
            <option value="CHILD_UPDATED">CHILD_UPDATED</option>
            <option value="CHILD_DEACTIVATED">CHILD_DEACTIVATED</option>
            <option value="CHILD_GUARDIAN_UPDATED">CHILD_GUARDIAN_UPDATED</option>
            <option value="GUARDIAN_CREATED">GUARDIAN_CREATED</option>
            <option value="GUARDIAN_UPDATED">GUARDIAN_UPDATED</option>
            <option value="SESSION_OPENED">SESSION_OPENED</option>
            <option value="SESSION_UPDATED">SESSION_UPDATED</option>
            <option value="SESSION_CLOSED">SESSION_CLOSED</option>
            <option value="SESSION_CANCELLED">SESSION_CANCELLED</option>
            <option value="ATTENDANCE_RECORDED">ATTENDANCE_RECORDED</option>
            <option value="ORGANIZATION_CREATED">ORGANIZATION_CREATED</option>
            <option value="ORGANIZATION_UPDATED">ORGANIZATION_UPDATED</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_UPDATED">USER_UPDATED</option>
          </select>

          <button
            type="button"
            className="btn btn-sm btn-tp-soft"
            onClick={loadLogs}
          >
            <Icon name="log" size={15} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {errorMsg && <div className="alert alert-danger py-2 small rounded-3">{errorMsg}</div>}

      <div className="tp-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5 small text-secondary">Memuat catatan audit...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-5 small text-secondary">
            Tidak ada catatan audit untuk kriteria ini.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table tp-table">
              <thead>
                <tr>
                  <th>Waktu Kejadian</th>
                  <th>Aksi</th>
                  <th>Pelaku (Actor)</th>
                  <th>Unit Organisasi</th>
                  <th>Entitas</th>
                  <th>Ringkasan Perubahan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="font-mono-num small text-secondary">{l.occurred_at}</td>
                    <td>
                      <span className="tp-badge tp-badge-neutral font-mono-num">{l.action}</span>
                    </td>
                    <td className="small">
                      <div className="fw-semibold text-dark">{l.actor_name || '-'}</div>
                      <div className="text-secondary font-mono-num">{l.actor_username || ''}</div>
                    </td>
                    <td className="small text-secondary">{l.organization_name || '-'}</td>
                    <td>
                      <span className="small font-mono-num text-dark">
                        {l.entity_type} {l.entity_id ? `#${l.entity_id}` : ''}
                      </span>
                    </td>
                    <td className="small text-dark" style={{ maxWidth: '380px' }}>
                      {l.change_summary}
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
