import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { getInitials, getAvatarToneClass } from '../utils/formatters.js';

export function MonitoringPage() {
  const { user } = useAuth();

  const [period, setPeriod] = useState('2026-11');
  const [orgFilter, setOrgFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [sessionsList, setSessionsList] = useState([]);
  const [activeTab, setActiveTab] = useState('present_incomplete');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    apiRequest('/organizations')
      .then((orgs) => {
        setOrganizations((orgs || []).filter((o) => o.type === 'posyandu' && o.is_active));
      })
      .catch(() => {});

    apiRequest('/sessions')
      .then((sList) => {
        setSessionsList(sList || []);
      })
      .catch(() => {});
  }, []);

  const loadMonitoring = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let res;
      if (sessionFilter) {
        res = await apiRequest(`/sessions/${sessionFilter}/monitoring`);
      } else {
        const params = new URLSearchParams({ period });
        if (orgFilter) params.set('organization_id', orgFilter);
        res = await apiRequest(`/monitoring/completeness?${params.toString()}`);
      }
      setData(res);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data monitoring kelengkapan.');
    } finally {
      setLoading(false);
    }
  }, [period, orgFilter, sessionFilter]);

  useEffect(() => {
    loadMonitoring();
  }, [loadMonitoring]);

  const filteredSessions = sessionsList.filter((s) => {
    if (orgFilter && String(s.organization_id) !== String(orgFilter)) return false;
    return true;
  });

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h5 fw-bold text-dark mb-1">Monitoring Balita Belum Diukur & Draf</h2>
          <p className="small text-secondary mb-0">
            Pantau balita yang pengukurannya masih berstatus draf atau belum hadir/diukur pada sesi
            kegiatan Posyandu.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {user?.role !== 'kader' && (
            <select
              className="form-select form-select-sm rounded-3"
              style={{ width: '210px', minHeight: '38px' }}
              value={orgFilter}
              onChange={(e) => {
                setOrgFilter(e.target.value);
                setSessionFilter('');
              }}
              aria-label="Filter Posyandu"
            >
              <option value="">Semua Unit Posyandu</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </select>
          )}

          <select
            className="form-select form-select-sm rounded-3"
            style={{ width: '235px', minHeight: '38px' }}
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            aria-label="Filter Sesi Kegiatan"
          >
            <option value="">Filter: Semua Sesi pada Periode</option>
            {filteredSessions.map((s) => (
              <option key={s.id} value={s.id}>
                Sesi {s.session_date} - {s.posyandu_name}
              </option>
            ))}
          </select>

          {!sessionFilter && (
            <select
              className="form-select form-select-sm font-mono-num rounded-3"
              style={{ width: '130px', minHeight: '38px' }}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Pilih Periode"
            >
              <option value="2026-11">2026-11</option>
              <option value="2026-10">2026-10</option>
              <option value="2026-09">2026-09</option>
            </select>
          )}
        </div>
      </div>

      {errorMsg && <div className="alert alert-danger py-2 small rounded-3">{errorMsg}</div>}

      {loading || !data ? (
        <div className="tp-card text-center py-5 small text-secondary">
          Memuat status kelengkapan pengukuran...
        </div>
      ) : (
        <>
          {data.summary.low_coverage_warning && (
            <div
              className="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2 mb-0 rounded-3"
              role="alert"
            >
              <div className="d-flex align-items-center gap-2">
                <Icon name="alert-circle" size={20} className="text-warning-emphasis" />
                <div>
                  <div className="fw-bold small">
                    Peringatan Cakupan Kehadiran / Pengukuran di Bawah Target (&lt; 80%)
                  </div>
                  <div className="small">
                    Cakupan pengukuran lengkap saat ini{' '}
                    <strong className="font-mono-num">{data.summary.coverage_percent}%</strong> (
                    {data.summary.measured_complete_count} dari{' '}
                    {data.summary.total_active_children} balita aktif) dan kehadiran{' '}
                    <strong className="font-mono-num">{data.summary.attendance_percent}%</strong>.
                    Segera tindak lanjuti balita berstatus draf atau belum diukur.
                  </div>
                </div>
              </div>
              <span className="tp-badge tp-badge-amber font-mono-num">
                Target Minimal: 80%
              </span>
            </div>
          )}

          <div className="row g-3">
            <div className="col-sm-6 col-xl-3">
              <div className="tp-stat-card">
                <div className="tp-stat-icon-box tp-stat-icon-blue">
                  <Icon name="child" size={24} />
                </div>
                <div>
                  <div className="tp-stat-value">{data.summary.total_active_children}</div>
                  <div className="tp-stat-label">Total Balita Aktif</div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="tp-stat-card">
                <div className="tp-stat-icon-box tp-stat-icon-green">
                  <Icon name="user-check" size={24} />
                </div>
                <div>
                  <div className="tp-stat-value">
                    {data.summary.measured_complete_count}{' '}
                    <span className="fs-6 fw-semibold text-secondary">
                      ({data.summary.coverage_percent}%)
                    </span>
                  </div>
                  <div className="tp-stat-label">Diukur Lengkap</div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="tp-stat-card">
                <div className="tp-stat-icon-box tp-stat-icon-amber">
                  <Icon name="clipboard" size={24} />
                </div>
                <div>
                  <div className="tp-stat-value">{data.summary.present_incomplete_count}</div>
                  <div className="tp-stat-label">Status Draf / Belum Final</div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="tp-stat-card">
                <div className="tp-stat-icon-box tp-stat-icon-red">
                  <Icon name="alert-circle" size={24} />
                </div>
                <div>
                  <div className="tp-stat-value">{data.summary.unmeasured_count}</div>
                  <div className="tp-stat-label">Belum Diukur / Absen</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="tp-segmented-tabs" role="tablist" aria-label="Filter Kelengkapan">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'present_incomplete'}
                className={`tp-segmented-btn ${
                  activeTab === 'present_incomplete' ? 'active' : ''
                }`}
                onClick={() => setActiveTab('present_incomplete')}
              >
                <Icon name="clipboard" size={16} />
                <span>Pengukuran Masih Draf / Belum Final ({data.presentIncomplete.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'unmeasured'}
                className={`tp-segmented-btn ${activeTab === 'unmeasured' ? 'active' : ''}`}
                onClick={() => setActiveTab('unmeasured')}
              >
                <Icon name="alert-circle" size={16} />
                <span>Balita Belum Diukur ({data.unmeasuredChildren.length})</span>
              </button>
            </div>
          </div>

          <div className="tp-card p-0 overflow-hidden">
            {activeTab === 'present_incomplete' ? (
              data.presentIncomplete.length === 0 ? (
                <div className="text-center py-5 small text-secondary">
                  Tidak ada balita yang tertahan pada status draf di sesi/periode ini.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table tp-table">
                    <thead>
                      <tr>
                        <th>Balita & Wali</th>
                        <th>Unit Posyandu</th>
                        <th>Tanggal Sesi</th>
                        <th>Status Input</th>
                        <th>Nilai Draf Tersimpan</th>
                        <th className="text-end">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.presentIncomplete.map((item) => {
                        const avatarTone = getAvatarToneClass(
                          item.internal_code || item.child_name
                        );
                        return (
                          <tr key={item.child_id}>
                            <td>
                              <div className="d-flex align-items-center gap-3">
                                <span className={`tp-avatar ${avatarTone}`}>
                                  {getInitials(item.child_name)}
                                </span>
                                <div>
                                  <div className="fw-bold text-dark">{item.child_name}</div>
                                  <div className="small text-secondary font-mono-num">
                                    {item.internal_code} &middot; Wali: {item.guardian_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="fw-semibold">{item.posyandu_name}</td>
                            <td className="font-mono-num">{item.session_date}</td>
                            <td>
                              <span className="tp-badge tp-badge-amber">
                                {item.measurement_status === 'draft'
                                  ? 'Masih Draf'
                                  : 'Hadir Belum Diinput'}
                              </span>
                            </td>
                            <td className="font-mono-num small">
                              BB: {item.weight_kg ?? '-'} kg &middot; PB/TB:{' '}
                              {item.length_height_cm ?? '-'} cm
                            </td>
                            <td className="text-end">
                              <Link
                                to={`/pengukuran/${item.attendance_id}`}
                                className="btn btn-sm btn-tp-primary"
                              >
                                <Icon name="ruler" size={15} />
                                <span>Lengkapi Ukur</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : data.unmeasuredChildren.length === 0 ? (
              <div className="text-center py-5 small text-secondary">
                Seluruh balita aktif telah tercatat hadir dan diukur di sesi/periode ini.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table tp-table">
                  <thead>
                    <tr>
                      <th>Balita & Tgl Lahir</th>
                      <th>Orang Tua / Wali</th>
                      <th>Unit Posyandu</th>
                      <th>Status Kehadiran</th>
                      <th className="text-end">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unmeasuredChildren.map((item) => {
                      const avatarTone = getAvatarToneClass(
                        item.internal_code || item.child_name
                      );
                      return (
                        <tr key={item.child_id}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <span className={`tp-avatar ${avatarTone}`}>
                                {getInitials(item.child_name)}
                              </span>
                              <div>
                                <div className="fw-bold text-dark">{item.child_name}</div>
                                <div className="small text-secondary font-mono-num">
                                  {item.internal_code} &middot; {item.birth_date} ({item.sex})
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="fw-semibold text-dark">{item.guardian_name}</div>
                            <div className="small text-secondary font-mono-num">
                              {item.guardian_phone || '-'}
                            </div>
                          </td>
                          <td className="fw-semibold">{item.posyandu_name}</td>
                          <td>
                            <span className="tp-badge tp-badge-red">
                              {item.attendance_status === 'absent'
                                ? 'Tidak Hadir'
                                : 'Belum Tercatat'}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              {item.session_id && (
                                <Link
                                  to={`/sesi/${item.session_id}`}
                                  className="btn btn-sm btn-tp-soft"
                                >
                                  Buka Sesi
                                </Link>
                              )}
                              <Link
                                to={`/anak/${item.child_id}`}
                                className="btn btn-sm btn-outline-secondary rounded-3"
                              >
                                Profil
                              </Link>
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
        </>
      )}
    </div>
  );
}
