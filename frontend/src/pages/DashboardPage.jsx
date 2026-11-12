import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { formatRoleLabel } from '../utils/formatters.js';

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest('/children?status=active'),
      apiRequest('/guardians'),
      apiRequest('/sessions')
    ])
      .then(([cData, gData, sData]) => {
        if (!active) return;
        setChildren(cData || []);
        setGuardians(gData || []);
        setSessions(sData || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalChildren = children.length;
  const totalGuardians = guardians.length;
  const openSessions = sessions.filter((s) => s.status === 'open');
  const closedSessions = sessions.filter((s) => s.status === 'closed');

  const totalPresent = sessions.reduce((sum, s) => sum + (s.present_count || 0), 0);
  const totalAbsent = sessions.reduce((sum, s) => sum + (s.absent_count || 0), 0);
  const totalRecorded = totalPresent + totalAbsent;
  const attendanceRate = totalRecorded > 0 ? Math.round((totalPresent / totalRecorded) * 100) : 0;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="tp-hero-header d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <span className="tp-badge tp-badge-green mb-2">
            <Icon name="check-shield" size={14} /> Ringkasan Operasional Posyandu
          </span>
          <h2 className="h4 fw-bold text-dark mb-1">
            Halo, {user?.name}
          </h2>
          <p className="small text-secondary mb-0">
            Unit Kerja: {user?.organization_name} &middot; Peran: {formatRoleLabel(user?.role)}
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {user?.role === 'kader' && (
            <>
              <Link to="/anak" className="btn btn-sm btn-tp-primary">
                <Icon name="plus" size={16} />
                <span>Daftar Balita Baru</span>
              </Link>
              <Link to="/sesi" className="btn btn-sm btn-tp-soft">
                <Icon name="calendar" size={16} />
                <span>Buka Sesi Posyandu</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="tp-stat-card">
            <div className="tp-stat-icon-box tp-stat-icon-green">
              <Icon name="child" size={26} />
            </div>
            <div>
              <div className="tp-stat-value">{loading ? '...' : totalChildren}</div>
              <div className="tp-stat-label">Balita Aktif Terdaftar</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="tp-stat-card">
            <div className="tp-stat-icon-box tp-stat-icon-blue">
              <Icon name="users" size={26} />
            </div>
            <div>
              <div className="tp-stat-value">{loading ? '...' : totalGuardians}</div>
              <div className="tp-stat-label">Wali Terdaftar</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="tp-stat-card">
            <div className="tp-stat-icon-box tp-stat-icon-amber">
              <Icon name="calendar" size={26} />
            </div>
            <div>
              <div className="tp-stat-value">{loading ? '...' : openSessions.length}</div>
              <div className="tp-stat-label">Sesi Kegiatan Terbuka</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="tp-stat-card">
            <div className="tp-stat-icon-box tp-stat-icon-green">
              <Icon name="check-shield" size={26} />
            </div>
            <div>
              <div className="tp-stat-value">{loading ? '...' : `${attendanceRate}%`}</div>
              <div className="tp-stat-label">Rata-rata Kehadiran</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tp-card p-0 overflow-hidden">
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
          <div>
            <h3 className="h6 fw-bold text-dark mb-0">Rekapitulasi Sesi Kegiatan Posyandu</h3>
            <p className="small text-secondary mb-0">
              Riwayat pelaksanaan sesi penimbangan dan pencatatan kehadiran balita.
            </p>
          </div>
          <Link to="/sesi" className="btn btn-sm btn-outline-secondary rounded-3">
            <span>Lihat Semua Sesi</span>
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-5 small text-secondary">Memuat data rekapitulasi...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-5 small text-secondary">
            Belum ada data sesi kegiatan Posyandu.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table tp-table">
              <thead>
                <tr>
                  <th>Tanggal Pelaksanaan</th>
                  <th>Unit Posyandu</th>
                  <th>Status Sesi</th>
                  <th>Balita Hadir</th>
                  <th>Balita Absen</th>
                  <th>Total Sasaran</th>
                  <th className="text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 6).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="font-mono-num fw-bold text-dark">{s.session_date}</div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{s.posyandu_name}</div>
                      <div className="small text-secondary font-mono-num">{s.posyandu_code}</div>
                    </td>
                    <td>
                      <span
                        className={`tp-badge ${
                          s.status === 'open'
                            ? 'tp-badge-green'
                            : s.status === 'cancelled'
                              ? 'tp-badge-red'
                              : 'tp-badge-neutral'
                        }`}
                      >
                        {s.status === 'open'
                          ? 'Terbuka'
                          : s.status === 'cancelled'
                            ? 'Dibatalkan'
                            : 'Selesai'}
                      </span>
                    </td>
                    <td>
                      <span className="tp-badge tp-badge-green font-mono-num">
                        {s.present_count} Hadir
                      </span>
                    </td>
                    <td>
                      <span className="tp-badge tp-badge-neutral font-mono-num">
                        {s.absent_count} Absen
                      </span>
                    </td>
                    <td>
                      <span className="font-mono-num fw-semibold text-dark">
                        {s.active_children_count} Balita
                      </span>
                    </td>
                    <td className="text-end">
                      <Link to={`/sesi/${s.id}`} className="btn btn-sm btn-tp-soft">
                        <span>Detail Kehadiran</span>
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
