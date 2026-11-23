import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('2026-11');
  const [activeTab, setActiveTab] = useState('charts');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg('');

    apiRequest(`/dashboard/stats?period=${encodeURIComponent(period)}`)
      .then((data) => {
        if (active) {
          setSummary(data);
        }
      })
      .catch((err) => {
        if (active) {
          setErrorMsg(err.message || 'Gagal memuat ringkasan dashboard.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period]);

  if (loading && !summary) {
    return (
      <div className="tp-card text-center py-5">
        <div className="spinner-border text-success mb-2" role="status" />
        <div className="small text-secondary">Memuat ringkasan pemantauan...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="alert alert-danger" role="alert">
        {errorMsg}
      </div>
    );
  }

  if (!summary) return null;

  const {
    kpis,
    chart1CategoryDistribution,
    chart2Completeness,
    chart3ReviewAndFollowup,
    stuntingTrend = [],
    unitRows
  } = summary;
  const isKader = user?.role === 'kader';
  const isDinas = user?.role === 'dinas_kesehatan';

  const unitLabels = chart1CategoryDistribution.byUnit.map((u) => u.name);

  const doughnutData = {
    labels: ['Sangat Pendek', 'Pendek', 'Normal', 'Tinggi'],
    datasets: [
      {
        data: [
          chart1CategoryDistribution.totals.sangat_pendek,
          chart1CategoryDistribution.totals.pendek,
          chart1CategoryDistribution.totals.normal,
          chart1CategoryDistribution.totals.tinggi
        ],
        backgroundColor: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'],
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }
    ]
  };

  const stackedCategoryData = {
    labels: unitLabels,
    datasets: [
      {
        label: 'Sangat Pendek',
        data: chart1CategoryDistribution.byUnit.map((u) => u.sangat_pendek),
        backgroundColor: '#EF4444',
        borderRadius: 4
      },
      {
        label: 'Pendek',
        data: chart1CategoryDistribution.byUnit.map((u) => u.pendek),
        backgroundColor: '#F59E0B',
        borderRadius: 4
      },
      {
        label: 'Normal',
        data: chart1CategoryDistribution.byUnit.map((u) => u.normal),
        backgroundColor: '#10B981',
        borderRadius: 4
      },
      {
        label: 'Tinggi',
        data: chart1CategoryDistribution.byUnit.map((u) => u.tinggi),
        backgroundColor: '#3B82F6',
        borderRadius: 4
      }
    ]
  };

  const completenessData = {
    labels: unitLabels,
    datasets: [
      {
        label: 'Diukur Lengkap',
        data: chart2Completeness.byUnit.map((u) => u.diukur_lengkap),
        backgroundColor: '#059669',
        borderRadius: 4
      },
      {
        label: 'Draf Sesi',
        data: chart2Completeness.byUnit.map((u) => u.hadir_belum_lengkap),
        backgroundColor: '#F59E0B',
        borderRadius: 4
      },
      {
        label: 'Belum Diukur',
        data: chart2Completeness.byUnit.map((u) => u.belum_diukur),
        backgroundColor: '#CBD5E1',
        borderRadius: 4
      }
    ]
  };

  const reviewFollowupData = {
    labels: unitLabels,
    datasets: [
      {
        label: 'Perlu Tinjauan',
        data: chart3ReviewAndFollowup.byUnit.map((u) => u.perlu_peninjauan),
        backgroundColor: '#F59E0B',
        borderRadius: 6
      },
      {
        label: 'Ukur Ulang',
        data: chart3ReviewAndFollowup.byUnit.map((u) => u.ukur_ulang),
        backgroundColor: '#EF4444',
        borderRadius: 6
      },
      {
        label: 'Tervalidasi',
        data: chart3ReviewAndFollowup.byUnit.map((u) => u.tervalidasi),
        backgroundColor: '#10B981',
        borderRadius: 6
      },
      {
        label: 'Tindak Lanjut Aktif',
        data: chart3ReviewAndFollowup.byUnit.map((u) => u.tindak_lanjut_aktif),
        backgroundColor: '#1A56DB',
        borderRadius: 6
      },
      {
        label: 'Tindak Lanjut Selesai',
        data: chart3ReviewAndFollowup.byUnit.map((u) => u.tindak_lanjut_selesai),
        backgroundColor: '#0E7C6B',
        borderRadius: 6
      }
    ]
  };

  const stuntingTrendChartData = {
    labels: stuntingTrend.map((t) => `Periode ${t.period}`),
    datasets: [
      {
        label: 'Prevalensi Pendek & Sangat Pendek (%)',
        data: stuntingTrend.map((t) => t.prevalence_percent),
        borderColor: '#0E7C6B',
        backgroundColor: '#E8F5F1',
        pointBackgroundColor: '#0E7C6B',
        pointRadius: 5,
        borderWidth: 2.5,
        tension: 0.2
      }
    ]
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="tp-hero-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-0">
        <div>
          <h2 className="h4 fw-bold text-dark mb-1">Halo, {user?.name}</h2>
          <p className="small text-secondary mb-0">
            Ringkasan operasional & tumbuh kembang balita wilayah{' '}
            <strong>{summary.organizationName}</strong>.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-3 border">
          <Icon name="calendar" size={16} className="text-secondary" />
          <label htmlFor="dash-period" className="small fw-semibold text-secondary mb-0">
            Periode:
          </label>
          <select
            id="dash-period"
            className="form-select form-select-sm border-0 font-mono-num fw-bold py-0 pe-4"
            style={{ width: '115px', backgroundColor: 'transparent' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {(summary.availablePeriods || ['2026-11', '2026-10', '2026-09']).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-sm-6 col-xl-3">
          <div className="tp-stat-card">
            <div className="tp-stat-icon-box tp-stat-icon-blue">
              <Icon name="child" size={24} />
            </div>
            <div>
              <div className="tp-stat-value">
                {kpis.total_active_children}{' '}
                <span className="fs-6 fw-semibold text-secondary">
                  ({kpis.active_children_percent ?? 100}% aktif)
                </span>
              </div>
              <div className="tp-stat-label">
                Balita Aktif (dari {kpis.total_registered_children ?? kpis.total_active_children} terdaftar)
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="tp-stat-card">
            <div className="tp-stat-icon-box tp-stat-icon-green">
              <Icon name="ruler" size={24} />
            </div>
            <div>
              <div className="tp-stat-value">
                {kpis.measured_complete_count}{' '}
                <span className="fs-6 fw-semibold text-secondary">({kpis.coverage_percent}%)</span>
              </div>
              <div className="tp-stat-label">Diukur Lengkap ({summary.period})</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="tp-stat-card">
            <div className="tp-stat-icon-box tp-stat-icon-amber">
              <Icon name="alert-circle" size={24} />
            </div>
            <div>
              <div className="tp-stat-value">
                {kpis.stunted_risk_count}{' '}
                <span className="fs-6 fw-semibold text-secondary">
                  ({kpis.stunting_prevalence_percent ?? 0}%)
                </span>
              </div>
              <div className="tp-stat-label">Pendek & Sangat Pendek</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="tp-stat-card">
            <div className="tp-stat-icon-box tp-stat-icon-red">
              <Icon name="check-shield" size={24} />
            </div>
            <div>
              <div className="tp-stat-value">
                {kpis.active_followups_count}{' '}
                <span className="fs-6 fw-normal text-secondary">
                  aktif / {kpis.closed_followups_count ?? 0} selesai
                </span>
              </div>
              <div className="tp-stat-label">
                Tindak Lanjut ({kpis.pending_reviews_count} perlu tinjauan)
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div className="tp-segmented-tabs" role="tablist" aria-label="Tampilan Dashboard">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'charts'}
            className={`tp-segmented-btn ${activeTab === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveTab('charts')}
          >
            <Icon name="chart" size={16} />
            <span>Distribusi & Cakupan</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'followup'}
            className={`tp-segmented-btn ${activeTab === 'followup' ? 'active' : ''}`}
            onClick={() => setActiveTab('followup')}
          >
            <Icon name="user-check" size={16} />
            <span>Tindak Lanjut & Tren Stunting</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'units'}
            className={`tp-segmented-btn ${activeTab === 'units' ? 'active' : ''}`}
            onClick={() => setActiveTab('units')}
          >
            <Icon name="building" size={16} />
            <span>Rekap Unit Posyandu</span>
          </button>
        </div>

        <Link to="/laporan" className="btn btn-sm btn-tp-soft">
          <Icon name="download" size={16} />
          <span>Ekspor Laporan CSV</span>
        </Link>
      </div>

      {activeTab === 'charts' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="tp-card h-100">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h3 className="h6 fw-bold mb-1">Status Pertumbuhan PB/U dan TB/U</h3>
                  <div className="small text-secondary">
                    Distribusi kategori Permenkes No. 2/2020 ({summary.period})
                  </div>
                </div>
              </div>

              <div
                style={{ height: '275px' }}
                className="d-flex align-items-center justify-content-center"
              >
                {isKader ? (
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }}
                  />
                ) : (
                  <Bar
                    data={stackedCategoryData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 2 } }
                      },
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="tp-card h-100">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h3 className="h6 fw-bold mb-1">Kelengkapan Pengukuran Bulanan</h3>
                  <div className="small text-secondary">
                    Perbandingan balita sudah diukur lengkap vs draf vs belum diukur
                  </div>
                </div>
                {!isDinas && (
                  <Link to="/monitoring" className="btn btn-sm btn-tp-soft">
                    <span>Monitoring</span>
                    <Icon name="arrow-right" size={15} />
                  </Link>
                )}
              </div>

              <div style={{ height: '275px' }}>
                <Bar
                  data={completenessData}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { stacked: true, beginAtZero: true },
                      y: { stacked: true }
                    },
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'followup' && (
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="tp-card h-100">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h3 className="h6 fw-bold mb-1">Progres Peninjauan & Tindak Lanjut Kasus</h3>
                  <div className="small text-secondary">
                    Beban kerja verifikasi Puskesmas dan penyelesaian tugas tindak lanjut
                  </div>
                </div>

                {!isDinas && (
                  <div className="d-flex flex-wrap gap-2">
                    <Link to="/peninjauan" className="btn btn-sm btn-tp-blue-soft">
                      <Icon name="check-shield" size={15} />
                      <span>Peninjauan</span>
                    </Link>
                    <Link to="/tindak-lanjut" className="btn btn-sm btn-tp-primary">
                      <Icon name="user-check" size={15} />
                      <span>Tindak Lanjut</span>
                    </Link>
                  </div>
                )}
              </div>

              <div style={{ height: '275px' }}>
                <Bar
                  data={reviewFollowupData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 2 } }
                    },
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="tp-card h-100">
              <div className="mb-3">
                <h3 className="h6 fw-bold mb-1">Tren Prevalensi Stunting per Periode (%)</h3>
                <div className="small text-secondary">
                  Persentase balita kategori pendek & sangat pendek terhadap balita diukur
                </div>
              </div>

              <div style={{ height: '275px' }}>
                <Line
                  data={stuntingTrendChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Prevalensi (%)' }
                      }
                    },
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'units' && (
        <div className="tp-card p-0 overflow-hidden">
          <div className="tp-card-header">
            <div>
              <h3 className="h6 fw-bold mb-1">Rekapitulasi Unit Posyandu ({summary.period})</h3>
              <div className="small text-secondary">
                {isDinas
                  ? 'Nilai 1-4 pada kategori sensitif disamarkan sebagai <5 untuk perlindungan privasi.'
                  : 'Ringkasan cakupan ukur dan status pertumbuhan per unit Posyandu.'}
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table tp-table">
              <thead>
                <tr>
                  <th>Unit Posyandu</th>
                  <th className="text-center">Balita Aktif</th>
                  <th style={{ minWidth: '190px' }}>Cakupan Ukur</th>
                  <th>Ringkasan Status Pertumbuhan</th>
                  <th className="text-center">Perlu Tinjauan</th>
                  <th className="text-center">Tindak Lanjut (Aktif / Selesai)</th>
                </tr>
              </thead>
              <tbody>
                {unitRows.map((row) => {
                  const totalActive = Number(row.total_anak_aktif) || 0;
                  const measured = Number(row.jumlah_diukur_lengkap) || 0;
                  const pct = totalActive > 0 ? Math.round((measured / totalActive) * 100) : 0;

                  return (
                    <tr key={row.kode_organisasi}>
                      <td>
                        <div className="fw-bold text-dark">{row.nama_organisasi}</div>
                        <div className="small text-secondary font-mono-num">
                          {row.kode_organisasi} &middot; {row.puskesmas_name}
                        </div>
                      </td>
                      <td className="text-center font-mono-num fw-bold">{row.total_anak_aktif}</td>
                      <td>
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="font-mono-num fw-semibold">
                            {row.jumlah_diukur_lengkap} / {row.total_anak_aktif} anak
                          </span>
                          <span className="font-mono-num text-secondary">{pct}%</span>
                        </div>
                        <div className="tp-progress" aria-label={`Cakupan ukur ${pct}%`}>
                          <div className="tp-progress-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <span className="tp-badge tp-badge-red font-mono-num" title="Sangat Pendek">
                            SP: {row.kategori_sangat_pendek}
                          </span>
                          <span className="tp-badge tp-badge-amber font-mono-num" title="Pendek">
                            P: {row.kategori_pendek}
                          </span>
                          <span className="tp-badge tp-badge-green font-mono-num" title="Normal">
                            N: {row.kategori_normal}
                          </span>
                          <span className="tp-badge tp-badge-blue font-mono-num" title="Tinggi">
                            T: {row.kategori_tinggi}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="tp-badge tp-badge-amber font-mono-num">
                          {row.perlu_peninjauan}
                        </span>
                      </td>
                      <td className="text-center font-mono-num">
                        <span className="tp-badge tp-badge-blue me-1">
                          Aktif: {row.tindak_lanjut_aktif}
                        </span>
                        <span className="tp-badge tp-badge-green">
                          Selesai: {row.tindak_lanjut_selesai}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
