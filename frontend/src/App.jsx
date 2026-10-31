import { useEffect, useState } from 'react';

const fallback = {
  metrics: [
    { key: 'children', label: 'Anak terdaftar', value: '—', helper: 'belum tersambung' },
    { key: 'sessions', label: 'Sesi Posyandu', value: '—', helper: 'belum tersambung' },
    { key: 'measurements', label: 'Pengukuran tercatat', value: '—', helper: 'belum tersambung' },
    { key: 'reviews', label: 'Menunggu peninjauan', value: '—', helper: 'belum tersambung' }
  ],
  modules: [],
  steps: ['Pendaftaran anak', 'Sesi Posyandu', 'Pengukuran', 'Peninjauan', 'Tindak lanjut']
};

const iconPaths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  calendar: 'M3 5h18v16H3z M7 3v4 M17 3v4 M3 11h18',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  clipboard: 'M8 4h-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2 M8 2h8v4H8z M8 13h8 M8 17h6',
  layers: 'M12 2 2 7l10 5 10-5-10-5z M2 12l10 5 10-5 M2 17l10 5 10-5',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  arrow: 'M5 12h14 M12 5l7 7-7 7',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  code: 'm8 9-3 3 3 3 m8-6 3 3-3 3 M14 5l-4 14'
};

function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconPaths[name] ?? iconPaths.layers} />
    </svg>
  );
}

