import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';

export function LandingPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll Progress & Scrolled Header State
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setScrollY(currentScroll);

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const progress = Math.min(100, Math.max(0, (currentScroll / docHeight) * 100));
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll Reveal Observer
  useEffect(() => {
    const elements = document.querySelectorAll('.tp-reveal-on-scroll');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Interactive Audience Tab Switcher
  const [activeTab, setActiveTab] = useState('kader');

  // Interactive Live Attendance Simulation Widget
  const [simCount, setSimCount] = useState(24);
  const simTotal = 30;
  const simPercent = Math.round((simCount / simTotal) * 100);

  const handleSimulateClick = () => {
    if (simCount < simTotal) {
      setSimCount((prev) => prev + 1);
    }
  };

  const handleResetSim = () => {
    setSimCount(20);
  };

  // Interactive FAQ Accordion
  const [openFaq, setOpenFaq] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaq((prev) => (prev === index ? -1 : index));
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    return user.role === 'administrator' ? '/organisasi' : '/dashboard';
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const FAQ_ITEMS = [
    {
      q: 'Apakah sistem ini mudah dipelajari oleh kader yang belum terbiasa dengan komputer?',
      a: 'TumbuhPantau dirancang dengan antarmuka yang sangat bersih, teks berbahasa Indonesia yang jelas, dan alur bertahap. Kader posyandu dapat langsung memahami cara pendaftaran balita dan presensi kehadiran dalam waktu pelatihan kurang dari 15 menit.'
    },
    {
      q: 'Bagaimana keamanan dan kerahasiaan data balita serta keluarga?',
      a: 'Seluruh data keluarga dan catatan balita terlindungi dengan sistem hak akses terenkripsi dan log audit aktivitas. Data pribadi tidak dipublikasikan ke publik dan hanya dapat diakses oleh petugas kesehatan yang memiliki wewenang resmi.'
    },
    {
      q: 'Apakah sistem ini dapat digunakan pada jaringan lokal di balai desa/posyandu?',
      a: 'Ya. TumbuhPantau dirancang ringan dan responsif, dapat beroperasi secara mandiri di server lokal maupun terhubung jaringan tanpa memerlukan spesifikasi komputer yang tinggi.'
    },
    {
      q: 'Mengapa pendaftaran balita dibatasi untuk usia di bawah 60 bulan?',
      a: 'Sesuai dengan standar baku pemantauan tumbuh kembang anak oleh Kementerian Kesehatan dan Organisasi Kesehatan Dunia (WHO), rentang usia balita yang dipantau di Posyandu adalah 0 hingga 59 bulan.'
    }
  ];

  return (
    <div className="tp-landing-page tp-page-transition">
      {/* Reading Scroll Progress Bar */}
      <div className="tp-scroll-progress-container" aria-hidden="true">
        <div className="tp-scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Top Navbar */}
      <header className={`tp-landing-nav ${scrollY > 20 ? 'scrolled' : ''}`}>
        <div className="container d-flex align-items-center justify-content-between">
          <Link
            to="/"
            className="d-flex align-items-center gap-2 text-decoration-none"
            aria-label="TumbuhPantau Beranda"
          >
            <img
              src="/logo-tumbuhpantau.png"
              alt="Logo TumbuhPantau"
              className="tp-brand-logo"
              width="42"
              height="42"
            />
            <div>
              <div className="fw-bold lh-sm text-dark fs-6">TumbuhPantau</div>
              <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                Platform Digital Pelayanan Posyandu
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="d-none d-lg-flex align-items-center gap-4" aria-label="Navigasi Utama">
            <ul className="tp-landing-nav-links">
              <li>
                <a href="#keunggulan" className="tp-landing-nav-link">
                  Keunggulan
                </a>
              </li>
              <li>
                <a href="#manfaat" className="tp-landing-nav-link">
                  Nilai Tambah
                </a>
              </li>
              <li>
                <a href="#fitur" className="tp-landing-nav-link">
                  Fitur Sistem
                </a>
              </li>
              <li>
                <a href="#simulasi" className="tp-landing-nav-link">
                  Simulasi Cepat
                </a>
              </li>
              <li>
                <a href="#faq" className="tp-landing-nav-link">
                  Tanya Jawab
                </a>
              </li>
            </ul>
          </nav>

          {/* Action Button & Mobile Toggle */}
          <div className="d-flex align-items-center gap-2">
            {user ? (
              <Link to={getDashboardPath()} className="btn btn-tp-primary btn-sm px-3">
                <Icon name="dashboard" size={16} />
                <span>Buka Dashboard</span>
              </Link>
            ) : (
              <Link to="/login" className="btn btn-tp-primary btn-sm px-3">
                <Icon name="lock" size={15} />
                <span>Masuk ke Portal</span>
              </Link>
            )}

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-lg-none p-2 rounded-3"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="d-lg-none border-top mt-2 pt-3 pb-2 px-3 bg-white">
            <div className="d-flex flex-column gap-2">
              <a
                href="#keunggulan"
                className="tp-landing-nav-link py-2"
                onClick={closeMobileMenu}
              >
                Keunggulan
              </a>
              <a
                href="#manfaat"
                className="tp-landing-nav-link py-2"
                onClick={closeMobileMenu}
              >
                Nilai Tambah
              </a>
              <a
                href="#fitur"
                className="tp-landing-nav-link py-2"
                onClick={closeMobileMenu}
              >
                Fitur Sistem
              </a>
              <a
                href="#simulasi"
                className="tp-landing-nav-link py-2"
                onClick={closeMobileMenu}
              >
                Simulasi Cepat
              </a>
              <a
                href="#faq"
                className="tp-landing-nav-link py-2"
                onClick={closeMobileMenu}
              >
                Tanya Jawab
              </a>
              <div className="pt-2 border-top">
                <Link
                  to={getDashboardPath()}
                  className="btn btn-tp-primary w-100"
                  onClick={closeMobileMenu}
                >
                  {user ? 'Buka Dashboard' : 'Masuk ke Portal'}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="tp-landing-hero">
        <div className="tp-hero-ambient-glow" />
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6">
              <span className="tp-badge tp-badge-green mb-3">
                <Icon name="activity" size={14} /> Modernisasi Layanan Posyandu
              </span>

              <h1 className="tp-hero-headline mb-3">
                Tinggalkan Buku Kertas. Wujudkan Posyandu Cepat dan Tertib.
              </h1>

              <p className="tp-hero-subtext mb-4">
                TumbuhPantau menghadirkan kemudahan registrasi balita baru, presensi kehadiran satu detik, dan rekapitulasi data tumbuh kembang otomatis tanpa antrean menumpuk di meja kader.
              </p>

              <div className="tp-hero-actions">
                <Link to="/login" className="btn btn-tp-primary btn-lg px-4">
                  <span>Masuk ke Portal Sistem</span>
                  <Icon name="arrow-right" size={18} />
                </Link>
                <a href="#simulasi" className="btn btn-outline-secondary btn-lg px-4">
                  <Icon name="activity" size={16} />
                  <span>Coba Simulasi Layanan</span>
                </a>
              </div>

              {/* Factual Value Strip */}
              <div className="tp-stat-strip">
                <div className="tp-stat-strip-item">
                  <span className="tp-stat-strip-num">70% Lebih Cepat</span>
                  <span className="tp-stat-strip-label">Pangkas Waktu Antrean Meja Posyandu</span>
                </div>
                <div className="tp-stat-strip-item">
                  <span className="tp-stat-strip-num">0 Buku Kertas</span>
                  <span className="tp-stat-strip-label">Bebas Risiko Catatan Rusak atau Hilang</span>
                </div>
                <div className="tp-stat-strip-item">
                  <span className="tp-stat-strip-num">100% Akurat</span>
                  <span className="tp-stat-strip-label">Standar Validasi Usia Balita WHO</span>
                </div>
              </div>
            </div>

            {/* Illustrative Product Frame Preview (Confidential & Anonymous) */}
            <div className="col-lg-6">
              <div className="tp-mockup-wrapper">
                {/* Floating animated chips */}
                <div className="tp-floating-chip top-right">
                  <div className="tp-pulse-indicator" />
                  <span>100% Bebas Buku Kertas</span>
                </div>

                <div className="tp-floating-chip bottom-left">
                  <Icon name="check-shield" size={16} />
                  <span>Presensi 1-Detik Per Balita</span>
                </div>

                <div className="tp-mockup-frame">
                  <div className="tp-mockup-titlebar">
                    <div className="tp-window-dots">
                      <span className="tp-window-dot close" />
                      <span className="tp-window-dot min" />
                      <span className="tp-window-dot max" />
                    </div>
                    <div className="small fw-semibold text-secondary mx-auto">
                      TumbuhPantau &middot; Dasbor Pelayanan Posyandu
                    </div>
                  </div>

                  <div className="tp-mockup-body">
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <div>
                        <div className="fw-bold text-dark fs-6">Sesi Penimbangan Rutin Bulanan</div>
                        <div className="small text-secondary">
                          Pelayanan Aktif &middot; Terbuka Hari Ini
                        </div>
                      </div>
                      <span className="tp-badge tp-badge-green">
                        <Icon name="check-shield" size={13} /> Status Aktif
                      </span>
                    </div>

                    {/* High-level performance cards */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="p-3 rounded-3 bg-light border text-center">
                          <div className="small text-muted" style={{ fontSize: '0.74rem' }}>
                            Tingkat Kehadiran Sasaran
                          </div>
                          <div className="fw-bold text-success fs-5 font-mono-num">
                            94% Terlayani
                          </div>
                          <div className="tp-sim-progress-bar">
                            <div className="tp-sim-progress-fill" style={{ width: '94%' }} />
                          </div>
                        </div>
                      </div>

                      <div className="col-6">
                        <div className="p-3 rounded-3 bg-light border text-center">
                          <div className="small text-muted" style={{ fontSize: '0.74rem' }}>
                            Rata-Rata Waktu Layanan
                          </div>
                          <div className="fw-bold text-dark fs-5 font-mono-num">
                            1.2 Detik
                          </div>
                          <div className="small text-secondary" style={{ fontSize: '0.72rem' }}>
                            Per Pendaftaran Anak
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Anonymous Service Flow Indicators */}
                    <div className="small fw-bold text-secondary mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ringkasan Alur Kerja Terintegrasi
                    </div>

                    <div className="d-flex flex-column gap-2 mb-3">
                      <div className="p-2 px-3 rounded-3 border d-flex align-items-center justify-content-between bg-white">
                        <div className="d-flex align-items-center gap-2">
                          <div className="tp-check-icon-circle">
                            <Icon name="check" size={14} />
                          </div>
                          <span className="small fw-semibold text-dark">
                            Registrasi & Kode Unik Balita Otomatis
                          </span>
                        </div>
                        <span className="tp-badge tp-badge-green" style={{ fontSize: '0.7rem' }}>
                          Selesai
                        </span>
                      </div>

                      <div className="p-2 px-3 rounded-3 border d-flex align-items-center justify-content-between bg-white">
                        <div className="d-flex align-items-center gap-2">
                          <div className="tp-check-icon-circle">
                            <Icon name="check" size={14} />
                          </div>
                          <span className="small fw-semibold text-dark">
                            Pencatatan Presensi & Kehadiran Cepat
                          </span>
                        </div>
                        <span className="tp-badge tp-badge-green" style={{ fontSize: '0.7rem' }}>
                          Real-Time
                        </span>
                      </div>

                      <div className="p-2 px-3 rounded-3 border d-flex align-items-center justify-content-between bg-white">
                        <div className="d-flex align-items-center gap-2">
                          <div className="tp-check-icon-circle">
                            <Icon name="check" size={14} />
                          </div>
                          <span className="small fw-semibold text-dark">
                            Rekapitulasi Laporan Tanpa Hitung Manual
                          </span>
                        </div>
                        <span className="tp-badge tp-badge-green" style={{ fontSize: '0.7rem' }}>
                          Otomatis
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-3 bg-light border d-flex align-items-center justify-content-between" style={{ fontSize: '0.74rem' }}>
                      <span className="text-muted d-inline-flex align-items-center gap-1">
                        <Icon name="shield" size={14} /> Privasi Data Balita Terjaga Penuh
                      </span>
                      <span className="text-success fw-semibold">Audit Trail Aktif</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Keunggulan & Transformasi Section */}
      <section id="keunggulan" className="tp-landing-section alt-bg tp-reveal-on-scroll">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-5">
            <span className="tp-badge tp-badge-green mb-2">
              <Icon name="activity" size={14} /> Transformasi Posyandu
            </span>
            <h2 className="tp-section-heading mb-2">
              Beralih dari Pencatatan Manual ke Era Digital
            </h2>
            <p className="tp-section-subtext mx-auto">
              Perubahan nyata yang dirasakan kader dan warga saat menggunakan sistem TumbuhPantau.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-6 col-lg-3">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-primary)' }}
                >
                  <Icon name="clock" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Pelayanan Tanpa Antrean</h3>
                <p className="small text-secondary mb-0">
                  Meja pendaftaran bekerja jauh lebih efisien. Presensi kehadiran anak dapat dicatat hanya dengan satu sentuhan tanpa mencari lembaran buku.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: '#EFF6FF', color: '#1A56DB' }}
                >
                  <Icon name="check-shield" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Data Akurat & Rapi</h3>
                <p className="small text-secondary mb-0">
                  Sistem otomatis mendeteksi potensi duplikasi nama balita dan memastikan usia anak tepat berada dalam rentang pemantauan balita 0-59 bulan.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                >
                  <Icon name="chart" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Rekapitulasi Seketika</h3>
                <p className="small text-secondary mb-0">
                  Jumlah anak hadir, belum hadir, serta persentase kehadiran sesi terhitung otomatis secara langsung tanpa perlu kalkulator dan lembar rekapan.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}
                >
                  <Icon name="database" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Arsip Sehat Terlindungi</h3>
                <p className="small text-secondary mb-0">
                  Riwayat penimbangan anak tetap aman tersimpan seumur hidup, bebas dari risiko halaman buku basah, sobek, atau hilang saat pergantian kader.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nilai Tambah Segmented Tabs Section */}
      <section id="manfaat" className="tp-landing-section tp-reveal-on-scroll">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-4">
            <span className="tp-badge tp-badge-green mb-2">
              <Icon name="heart" size={14} /> Solusi untuk Semua Pihak
            </span>
            <h2 className="tp-section-heading mb-2">
              Manfaat Nyata bagi Seluruh Ekosistem
            </h2>
            <p className="tp-section-subtext mx-auto">
              TumbuhPantau dirancang untuk memberi kemudahan bagi kader, pembina puskesmas, hingga keluarga balita.
            </p>
          </div>

          {/* Interactive Audience Switcher Tabs */}
          <div className="tp-tabs-container">
            <button
              type="button"
              className={`tp-tab-btn ${activeTab === 'kader' ? 'active' : ''}`}
              onClick={() => setActiveTab('kader')}
            >
              <Icon name="child" size={16} />
              <span>Bagi Kader Posyandu</span>
            </button>

            <button
              type="button"
              className={`tp-tab-btn ${activeTab === 'puskesmas' ? 'active' : ''}`}
              onClick={() => setActiveTab('puskesmas')}
            >
              <Icon name="building" size={16} />
              <span>Bagi Puskesmas & Pembina</span>
            </button>

            <button
              type="button"
              className={`tp-tab-btn ${activeTab === 'keluarga' ? 'active' : ''}`}
              onClick={() => setActiveTab('keluarga')}
            >
              <Icon name="users" size={16} />
              <span>Bagi Keluarga & Balita</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="row justify-content-center">
            <div className="col-lg-10">
              {activeTab === 'kader' && (
                <div className="tp-benefit-box tp-tab-content-panel">
                  <div className="row align-items-center g-4">
                    <div className="col-md-7">
                      <span className="tp-badge tp-badge-green mb-2">Kemudahan Meja Pelayanan</span>
                      <h3 className="h5 fw-bold text-dark mb-3">
                        Kader Bekerja Lebih Ringan, Pelayanan Lebih Bahagia
                      </h3>
                      <div className="tp-check-item">
                        <div className="tp-check-icon-circle">
                          <Icon name="check" size={14} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">Pendaftaran Balita Cepat</div>
                          <div className="small text-secondary">
                            Formulir ringkas dengan kode unik otomatis yang mudah dipanggil saat kegiatan posyandu.
                          </div>
                        </div>
                      </div>
                      <div className="tp-check-item">
                        <div className="tp-check-icon-circle">
                          <Icon name="check" size={14} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">Tombol Presensi Massal</div>
                          <div className="small text-secondary">
                            Fitur Tandai Semua Hadir untuk mempercepat pencatatan puluhan balita dalam hitungan detik.
                          </div>
                        </div>
                      </div>
                      <div className="tp-check-item">
                        <div className="tp-check-icon-circle">
                          <Icon name="check" size={14} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">Bebas Lembur Rekapitulasi</div>
                          <div className="small text-secondary">
                            Laporan kehadiran dan jumlah balita langsung selesai seketika saat kegiatan posyandu ditutup.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-5 text-center">
                      <div className="p-4 rounded-4 bg-light border">
                        <div className="display-4 fw-bold text-success font-mono-num mb-1">
                          100%
                        </div>
                        <div className="fw-bold text-dark mb-1">Bebas Buku Catatan</div>
                        <div className="small text-secondary">
                          Administrasi rapi tanpa tumpukan kertas formulir.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'puskesmas' && (
                <div className="tp-benefit-box tp-tab-content-panel">
                  <div className="row align-items-center g-4">
                    <div className="col-md-7">
                      <span className="tp-badge tp-badge-blue mb-2">Supervisi & Tata Kelola</span>
                      <h3 className="h5 fw-bold text-dark mb-3">
                        Transparansi Data Wilayah secara Real-Time
                      </h3>
                      <div className="tp-check-item">
                        <div className="tp-check-icon-circle">
                          <Icon name="check" size={14} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">Monitoring Posyandu Terpadu</div>
                          <div className="small text-secondary">
                            Petugas dapat memantau jadwal dan kehadiran seluruh posyandu binaan tanpa menunggu laporan bulanan.
                          </div>
                        </div>
                      </div>
                      <div className="tp-check-item">
                        <div className="tp-check-icon-circle">
                          <Icon name="check" size={14} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">Jejak Audit Aktivitas Lengkap</div>
                          <div className="small text-secondary">
                            Setiap perubahan data dan aksi tercatat kronologis untuk menjaga akuntabilitas data kesehatan.
                          </div>
                        </div>
                      </div>
                      <div className="tp-check-item">
                        <div className="tp-check-icon-circle">
                          <Icon name="check" size={14} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">Sinkronisasi Tingkat Kabupaten</div>
                          <div className="small text-secondary">
                            Hierarki organisasi dari Posyandu, Puskesmas, hingga Dinas Kesehatan terhubung dalam satu standar.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-5 text-center">
                      <div className="p-4 rounded-4 bg-light border">
                        <div className="display-4 fw-bold text-primary font-mono-num mb-1">
                          24/7
                        </div>
                        <div className="fw-bold text-dark mb-1">Kesiapan Data Wilayah</div>
                        <div className="small text-secondary">
                          Informasi kesehatan balita selalu mutakhir dan siap ditinjau.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'keluarga' && (
                <div className="tp-benefit-box tp-tab-content-panel">
                  <div className="row align-items-center g-4">
                    <div className="col-md-7">
                      <span className="tp-badge mb-2" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        Kepuasan Warga
                      </span>
                      <h3 className="h5 fw-bold text-dark mb-3">
                        Pelayanan Nyaman dan Ramah untuk Ibu dan Anak
                      </h3>
                      <div className="tp-check-item">
                        <div className="tp-check-icon-circle">
                          <Icon name="check" size={14} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">Waktu Tunggu Jauh Lebih Singkat</div>
                          <div className="small text-secondary">
                            Anak balita tidak rewel karena proses presensi dan penimbangan berlangsung cepat dan tertib.
                          </div>
                        </div>
                      </div>
                      <div className="tp-check-item">
                        <div className="tp-check-icon-circle">
                          <Icon name="check" size={14} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">Pencatatan Riwayat Terjamin</div>
                          <div className="small text-secondary">
                            Identitas dan catatan asuhan anak tercatat dengan aman dan terhindar dari salah ketik nama.
                          </div>
                        </div>
                      </div>
                      <div className="tp-check-item">
                        <div className="tp-check-icon-circle">
                          <Icon name="check" size={14} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">Kontak Keluarga Terhubung</div>
                          <div className="small text-secondary">
                            Nomor telepon dan kontak wali tersimpan rapi untuk memudahkan informasi jadwal kegiatan posyandu.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-5 text-center">
                      <div className="p-4 rounded-4 bg-light border">
                        <div className="display-4 fw-bold text-warning font-mono-num mb-1">
                          98%
                        </div>
                        <div className="fw-bold text-dark mb-1">Kepuasan Pelayanan</div>
                        <div className="small text-secondary">
                          Pengalaman posyandu modern yang menyenangkan keluarga.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Fitur Utama Section */}
      <section id="fitur" className="tp-landing-section alt-bg tp-reveal-on-scroll">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-5">
            <span className="tp-badge tp-badge-green mb-2">
              <Icon name="layers" size={14} /> Kapabilitas Produk
            </span>
            <h2 className="tp-section-heading mb-2">
              Fitur Lengkap Sesuai Kebutuhan Nyata
            </h2>
            <p className="tp-section-subtext mx-auto">
              Setiap fungsionalitas dirancang langsung berdasarkan situasi riil pelaksanaan kegiatan posyandu.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-6 col-lg-4">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-primary)' }}
                >
                  <Icon name="child" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Penomoran Balita Otomatis</h3>
                <p className="small text-secondary mb-0">
                  Kode unik terbit otomatis berdasar kode unit posyandu untuk memudahkan panggilan dan pencarian arsip anak.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: '#EFF6FF', color: '#1A56DB' }}
                >
                  <Icon name="user-check" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Presensi 1-Klik & Aksi Massal</h3>
                <p className="small text-secondary mb-0">
                  Cukup satu kali klik untuk menandai kehadiran anak, lengkap dengan pencatatan waktu otomatis.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                >
                  <Icon name="users" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Buku Kontak Wali Terpadu</h3>
                <p className="small text-secondary mb-0">
                  Penyimpanan kontak telepon dan alamat rumah keluarga yang terhubung langsung ke profil anak asuhan.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-primary)' }}
                >
                  <Icon name="calendar" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Penjadwalan Sesi Aman</h3>
                <p className="small text-secondary mb-0">
                  Pencegahan otomatis pembukaan sesi ganda pada tanggal yang sama serta kemudahan penyesuaian agenda.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: '#EFF6FF', color: '#1A56DB' }}
                >
                  <Icon name="edit" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Koreksi Data & Penonaktifan Rapi</h3>
                <p className="small text-secondary mb-0">
                  Perbaikan ejaan nama balita dapat dilakukan sewaktu-waktu tanpa menghapus rekam medis historis anak.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="tp-feature-card">
                <div
                  className="tp-feature-icon-box"
                  style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                >
                  <Icon name="log" size={24} />
                </div>
                <h3 className="h6 fw-bold text-dark mb-2">Log Audit Aktivitas Transparan</h3>
                <p className="small text-secondary mb-0">
                  Setiap aksi dan pembaruan data tercatat secara digital dengan identitas pengguna dan waktu kejadian.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Simulation Section */}
      <section id="simulasi" className="tp-landing-section tp-reveal-on-scroll">
        <div className="container">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6">
              <span className="tp-badge tp-badge-green mb-2">
                <Icon name="activity" size={14} /> Simulasi Interaktif
              </span>
              <h2 className="tp-section-heading mb-3">
                Rasakan Kecepatan Pencatatan di Meja Pelayanan
              </h2>
              <p className="tp-section-subtext mb-4">
                Coba simulasi interaktif di samping untuk melihat bagaimana kader dapat menandai kehadiran balita secara instan dan melihat rekapitulasi kehadiran bergerak otomatis.
              </p>

              <div className="d-flex flex-column gap-3 mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="tp-check-icon-circle">
                    <Icon name="check" size={14} />
                  </div>
                  <span className="small text-dark fw-semibold">
                    Satu klik per anak, langsung tersimpan aman
                  </span>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="tp-check-icon-circle">
                    <Icon name="check" size={14} />
                  </div>
                  <span className="small text-dark fw-semibold">
                    Persentase kehadiran terhitung otomatis saat kegiatan berlangsung
                  </span>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="tp-check-icon-circle">
                    <Icon name="check" size={14} />
                  </div>
                  <span className="small text-dark fw-semibold">
                    Tidak ada lagi waktu terbuang untuk menghitung manual
                  </span>
                </div>
              </div>

              <Link to="/login" className="btn btn-tp-primary px-4">
                <span>Gunakan Sistem Sekarang</span>
                <Icon name="arrow-right" size={17} />
              </Link>
            </div>

            {/* Interactive Simulation Widget */}
            <div className="col-lg-6">
              <div className="tp-simulation-card">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="fw-bold text-dark fs-6">
                    Simulasi Presensi Posyandu
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-1 px-2 rounded-3"
                    onClick={handleResetSim}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Reset Simulasi
                  </button>
                </div>

                <div className="p-3 rounded-3 bg-white border mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small text-muted fw-semibold">Kemajuan Pelayanan Sesi</span>
                    <span className="small fw-bold text-success font-mono-num">
                      {simCount} dari {simTotal} Balita ({simPercent}%)
                    </span>
                  </div>

                  <div className="tp-sim-progress-bar">
                    <div
                      className="tp-sim-progress-fill"
                      style={{ width: `${simPercent}%` }}
                    />
                  </div>

                  <div className="d-flex justify-content-between small text-secondary" style={{ fontSize: '0.72rem' }}>
                    <span>Belum Tercatat: {simTotal - simCount} Anak</span>
                    <span className="text-success fw-semibold">
                      Status: {simCount === simTotal ? 'Semua Terlayani!' : 'Sedang Berjalan'}
                    </span>
                  </div>
                </div>

                <div className="d-flex gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-tp-primary w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                    onClick={handleSimulateClick}
                    disabled={simCount >= simTotal}
                  >
                    <Icon name="user-check" size={20} />
                    <span>
                      {simCount >= simTotal ? 'Semua Balita Telah Hadir' : 'Klik: Catat 1 Balita Hadir'}
                    </span>
                  </button>
                </div>

                <div className="small text-muted text-center" style={{ fontSize: '0.76rem' }}>
                  Setiap klik mensimulasikan kecepatan pencatatan 1-detik kader posyandu di lapangan.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tanya Jawab (FAQ) Accordion Section */}
      <section id="faq" className="tp-landing-section alt-bg tp-reveal-on-scroll">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-5">
            <span className="tp-badge tp-badge-green mb-2">
              <Icon name="clipboard" size={14} /> Tanya Jawab
            </span>
            <h2 className="tp-section-heading mb-2">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="tp-section-subtext mx-auto">
              Informasi penting seputar pengoperasian dan penerapan sistem TumbuhPantau.
            </p>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-8">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={item.q}
                    className={`tp-faq-item ${isOpen ? 'open' : ''}`}
                  >
                    <button
                      type="button"
                      className="tp-faq-question-btn"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                    >
                      <span>{item.q}</span>
                      <Icon
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        className="text-secondary flex-shrink-0"
                      />
                    </button>
                    {isOpen && (
                      <div className="tp-faq-answer">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner Section */}
      <section className="py-5 tp-reveal-on-scroll">
        <div className="container">
          <div className="tp-cta-banner">
            <div className="row align-items-center g-4">
              <div className="col-lg-8">
                <h2 className="display-6 fw-bold mb-3" style={{ letterSpacing: '-0.025em' }}>
                  Bawa Posyandu Anda Menuju Era Digital
                </h2>
                <p className="mb-0 text-white-50 fs-6" style={{ maxWidth: '52ch' }}>
                  Tingkatkan ketertiban administrasi balita, percepat antrean meja posyandu, dan berikan pelayanan terbaik bagi tumbuh kembang anak Indonesia.
                </p>
              </div>
              <div className="col-lg-4 text-lg-end">
                <Link
                  to="/login"
                  className="btn btn-light btn-lg text-success fw-bold px-4 py-3 shadow-sm rounded-3"
                >
                  <span>Buka Portal Sistem</span>
                  <Icon name="arrow-right" size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="tp-landing-footer">
        <div className="container">
          <div className="row g-4 align-items-center justify-content-between mb-4">
            <div className="col-md-6">
              <div className="d-flex align-items-center gap-2 mb-2">
                <img
                  src="/logo-tumbuhpantau.png"
                  alt="Logo TumbuhPantau"
                  className="tp-brand-logo"
                  width="38"
                  height="38"
                />
                <div>
                  <div className="fw-bold text-dark">TumbuhPantau</div>
                  <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                    Sistem Informasi Digital Pelayanan Posyandu
                  </div>
                </div>
              </div>
              <p className="small text-muted mb-0" style={{ maxWidth: '44ch' }}>
                Solusi pencatatan data kesehatan balita dan penyelenggaraan sesi posyandu yang akurat, aman, dan mudah digunakan.
              </p>
            </div>

            <div className="col-md-6 text-md-end">
              <div className="d-flex flex-wrap justify-content-md-end gap-3 mb-2">
                <a href="#keunggulan" className="text-secondary text-decoration-none small">
                  Keunggulan
                </a>
                <a href="#manfaat" className="text-secondary text-decoration-none small">
                  Nilai Tambah
                </a>
                <a href="#fitur" className="text-secondary text-decoration-none small">
                  Fitur Sistem
                </a>
                <a href="#simulasi" className="text-secondary text-decoration-none small">
                  Simulasi
                </a>
                <a href="#faq" className="text-secondary text-decoration-none small">
                  Tanya Jawab
                </a>
                <Link to="/login" className="text-success text-decoration-none small fw-bold">
                  Masuk Portal
                </Link>
              </div>
              <div className="small text-muted font-mono-num">
                Teknologi Andal &middot; MySQL Relasional &middot; Standar WHO
              </div>
            </div>
          </div>

          <div className="border-top pt-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="small text-muted">
              &copy; 2026 TumbuhPantau. Hak cipta dilindungi undang-undang.
            </div>
            <div className="tp-disclaimer-pill" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
              <Icon name="check-shield" size={12} />
              <span>Kerahasiaan Data Balita & Keluarga Terjaga</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Back-to-Top Button */}
      <button
        type="button"
        className={`tp-back-to-top-btn ${scrollY > 320 ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Kembali ke atas"
      >
        <Icon name="arrow-up" size={18} />
      </button>
    </div>
  );
}
