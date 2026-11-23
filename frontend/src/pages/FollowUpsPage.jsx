import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';
import {
  formatFollowUpStatusInfo,
  formatFollowUpTypeLabel,
  formatCategoryInfo,
  getInitials,
  getAvatarToneClass
} from '../utils/formatters.js';

export function FollowUpsPage() {
  const { user } = useAuth();
  const isKader = user?.role === 'kader';

  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [childrenList, setChildrenList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState({
    child_id: '',
    intervention_category: isKader ? 'Kunjungan Rumah' : 'Konseling Gizi',
    description: '',
    assigned_to: '',
    due_date: '2026-11-28'
  });
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiRequest(`/follow-ups?status=${encodeURIComponent(statusFilter)}`);
      setTasks(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar tindak lanjut.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    Promise.all([apiRequest('/children?status=active'), apiRequest('/users')])
      .then(([cList, uList]) => {
        setChildrenList(cList || []);
        setUsersList(uList || []);
        if (cList?.length > 0) {
          setFormState((prev) => ({ ...prev, child_id: String(cList[0].id) }));
        }
        if (uList?.length > 0) {
          setFormState((prev) => ({ ...prev, assigned_to: String(uList[0].id) }));
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest('/follow-ups', {
        method: 'POST',
        body: {
          child_id: Number(formState.child_id),
          intervention_category: formState.intervention_category,
          description: formState.description,
          assigned_to: Number(formState.assigned_to),
          due_date: formState.due_date
        }
      });
      setShowCreateForm(false);
      setFormState((prev) => ({ ...prev, description: '' }));
      setFeedback({ type: 'success', text: 'Tugas tindak lanjut baru berhasil dibuat.' });
      await loadTasks();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {feedback && (
        <div className={`alert alert-${feedback.type} py-2 small mb-0 rounded-3`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2 className="h5 fw-bold text-dark mb-1">Tugas Tindak Lanjut</h2>
          <p className="small text-secondary mb-0">
            Pantau kunjungan rumah, pemberian PMT, konseling gizi, dan rujukan Puskesmas.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-tp-primary"
          onClick={() => setShowCreateForm(true)}
        >
          <Icon name="plus" size={17} />
          <span>Buat Tugas Baru</span>
        </button>
      </div>

      {showCreateForm && (
        <div
          className="tp-popup-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCreateForm(false)}
        >
          <div className="tp-form-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
              <div>
                <h3 className="h6 fw-bold mb-0">Buat Tugas Tindak Lanjut Baru</h3>
                <div className="small text-secondary">
                  Tugaskan intervensi gizi atau kunjungan rumah kepada petugas/kader.
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowCreateForm(false)}
                aria-label="Tutup form"
              />
            </div>

            <form onSubmit={handleCreateTask} className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Pilih Balita</label>
                <select
                  className="form-select"
                  value={formState.child_id}
                  onChange={(e) => setFormState({ ...formState, child_id: e.target.value })}
                  required
                >
                  {childrenList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.internal_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold">Kategori Intervensi</label>
                <select
                  className="form-select"
                  value={formState.intervention_category}
                  onChange={(e) =>
                    setFormState({ ...formState, intervention_category: e.target.value })
                  }
                  disabled={isKader}
                >
                  <option value="Kunjungan Rumah">Kunjungan Rumah</option>
                  {!isKader && (
                    <>
                      <option value="Konseling Gizi">Konseling Gizi</option>
                      <option value="Pemberian PMT">Pemberian PMT</option>
                      <option value="Rujukan Puskesmas">Rujukan Puskesmas</option>
                      <option value="Pengukuran Ulang">Pengukuran Ulang</option>
                    </>
                  )}
                </select>
              </div>

              <div className="col-md-7">
                <label className="form-label small fw-semibold">Penanggung Jawab</label>
                <select
                  className="form-select"
                  value={formState.assigned_to}
                  onChange={(e) => setFormState({ ...formState, assigned_to: e.target.value })}
                  required
                >
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.organization_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-5">
                <label className="form-label small fw-semibold">Batas Waktu</label>
                <input
                  type="date"
                  className="form-control font-mono-num"
                  value={formState.due_date}
                  onChange={(e) => setFormState({ ...formState, due_date: e.target.value })}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label small fw-semibold">Rencana Intervensi</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Pendampingan pemberian makanan tambahan dan edukasi gizi keluarga."
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  minLength={5}
                  required
                  autoFocus
                />
              </div>

              <div className="col-12 d-flex justify-content-end gap-2 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-tp-primary" disabled={submitting}>
                  <Icon name="user-check" size={16} />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Tugas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {errorMsg && <div className="alert alert-danger py-2 small rounded-3">{errorMsg}</div>}

      <div className="tp-filter-bar">
        <div className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="tp-input-icon-group">
              <span className="tp-input-icon-left">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="form-control form-control-sm tp-input-with-icon"
                style={{ minHeight: '38px' }}
                placeholder="Cari nama balita, kode internal, Posyandu, atau penanggung jawab..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari tugas tindak lanjut"
              />
            </div>
          </div>

          <div className="col-md-3">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter Status Tindak Lanjut"
            >
              <option value="all">Semua Status Tugas</option>
              <option value="open">Status: Terbuka</option>
              <option value="in_progress">Status: Sedang Berjalan</option>
              <option value="closed">Status: Selesai</option>
            </select>
          </div>

          <div className="col-md-4">
            <select
              className="form-select form-select-sm rounded-3"
              style={{ minHeight: '38px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Urutkan Tugas Tindak Lanjut"
            >
              <option value="newest">Urutkan: Terbaru Dibuat</option>
              <option value="az">Urutkan: Abjad Nama Balita (A - Z)</option>
              <option value="za">Urutkan: Abjad Nama Balita (Z - A)</option>
              <option value="due_asc">Urutkan: Tenggat Terdekat</option>
              <option value="oldest">Urutkan: Terlama Dibuat</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tp-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5 small text-secondary">
            Memuat daftar tugas tindak lanjut...
          </div>
        ) : (() => {
            const filteredTasks = [...tasks]
              .filter((t) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  (t.child_name || '').toLowerCase().includes(q) ||
                  (t.internal_code || '').toLowerCase().includes(q) ||
                  (t.posyandu_name || '').toLowerCase().includes(q) ||
                  (t.description || '').toLowerCase().includes(q) ||
                  (t.assigned_to_name || '').toLowerCase().includes(q)
                );
              })
              .sort((a, b) => {
                if (sortBy === 'az') return (a.child_name || '').localeCompare(b.child_name || '', 'id');
                if (sortBy === 'za') return (b.child_name || '').localeCompare(a.child_name || '', 'id');
                if (sortBy === 'oldest') return Number(a.id) - Number(b.id);
                if (sortBy === 'due_asc') return (a.due_date || '').localeCompare(b.due_date || '');
                return Number(b.id) - Number(a.id);
              });

            if (filteredTasks.length === 0) {
              return (
                <div className="text-center py-5 small text-secondary">
                  Tidak ada tugas tindak lanjut yang sesuai dengan pencarian/filter.
                </div>
              );
            }

            return (
              <div className="table-responsive">
                <table className="table tp-table">
                  <thead>
                    <tr>
                      <th>Balita & Posyandu</th>
                      <th>Kategori & Deskripsi Intervensi</th>
                      <th>Indikator Pemicu</th>
                      <th>Penanggung Jawab</th>
                      <th>Tenggat & Status</th>
                      <th className="text-end">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((t) => {
                  const stInfo = formatFollowUpStatusInfo(t.status, t.is_overdue);
                  const catInfo = formatCategoryInfo(t.category);
                  const avatarTone = getAvatarToneClass(t.internal_code || t.child_name);

                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <span className={`tp-avatar ${avatarTone}`}>
                            {getInitials(t.child_name)}
                          </span>
                          <div>
                            <div className="fw-bold text-dark">{t.child_name}</div>
                            <div className="small text-secondary font-mono-num">
                              #{t.id} &middot; {t.internal_code} &middot; {t.posyandu_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        <div className="small fw-bold text-dark">
                          {t.intervention_category || formatFollowUpTypeLabel(t.type)}
                        </div>
                        <div className="small text-secondary">{t.description}</div>
                      </td>
                      <td>
                        {t.z_score !== null ? (
                          <div className="d-flex flex-column align-items-start gap-1">
                            <span className="font-mono-num small fw-bold">{t.z_score} SD</span>
                            <span className={`tp-badge ${catInfo.badgeClass}`}>
                              {catInfo.label}
                            </span>
                          </div>
                        ) : (
                          <span className="tp-badge tp-badge-neutral">Operasional</span>
                        )}
                      </td>
                      <td className="small">
                        <div className="fw-semibold text-dark">{t.assigned_to_name}</div>
                        <div className="text-secondary">Log: {t.update_count} aktivitas</div>
                      </td>
                      <td>
                        <div className="font-mono-num small fw-semibold mb-1">{t.due_date}</div>
                        <span className={`tp-badge ${stInfo.badgeClass}`}>{stInfo.label}</span>
                      </td>
                      <td className="text-end">
                        <Link to={`/tindak-lanjut/${t.id}`} className="btn btn-sm btn-tp-soft">
                          <span>Detail & Progres</span>
                          <Icon name="arrow-right" size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