function App() {
  const [api, setApi] = useState('checking');
  const [data, setData] = useState(fallback);
  const [checkedAt, setCheckedAt] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = async () => {
    setApi('checking');
    try {
      const [healthResponse, overviewResponse] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }),
        fetch('/api/demo/overview', { cache: 'no-store' })
      ]);
      if (!healthResponse.ok || !overviewResponse.ok) throw new Error('API unavailable');
      const [health, overview] = await Promise.all([healthResponse.json(), overviewResponse.json()]);
      if (health.status !== 'ok' || overview.demo !== true) throw new Error('Unexpected response');
      setData(overview);
      setApi('online');
    } catch (_err) {
      setData(fallback);
      setApi('offline');
    } finally {
      setCheckedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => { refresh(); }, []);
  const statusLabel = api === 'online' ? 'API terhubung' : api === 'checking' ? 'Memeriksa API' : 'API belum terhubung';

  return (
    <div className="site-shell">
      <aside className={`side-panel ${menuOpen ? 'side-panel--open' : ''}`}>
        <div className="brand"><div className="brand-symbol"><span>+</span></div><div><strong>TumbuhPantau</strong><small>Sistem Informasi Posyandu</small></div></div>
        <div className="nav-eyebrow">WORKSPACE</div>
        <nav aria-label="Menu utama">
          <a className="nav-link-custom selected" href="#overview"><Icon name="dashboard" /> Dashboard <span>01</span></a>
          <a className="nav-link-custom" href="#modules"><Icon name="users" /> Modul Sistem</a>
          <a className="nav-link-custom" href="#workflow"><Icon name="activity" /> Alur Operasional</a>
        </nav>
        <div className="nav-eyebrow tools-heading">DOKUMENTASI</div>
        <nav aria-label="Dokumentasi">
          <a className="nav-link-custom" href="#scope"><Icon name="clipboard" /> Status Development</a>
        </nav>
        <div className="sidebar-bottom"><Icon name="shield" size={18} /><div><strong>Mode prototipe</strong><span>Hanya data sintetis</span></div></div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button type="button" className="mobile-menu" aria-label="Buka menu" onClick={() => setMenuOpen((v) => !v)}><Icon name="menu" /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>Dashboard</strong></div>
          <div className="topbar-actions"><span className="prototype-tag">PROTOTIPE v0.1</span><div className="user-avatar">TP</div></div>
        </header>

        <div className="content-wrap" id="overview">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> SOFTWARE PROJECT — MVP DEVELOPMENT</div><h1>Dashboard TumbuhPantau</h1><p>Fondasi aplikasi pencatatan dan pemantauan pertumbuhan anak berbasis web.</p></div><span className="date-chip">Oktober 2026</span></div>

          <div className="notice"><div className="notice-icon"><Icon name="shield" /></div><div><strong>Data demonstrasi, bukan data pelayanan nyata</strong><p>Seluruh angka di halaman ini adalah fixture sintetis untuk menguji koneksi React dan Express. Belum ada perhitungan WHO, autentikasi, atau data klinis.</p></div></div>

          <div className="section-title-row"><h2>Ringkasan Operasional <span className="section-muted">/ simulasi</span></h2><span className="muted-small">Belum terhubung ke database layanan</span></div>
          <div className="metrics-grid">{data.metrics.map((metric, index) => <div className="metric-card" key={metric.key}><div className={`metric-icon metric-icon-${index}`}><Icon name={['users','calendar','activity','clipboard'][index]} /></div><div className="metric-label">{metric.label}</div><div className="metric-value">{metric.value}</div><div className="metric-footer"><span className="synthetic-dot" /> {metric.helper}</div></div>)}</div>

          <div className="content-grid">
            <section className="panel" id="workflow"><div className="panel-head"><div><h2>Alur Sistem</h2><p>Rangkaian proses yang akan diimplementasikan</p></div><span className="tag-soft">5 tahap</span></div><div className="workflow-list">{data.steps.map((step, index) => <div className="workflow-step" key={step}><span className="step-index">{String(index+1).padStart(2,'0')}</span><div><strong>{step}</strong><small>{['Pengelolaan data anak dan wali','Sesi kegiatan dan pencatatan kehadiran','Input, validasi, dan histori versi','Pemeriksaan hasil oleh petugas','Penugasan dan pencatatan penyelesaian'][index]}</small></div><Icon name="arrow" size={18} /></div>)}</div></section>
            <section className="panel status-panel" id="scope"><div className="panel-head"><div><h2>Status Pengembangan</h2><p>Checklist progress starter</p></div><span className="tag-soft">Sprint 1</span></div><div className="status-feature"><div className={`status-bullet ${api === 'online' ? 'status-ok' : 'status-pending'}`} /><div><strong>{statusLabel}</strong><p>{api === 'online' ? 'React berhasil mengambil JSON dari backend Express.' : api === 'checking' ? 'Menghubungkan ke endpoint /api/health...' : 'Jalankan backend pada port 3001 lalu periksa kembali.'}</p></div></div><button type="button" className="refresh-button" onClick={refresh}>Periksa koneksi lagi <Icon name="arrow" size={16} /></button>{checkedAt && <div className="checked-time">Pemeriksaan terakhir: {checkedAt}</div>}<div className="status-divider" /><div className="check-row"><span className="checkmark">✓</span> Struktur React + Vite</div><div className="check-row"><span className="checkmark">✓</span> Backend Express health endpoint</div><div className="check-row"><span className="checkmark">✓</span> SDD dan implementation plan</div><div className="check-row"><span className="pending-mark">○</span> Database dan login (belum dibuat)</div><div className="check-row"><span className="pending-mark">○</span> Perhitungan WHO (belum dibuat)</div></section>
          </div>

          <section className="panel modules-panel" id="modules"><div className="panel-head"><div><h2>Modul yang Direncanakan</h2><p>Diambil dari cakupan kebutuhan proposal</p></div><span className="tag-soft">8 dari 12 PBI ditampilkan</span></div><div className="module-grid">{data.modules.length ? data.modules.map((m) => <div className="module" key={m.id}><div className="module-overline"><span>{m.id}</span><span className="module-planned">Direncanakan</span></div><h3>{m.label}</h3><p>{m.description}</p></div>) : <div className="module-empty">Modul dapat ditampilkan setelah backend Express aktif.</div>}</div></section>
          <footer>© 2026 TumbuhPantau • Prototype for academic software engineering • Tidak untuk diagnosis klinis</footer>
        </div>
      </main>
    </div>
  );
}

export default App;
