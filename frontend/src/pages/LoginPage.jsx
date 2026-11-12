import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { CLINICAL_DISCLAIMER } from '../utils/formatters.js';
import { Icon } from '../components/Icon.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Kader', username: 'kader.mlt01', password: '123456' },
  { label: 'Petugas', username: 'petugas.melati', password: '123456' },
  { label: 'Dinas', username: 'dinas', password: '123456' },
  { label: 'Admin', username: 'admin', password: '123456' }
];

const HERO_FEATURES = [
  {
    icon: 'child',
    tone: 'tp-stat-icon-green',
    title: 'Pendaftaran Balita Cepat',
    desc: 'Registrasi balita 0-59 bulan dengan pembuatan kode unik posyandu otomatis.'
  },
  {
    icon: 'calendar',
    tone: 'tp-stat-icon-blue',
    title: 'Sesi Posyandu & Absensi',
    desc: 'Buka jadwal kegiatan bulanan dan catat kehadiran balita dalam satu klik.'
  },
  {
    icon: 'users',
    tone: 'tp-stat-icon-amber',
    title: 'Manajemen Orang Tua & Wali',
    desc: 'Kelola kontak wali, riwayat asuh, serta hubungan keluarga yang terintegrasi.'
  }
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const loggedUser = await login(username, password);
      if (loggedUser.role === 'administrator') {
        navigate('/organisasi', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal masuk. Periksa kembali username dan password Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillAccount = (acc) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setErrorMsg('');
  };

  return (
    <div className="tp-login-page tp-page-transition">
      <header className="tp-glass-navbar">
        <div className="container d-flex flex-wrap align-items-center justify-content-between gap-3">
          <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
            <img
              src="/logo-tumbuhpantau.png"
              alt="Logo TumbuhPantau"
              className="tp-brand-logo"
            />
            <div>
              <div className="fw-bold lh-sm text-dark">TumbuhPantau</div>
              <div className="small text-secondary" style={{ fontSize: '0.73rem' }}>
                Sistem Informasi Digital Posyandu
              </div>
            </div>
          </Link>

          <div className="d-flex align-items-center gap-2">
            <Link to="/" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-3">
              <Icon name="arrow-left" size={14} />
              <span>Beranda</span>
            </Link>
            <span className="tp-badge tp-badge-green d-none d-md-inline-flex">
              <Icon name="check-shield" size={14} /> Sprint 1 Operasional Posyandu
            </span>
          </div>
        </div>
      </header>

      <main className="container my-auto py-4 py-lg-5">
        <div className="row align-items-center g-4 g-lg-5">
          <div className="col-lg-7">
            <div className="pe-lg-4">
              <span className="tp-badge tp-badge-green mb-3">
                <Icon name="child" size={14} /> Pemantauan Balita 0-59 Bulan
              </span>

              <h1 className="display-6 fw-bold text-dark mb-3" style={{ letterSpacing: '-0.02em' }}>
                Satu Platform Pemantauan Tumbuh Kembang Balita
              </h1>

              <p className="text-secondary mb-4" style={{ maxWidth: '58ch' }}>
                Integrasi pendaftaran balita baru, data orang tua/wali, serta pencatatan kehadiran sesi Posyandu dalam antarmuka yang bersih dan mudah digunakan.
              </p>

              <div className="d-flex flex-column gap-3 mb-4">
                {HERO_FEATURES.map((item) => (
                  <div key={item.title} className="tp-feature-mini-card">
                    <div
                      className={`tp-stat-icon-box ${item.tone}`}
                      style={{ width: '44px', height: '44px', borderRadius: '12px' }}
                    >
                      <Icon name={item.icon} size={20} />
                    </div>
                    <div>
                      <div className="fw-bold text-dark">{item.title}</div>
                      <div className="small text-secondary">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-flex flex-wrap gap-4 pt-2">
                <div>
                  <div className="fw-bold fs-5 font-mono-num text-dark">0-59 Bln</div>
                  <div className="small text-secondary">Sasaran Usia Balita</div>
                </div>
                <div className="vr opacity-25" />
                <div>
                  <div className="fw-bold fs-5 font-mono-num text-dark">1-Klik</div>
                  <div className="small text-secondary">Pencatatan Kehadiran</div>
                </div>
                <div className="vr opacity-25" />
                <div>
                  <div className="fw-bold fs-5 font-mono-num text-dark">4 Peran</div>
                  <div className="small text-secondary">Otorisasi Berjenjang</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="tp-login-card">
              <div className="mb-4">
                <h2 className="h5 fw-bold text-dark mb-1">Masuk ke Portal Petugas</h2>
                <p className="small text-secondary mb-0">
                  Masukkan akun pengguna wilayah kerja Anda.
                </p>
              </div>

              {errorMsg && (
                <div
                  className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 rounded-3"
                  role="alert"
                >
                  <Icon name="alert-circle" size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mb-4">
                <div className="mb-3">
                  <label htmlFor="login-username" className="form-label small fw-semibold">
                    Username
                  </label>
                  <div className="tp-input-icon-group">
                    <span className="tp-input-icon-left">
                      <Icon name="users" size={17} />
                    </span>
                    <input
                      id="login-username"
                      type="text"
                      className="form-control tp-input-with-icon"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="login-password" className="form-label small fw-semibold">
                    Password
                  </label>
                  <div className="tp-input-icon-group">
                    <span className="tp-input-icon-left">
                      <Icon name="lock" size={17} />
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control tp-input-with-icon pe-5"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="tp-input-toggle-right"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-tp-primary w-100 py-2 mt-1"
                  disabled={submitting}
                >
                  <span>{submitting ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}</span>
                  <Icon name="arrow-right" size={17} />
                </button>
              </form>

              <div className="border-top pt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small fw-semibold text-secondary">Akun Demo Cepat:</span>
                  <span className="small font-mono-num text-secondary">Pass: 123456</span>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      className={`tp-demo-chip ${username === acc.username ? 'active' : ''}`}
                      onClick={() => fillAccount(acc)}
                    >
                      <Icon name="user-check" size={14} />
                      <span>{acc.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="container py-3 text-center">
        <div className="tp-disclaimer-pill">
          <Icon name="check-shield" size={15} className="text-success" />
          <span>{CLINICAL_DISCLAIMER}</span>
        </div>
      </footer>
    </div>
  );
}
