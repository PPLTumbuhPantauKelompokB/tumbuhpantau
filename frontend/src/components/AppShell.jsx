import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { CLINICAL_DISCLAIMER, formatRoleLabel } from '../utils/formatters.js';
import { Icon } from './Icon.jsx';

function getNavSectionsForRole(role) {
  if (role === 'kader') {
    return [
      {
        title: 'Pelayanan Posyandu',
        items: [
          { to: '/dashboard', label: 'Dashboard Posyandu', icon: 'dashboard' },
          { to: '/anak', label: 'Data Balita', icon: 'child' },
          { to: '/wali', label: 'Data Orang Tua / Wali', icon: 'users' },
          { to: '/sesi', label: 'Sesi & Kehadiran', icon: 'calendar' }
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
          { to: '/anak', label: 'Data Balita', icon: 'child' },
          { to: '/wali', label: 'Data Orang Tua / Wali', icon: 'users' },
          { to: '/sesi', label: 'Sesi Posyandu', icon: 'calendar' },
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
          { to: '/dashboard', label: 'Dashboard Wilayah', icon: 'dashboard' },
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
  if (pathname.startsWith('/dashboard')) return 'Dashboard Operasional Posyandu';
  if (pathname.startsWith('/sesi/')) return 'Detail Sesi & Kehadiran Balita';
  if (pathname.startsWith('/sesi')) return 'Sesi Kegiatan Posyandu';
  if (pathname.startsWith('/anak/')) return 'Profil & Riwayat Balita';
  if (pathname.startsWith('/anak')) return 'Data Balita Terdaftar';
  if (pathname.startsWith('/wali/')) return 'Detail Profil Orang Tua / Wali';
  if (pathname.startsWith('/wali')) return 'Data Orang Tua & Wali';
  if (pathname.startsWith('/organisasi')) return 'Unit Organisasi Posyandu & Puskesmas';
  if (pathname.startsWith('/pengguna')) return 'Manajemen Akun Pengguna';
  if (pathname.startsWith('/audit-log')) return 'Log Audit Aktivitas';
  return 'TumbuhPantau';
}

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

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
              <strong>TumbuhPantau:</strong> {CLINICAL_DISCLAIMER}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
