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

function getWorkflowStepsForRole(role) {
  if (role === 'kader') {
    return [
      {
        step: 1,
        title: 'Daftar Balita',
        desc: 'Tambah anak & wali',
        to: '/anak',
        match: (p) => p.startsWith('/anak') || p.startsWith('/wali')
      },
      {
        step: 2,
        title: 'Buka Sesi & Hadir',
        desc: 'Tandai balita hadir',
        to: '/sesi',
        match: (p) => p.startsWith('/sesi')
      },
      {
        step: 3,
        title: 'Input Ukur WHO',
        desc: 'Isi BB/TB & Z-Score',
        to: '/sesi',
        match: (p) => p.startsWith('/pengukuran') || p.startsWith('/monitoring')
      },
      {
        step: 4,
        title: 'Tindak Lanjut',
        desc: 'Catat progres kunjungan',
        to: '/tindak-lanjut',
        match: (p) => p.startsWith('/tindak-lanjut') || p.startsWith('/peninjauan')
      }
    ];
  }

  if (role === 'petugas_puskesmas') {
    return [
      {
        step: 1,
        title: 'Monitoring Ukur',
        desc: 'Cek cakupan < 80%',
        to: '/monitoring',
        match: (p) => p.startsWith('/monitoring')
      },
      {
        step: 2,
        title: 'Peninjauan Gizi',
        desc: 'Validasi & buat tugas',
        to: '/peninjauan',
        match: (p) => p.startsWith('/peninjauan')
      },
      {
        step: 3,
        title: 'Tindak Lanjut',
        desc: 'Evaluasi & tutup tugas',
        to: '/tindak-lanjut',
        match: (p) => p.startsWith('/tindak-lanjut')
      },
      {
        step: 4,
        title: 'Laporan & Audit',
        desc: 'Unduh CSV wilayah',
        to: '/laporan',
        match: (p) => p.startsWith('/laporan') || p.startsWith('/audit-log')
      }
    ];
  }

  if (role === 'dinas_kesehatan') {
    return [
      {
        step: 1,
        title: 'Dashboard Wilayah',
        desc: 'KPI & tren stunting',
        to: '/dashboard',
        match: (p) => p.startsWith('/dashboard')
      },
      {
        step: 2,
        title: 'Ekspor CSV Agregat',
        desc: 'Unduh laporan (<5)',
        to: '/laporan',
        match: (p) => p.startsWith('/laporan')
      },
      {
        step: 3,
        title: 'Hierarki Unit',
        desc: 'Daftar Puskesmas & Posyandu',
        to: '/organisasi',
        match: (p) => p.startsWith('/organisasi')
      }
    ];
  }

  if (role === 'administrator') {
    return [
      {
        step: 1,
        title: 'Unit Organisasi',
        desc: 'Puskesmas & Posyandu',
        to: '/organisasi',
        match: (p) => p.startsWith('/organisasi')
      },
      {
        step: 2,
        title: 'Akun Pengguna',
        desc: 'Kelola akses peran',
        to: '/pengguna',
        match: (p) => p.startsWith('/pengguna')
      },
      {
        step: 3,
        title: 'Log Audit',
        desc: 'Jejak aktivitas sistem',
        to: '/audit-log',
        match: (p) => p.startsWith('/audit-log')
      }
    ];
  }

  return [];
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/dashboard')) return 'Dashboard Operasional';
  if (pathname.startsWith('/sesi/')) return 'Detail Sesi & Presensi Balita';
  if (pathname.startsWith('/sesi')) return 'Sesi Kegiatan Posyandu';
  if (pathname.startsWith('/pengukuran/detail/')) return 'Detail Pengukuran & Riwayat Versi';
  if (pathname.startsWith('/pengukuran/')) return 'Input Pengukuran Balita';
  if (pathname.startsWith('/anak/')) return 'Profil & Kurva Pertumbuhan Balita';
  if (pathname.startsWith('/anak')) return 'Data Balita';
  if (pathname.startsWith('/wali/')) return 'Profil Orang Tua / Wali';
  if (pathname.startsWith('/wali')) return 'Data Orang Tua & Wali';
  if (pathname.startsWith('/monitoring')) return 'Monitoring Kelengkapan Ukur';
  if (pathname.startsWith('/peninjauan')) return 'Peninjauan Hasil Antropometri';
  if (pathname.startsWith('/tindak-lanjut/')) return 'Detail & Progres Tindak Lanjut';
  if (pathname.startsWith('/tindak-lanjut')) return 'Tugas Tindak Lanjut';
  if (pathname.startsWith('/laporan')) return 'Laporan Agregat & Ekspor CSV';
  if (pathname.startsWith('/organisasi')) return 'Unit Organisasi';
  if (pathname.startsWith('/pengguna')) return 'Manajemen Akun Pengguna';
  if (pathname.startsWith('/audit-log')) return 'Log Audit Aktivitas';
  return 'TumbuhPantau';
}

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [popupData, setPopupData] = useState(null);
  const [routeAnimating, setRouteAnimating] = useState(false);
  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem('tp_theme_mode') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return localStorage.getItem('tp_hide_workflow_guide') !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    root.setAttribute('data-bs-theme', themeMode);
    try {
      localStorage.setItem('tp_theme_mode', themeMode);
    } catch {}
  }, [themeMode]);

  const toggleThemeMode = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showNotifications = user?.role === 'kader' || user?.role === 'petugas_puskesmas';

  useEffect(() => {
    setDrawerOpen(false);
    setNotifOpen(false);
    setRouteAnimating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const timer = setTimeout(() => setRouteAnimating(false), 420);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    let hideTimer = null;
    const handleNetworkActivity = (event) => {
      if (event?.detail?.active) {
        if (hideTimer) clearTimeout(hideTimer);
        setRouteAnimating(true);
      } else {
        hideTimer = setTimeout(() => setRouteAnimating(false), 260);
      }
    };
    window.addEventListener('tp:network-activity', handleNetworkActivity);
    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      window.removeEventListener('tp:network-activity', handleNetworkActivity);
    };
  }, []);

  useEffect(() => {
    const handlePopupEvent = (event) => {
      if (event?.detail) {
        setPopupData(event.detail);
      }
    };
    window.addEventListener('tp:popup-feedback', handlePopupEvent);
    return () => window.removeEventListener('tp:popup-feedback', handlePopupEvent);
  }, []);

  useEffect(() => {
    if (!popupData) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPopupData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popupData]);

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
  }, [showNotifications, location.pathname, popupData]);

  const toggleGuide = () => {
    setShowGuide((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tp_hide_workflow_guide', next ? '0' : '1');
      } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navSections = getNavSectionsForRole(user?.role);
  const workflowSteps = getWorkflowStepsForRole(user?.role);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="tp-app-layout">
      <div
        className={`tp-top-progress-bar ${routeAnimating ? 'active' : ''}`}
        aria-hidden="true"
      />
      {drawerOpen && (
        <div
          className="tp-backdrop d-lg-none"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {popupData && (
        <div
          className="tp-popup-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tp-popup-title"
          onClick={() => setPopupData(null)}
        >
          <div className="tp-popup-card" onClick={(e) => e.stopPropagation()}>
            <div
              className={`tp-popup-icon-ring ${
                popupData.type === 'danger'
                  ? 'tp-popup-icon-danger'
                  : popupData.type === 'info'
                    ? 'tp-popup-icon-info'
                    : 'tp-popup-icon-success'
              }`}
            >
              <Icon
                name={
                  popupData.type === 'danger'
                    ? 'alert-circle'
                    : popupData.type === 'info'
                      ? 'clipboard'
                      : 'check-shield'
                }
                size={28}
              />
            </div>

            <h3 id="tp-popup-title" className="h5 fw-bold text-dark mb-2">
              {popupData.title}
            </h3>
            <p className="text-secondary mb-4" style={{ fontSize: '0.94rem', lineHeight: 1.55 }}>
              {popupData.message}
            </p>

            <div className="d-flex flex-wrap justify-content-center gap-2 w-100">
              {popupData.nextAction && (
                <button
                  type="button"
                  className="btn btn-tp-soft px-3"
                  onClick={() => {
                    const target = popupData.nextAction.to;
                    setPopupData(null);
                    if (target) navigate(target);
                  }}
                >
                  <span>{popupData.nextAction.label}</span>
                  <Icon name="arrow-right" size={15} />
                </button>
              )}
              <button
                type="button"
                className="btn btn-tp-primary px-4"
                onClick={() => setPopupData(null)}
                autoFocus
              >
                <span>Mengerti & Tutup</span>
              </button>
            </div>
          </div>
        </div>
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
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-3 d-inline-flex align-items-center gap-1"
              onClick={toggleThemeMode}
              title={themeMode === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              aria-label={themeMode === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            >
              <Icon name={themeMode === 'dark' ? 'sun' : 'moon'} size={15} />
              <span className="d-none d-sm-inline">
                {themeMode === 'dark' ? 'Terang' : 'Gelap'}
              </span>
            </button>

            {workflowSteps.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-3 d-none d-md-inline-flex align-items-center gap-1"
                onClick={toggleGuide}
                title="Tampilkan atau sembunyikan panduan alur kerja"
              >
                <Icon name="clipboard" size={15} />
                <span>{showGuide ? 'Sembunyikan Alur' : 'Panduan Alur'}</span>
              </button>
            )}

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
          {workflowSteps.length > 0 && (
            <div
              className={`tp-workflow-collapse ${showGuide ? 'open' : 'closed'}`}
              aria-hidden={!showGuide}
            >
              <div className="tp-workflow-collapse-inner">
                <div className="tp-workflow-bar" aria-label="Panduan Alur Kerja Cepat">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="tp-badge tp-badge-green">Alur Cepat</span>
                      <span className="small fw-semibold text-dark">
                        Klik langkah di bawah ini untuk berpindah tahapan kerja (
                        {formatRoleLabel(user?.role)}):
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-close"
                      style={{ fontSize: '0.72rem' }}
                      onClick={toggleGuide}
                      aria-label="Tutup panduan alur"
                      tabIndex={showGuide ? 0 : -1}
                    />
                  </div>
                  <div className="tp-workflow-grid">
                    {workflowSteps.map((ws) => {
                      const isCurrent = ws.match(location.pathname);
                      return (
                        <button
                          key={ws.step}
                          type="button"
                          className={`tp-workflow-step ${isCurrent ? 'active' : ''}`}
                          onClick={() => navigate(ws.to)}
                          tabIndex={showGuide ? 0 : -1}
                        >
                          <span className="tp-workflow-num">{ws.step}</span>
                          <div className="text-start">
                            <div className="fw-bold text-dark lh-sm" style={{ fontSize: '0.86rem' }}>
                              {ws.title}
                            </div>
                            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                              {ws.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

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
