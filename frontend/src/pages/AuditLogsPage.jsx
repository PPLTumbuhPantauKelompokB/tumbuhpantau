import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';

export function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ limit: '150' });
      if (actionFilter) params.set('action', actionFilter);
      if (entityTypeFilter) params.set('entityType', entityTypeFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const data = await apiRequest(`/audit-logs?${params.toString()}`);
      setLogs(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat catatan audit.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityTypeFilter, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleResetFilters = () => {
    setActionFilter('');
    setEntityTypeFilter('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setSortBy('newest');
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h5 fw-bold text-dark mb-1">Log Audit Aktivitas Sistem</h2>
          <p className="small text-secondary mb-0">
            {user?.role === 'administrator'
              ? 'Rekam jejak menyeluruh login, pengelolaan organisasi, akun pengguna, dan operasional sistem (mode baca saja).'
              : 'Rekam jejak operasional Posyandu, pengukuran antropometri, peninjauan klinis, dan tindak lanjut di wilayah Puskesmas Anda.'}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="tp-badge tp-badge-neutral">
            <Icon name="lock" size={13} /> Mode Baca Saja (Append-Only)
          </span>
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

      <div className="tp-filter-bar">
        <div className="row g-2 align-items-end">
          <div className="col-sm-6 col-lg-3">
            <label htmlFor="audit-action" className="form-label small fw-semibold mb-1">
              Jenis Aksi
            </label>
            <select
              id="audit-action"
              className="form-select form-select-sm font-mono-num rounded-3"
              style={{ minHeight: '38px' }}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">Semua Jenis Aksi</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="USER_LOGOUT">USER_LOGOUT</option>
              <option value="CHILD_REGISTERED">CHILD_REGISTERED</option>
              <option value="CHILD_UPDATED">CHILD_UPDATED</option>
              <option value="CHILD_DEACTIVATED">CHILD_DEACTIVATED</option>
              <option value="CHILD_ACTIVATED">CHILD_ACTIVATED</option>
              <option value="CHILD_GUARDIAN_UPDATED">CHILD_GUARDIAN_UPDATED</option>
              <option value="GUARDIAN_CREATED">GUARDIAN_CREATED</option>
              <option value="GUARDIAN_UPDATED">GUARDIAN_UPDATED</option>
              <option value="SESSION_OPENED">SESSION_OPENED</option>
              <option value="SESSION_UPDATED">SESSION_UPDATED</option>
              <option value="SESSION_CLOSED">SESSION_CLOSED</option>
              <option value="SESSION_CANCELLED">SESSION_CANCELLED</option>
              <option value="ATTENDANCE_RECORDED">ATTENDANCE_RECORDED</option>
              <option value="ATTENDANCE_UPDATED">ATTENDANCE_UPDATED</option>
              <option value="MEASUREMENT_DRAFT_SAVED">MEASUREMENT_DRAFT_SAVED</option>
              <option value="MEASUREMENT_DRAFT_DELETED">MEASUREMENT_DRAFT_DELETED</option>
              <option value="MEASUREMENT_SUBMITTED">MEASUREMENT_SUBMITTED</option>
              <option value="MEASUREMENT_REVISED">MEASUREMENT_REVISED</option>
              <option value="REVIEW_DECISION_RECORDED">REVIEW_DECISION_RECORDED</option>
              <option value="FOLLOW_UP_CREATED">FOLLOW_UP_CREATED</option>
              <option value="FOLLOW_UP_UPDATED">FOLLOW_UP_UPDATED</option>
              <option value="FOLLOW_UP_CLOSED">FOLLOW_UP_CLOSED</option>
              <option value="REPORT_CSV_EXPORTED">REPORT_CSV_EXPORTED</option>
              <option value="ORGANIZATION_CREATED">ORGANIZATION_CREATED</option>
              <option value="ORGANIZATION_UPDATED">ORGANIZATION_UPDATED</option>
              <option value="USER_CREATED">USER_CREATED</option>
              <option value="USER_UPDATED">USER_UPDATED</option>
              <option value="ACCESS_DENIED">ACCESS_DENIED</option>
            </select>
          </div>

          <div className="col-sm-6 col-lg-3">
            <label htmlFor="audit-entity" className="form-label small fw-semibold mb-1">
              Entitas Target
            </label>
            <select
              id="audit-entity"
              className="form-select form-select-sm font-mono-num rounded-3"
              style={{ minHeight: '38px' }}
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
            >
              <option value="">Semua Entitas</option>
              <option value="child">child (Balita)</option>
              <option value="guardian">guardian (Wali)</option>
              <option value="posyandu_session">posyandu_session (Sesi)</option>
              <option value="attendance">attendance (Kehadiran)</option>
              <option value="measurement">measurement (Pengukuran)</option>
              <option value="growth_assessment">growth_assessment (Peninjauan)</option>
              <option value="follow_up">follow_up (Tindak Lanjut)</option>
              <option value="report">report (Laporan CSV)</option>
              <option value="organization">organization (Organisasi)</option>
              <option value="user">user (Pengguna)</option>
            </select>
          </div>

          <div className="col-sm-4 col-lg-2">
            <label htmlFor="audit-start" className="form-label small fw-semibold mb-1">
              Dari Tanggal
            </label>
            <input
              id="audit-start"
              type="date"
              className="form-control form-control-sm font-mono-num rounded-3"
              style={{ minHeight: '38px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="col-sm-4 col-lg-2">
            <label htmlFor="audit-end" className="form-label small fw-semibold mb-1">
              Sampai Tanggal
            </label>
            <input
              id="audit-end"
              type="date"
              className="form-control form-control-sm font-mono-num rounded-3"
              style={{ minHeight: '38px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="col-sm-4 col-lg-2 d-flex">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-3 w-100"
              style={{ minHeight: '38px' }}
              onClick={handleResetFilters}
            >
              Reset Filter
            </button>
          </div>

          <div className="col-sm-8 col-lg-8 mt-2">
            <div className="tp-input-icon-group">
              <span className="tp-input-icon-left">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="form-control form-control-sm tp-input-with-icon"
                style={{ minHeight: '38px' }}
                placeholder="Cari nama pelaku, ringkasan perubahan, atau unit organisasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari di log audit"
              />
            </div>
          </div>

          <div className="col-sm-4 col-lg-4 mt-2">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Urutkan Log Audit"
            >
              <option value="newest">Urutkan: Kejadian Terbaru</option>
              <option value="oldest">Urutkan: Kejadian Terlama</option>
              <option value="actor_az">Urutkan: Abjad Pelaku (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {errorMsg && <div className="alert alert-danger py-2 small rounded-3">{errorMsg}</div>}

      <div className="tp-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5 small text-secondary">Memuat catatan audit...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-5 small text-secondary">
            Tidak ada catatan audit untuk kriteria filter ini.
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
                  <th>Entitas Target</th>
                  <th>Ringkasan Perubahan</th>
                </tr>
              </thead>
              <tbody>
                {logs
                  .filter((l) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      (l.actor_name || '').toLowerCase().includes(q) ||
                      (l.actor_username || '').toLowerCase().includes(q) ||
                      (l.organization_name || '').toLowerCase().includes(q) ||
                      (l.change_summary || '').toLowerCase().includes(q) ||
                      (l.action || '').toLowerCase().includes(q)
                    );
                  })
                  .sort((a, b) => {
                    if (sortBy === 'oldest') return Number(a.id) - Number(b.id);
                    if (sortBy === 'actor_az') {
                      return (a.actor_name || '').localeCompare(b.actor_name || '', 'id');
                    }
                    return Number(b.id) - Number(a.id);
                  })
                  .map((l) => (
                  <tr key={l.id}>
                    <td className="font-mono-num small text-secondary">{l.occurred_at}</td>
                    <td>
                      <span
                        className={`tp-badge font-mono-num ${
                          l.action === 'ACCESS_DENIED'
                            ? 'tp-badge-red'
                            : l.action.includes('CREATED') || l.action.includes('SUBMITTED') || l.action.includes('ACTIVATED')
                              ? 'tp-badge-green'
                              : l.action.includes('REVISED') || l.action.includes('UPDATED')
                                ? 'tp-badge-blue'
                                : 'tp-badge-neutral'
                        }`}
                      >
                        {l.action}
                      </span>
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
