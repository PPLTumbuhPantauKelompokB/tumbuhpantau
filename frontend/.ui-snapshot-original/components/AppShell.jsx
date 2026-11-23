import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../api/client.js';
import { CLINICAL_DISCLAIMER, formatRoleLabel } from '../utils/formatters.js';
import { Icon } from './Icon.jsx';

function getNavSectionsForRole(role) {
  if (role === 'kader') {
    return [
      {
        title: 'Pelayanan Posyandu',
        items: [
          { to: '/dashboard', label: 'Dashboard Posyandu', icon: 'dashboard' },
          { to: '/sesi', label: 'Sesi & Kehadiran', icon: 'calendar' },
          { to: '/anak', label: 'Data Balita', icon: 'child' },
          { to: '/wali', label: 'Data Orang Tua / Wali', icon: 'users' },
          { to: '/monitoring', label: 'Monitoring Ukur', icon: 'clipboard' }
        ]
      },
      {
        title: 'Koordinasi & Laporan',
        items: [
          { to: '/peninjauan', label: 'Status Peninjauan', icon: 'check-shield' },
          { to: '/tindak-lanjut', label: 'Tugas Tindak Lanjut', icon: 'user-check' },
          { to: '/laporan', label: 'Laporan & CSV', icon: 'download' }
        ]
      }
    ];
  }

  if (role === 'petugas_puskesmas') {
    return [
      {
        title: 'Supervisi Puskesmas',
        items: [
          { to: '/dashboard', label: 'Dashboard Wilayah', icon: 'dashboard' },
          { to: '/peninjauan', label: 'Antrean Peninjauan', icon: 'check-shield' },
          { to: '/tindak-lanjut', label: 'Tindak Lanjut Kasus', icon: 'user-check' },
          { to: '/monitoring', label: 'Monitoring Ukur', icon: 'clipboard' }
        ]
      },
      {
        title: 'Data & Laporan',
        items: [
          { to: '/anak', label: 'Data Balita', icon: 'child' },
          { to: '/wali', label: 'Data Orang Tua / Wali', icon: 'users' },
          { to: '/sesi', label: 'Sesi Posyandu', icon: 'calendar' },
          { to: '/laporan', label: 'Laporan & CSV', icon: 'download' },
          { to: '/audit-log', label: 'Log Audit', icon: 'log' }
        ]
      }
    ];
  }

  if (role === 'dinas_kesehatan') {
    return [
      {
        title: 'Pemantauan Wilayah',
        items: [
          { to: '/dashboard', label: 'Dashboard Agregat', icon: 'dashboard' },
          { to: '/laporan', label: 'Laporan & CSV', icon: 'download' },
          { to: '/organisasi', label: 'Unit Organisasi', icon: 'building' }
        ]
      }
    ];
  }

  if (role === 'administrator') {
    return [
      {
        title: 'Administrasi Sistem',
        items: [
          { to: '/organisasi', label: 'Unit Organisasi', icon: 'building' },
          { to: '/pengguna', label: 'Akun Pengguna', icon: 'users' },
          { to: '/audit-log', label: 'Log Audit Sistem', icon: 'log' }
        ]
      }
    ];
  }

  return [];
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/dashboard')) return 'Dashboard Operasional & Antropometri';
  if (pathname.startsWith('/sesi/')) return 'Detail Sesi & Kehadiran Balita';
  if (pathname.startsWith('/sesi')) return 'Sesi Kegiatan Posyandu';
  if (pathname.startsWith('/pengukuran/detail/')) return 'Detail Catatan Pengukuran & Histori Revisi';
  if (pathname.startsWith('/pengukuran/')) return 'Input Pengukuran Antropometri Balita';
  if (pathname.startsWith('/anak/')) return 'Profil & Kurva Pertumbuhan Balita';
  if (pathname.startsWith('/anak')) return 'Data Balita Terdaftar';
  if (pathname.startsWith('/wali/')) return 'Detail Profil Orang Tua / Wali';
  if (pathname.startsWith('/wali')) return 'Data Orang Tua & Wali';
  if (pathname.startsWith('/monitoring')) return 'Monitoring Balita Belum Diukur & Draf';
  if (pathname.startsWith('/peninjauan')) return 'Antrean Peninjauan Hasil Antropometri';
  if (pathname.startsWith('/tindak-lanjut/')) return 'Detail & Progres Tugas Tindak Lanjut';
  if (pathname.startsWith('/tindak-lanjut')) return 'Manajemen Tugas Tindak Lanjut';
  if (pathname.startsWith('/laporan')) return 'Laporan Agregat & Ekspor CSV';
  if (pathname.startsWith('/organisasi')) return 'Unit Organisasi Posyandu & Puskesmas';
  if (pathname.startsWith('/pengguna')) return 'Manajemen Akun Pengguna';
  if (pathname.startsWith('/audit-log')) return 'Log Audit Aktivitas Sistem';
  return 'TumbuhPantau';
}

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const showNotifications = user?.role === 'kader' || user?.role === 'petugas_puskesmas';

  useEffect(() => {
    setDrawerOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!showNotifications) return;
    let active = true;
    apiRequest('/notifications')
      .then((res) => {
        if (active && res?.items) {
          setNotifications(res.items);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [showNotifications, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navSections = getNavSectionsForRole(user?.role);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="tp-app-layout">
      {drawerOpen && (
        <div
          className="tp-backdrop d-lg-none"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`tp-sidebar ${drawerOpen ? 'open' : ''}`} aria-label="Navigasi Utama">
        <div className="tp-sidebar-brand">
          <img
            src="/logo-tumbuhpantau.png"
            alt="Logo TumbuhPantau"
            className="tp-brand-logo"
          />
          <div>
            <div className="fw-bold lh-sm text-dark">TumbuhPantau</div>
            <div className="small text-secondary" style={{ fontSize: '0.72rem' }}>
              Portal Operasional Posyandu
            </div>
          </div>
        </div>

        <nav className="tp-sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title} className="mb-3">
              <div className="tp-nav-section-label">{section.title}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `tp-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="tp-sidebar-footer">
          <div className="d-flex align-items-center gap-2 mb-1">
            <Icon name="building" size={15} className="text-secondary" />
            <span className="fw-semibold text-dark text-truncate">{user?.organization_name}</span>
          </div>
          <div className="font-mono-num small text-secondary">Kode: {user?.organization_code}</div>
          <div className="small mt-1 text-secondary">{formatRoleLabel(user?.role)}</div>
        </div>
      </aside>

      <div className="tp-main-wrapper">
        <header className="tp-topbar">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-lg-none d-inline-flex align-items-center gap-1"
              onClick={() => setDrawerOpen((prev) => !prev)}
              aria-label="Buka menu navigasi"
            >
              <Icon name="menu" size={18} />
              <span>Menu</span>
            </button>
            <div>
              <h1 className="h6 mb-0 fw-bold text-dark">{pageTitle}</h1>
              <div className="small text-secondary d-none d-sm-block">
                {user?.organization_name} ({user?.organization_code})
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 gap-md-3">
            {showNotifications && (
              <div className="position-relative">
                <button
                  type="button"
                  className="btn btn-sm btn-tp-soft position-relative"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  aria-expanded={notifOpen}
                >
                  <Icon name="bell" size={16} />
                  <span className="d-none d-sm-inline">Notifikasi</span>
                  {notifications.length > 0 && (
                    <span className="badge rounded-pill bg-danger font-mono-num">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="tp-notif-dropdown p-3">
                    <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
                      <span className="fw-bold small">Peringatan & Tugas Aktif</span>
                      <span className="tp-badge tp-badge-neutral font-mono-num">
                        {notifications.length} item
                      </span>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="small text-secondary mb-0 py-2">
                        Tidak ada antrean mendesak saat ini.
                      </p>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            className="btn btn-light text-start p-2 border rounded-3"
                            onClick={() => {
                              setNotifOpen(false);
                              navigate(n.link);
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <span className="small fw-semibold text-dark">{n.title}</span>
                              <span
                                className={`tp-badge ${
                                  n.severity === 'danger'
                                    ? 'tp-badge-red'
                                    : n.severity === 'warning'
                                      ? 'tp-badge-amber'
                                      : 'tp-badge-blue'
                                }`}
                              >
                                {n.severity === 'danger' ? 'Penting' : 'Tindak Lanjut'}
                              </span>
                            </div>
                            <div className="small text-secondary mt-1">{n.message}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="text-end d-none d-md-block">
              <div className="small fw-semibold lh-sm text-dark">{user?.name}</div>
              <div className="text-secondary" style={{ fontSize: '0.74rem' }}>
                {formatRoleLabel(user?.role)}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-3"
              onClick={handleLogout}
            >
              <Icon name="logout" size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <main className="tp-content">
          <div key={location.pathname} className="tp-page-transition">
            {children}
          </div>
        </main>

        <footer className="tp-disclaimer-footer">
          <div className="tp-disclaimer-pill">
            <Icon name="check-shield" size={15} className="text-success" />
            <span>
              <strong>Standar WHO & Permenkes No. 2/2020:</strong> {CLINICAL_DISCLAIMER}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
