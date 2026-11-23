export const CLINICAL_DISCLAIMER =
  'Hasil antropometri, bukan diagnosis. Interpretasi oleh tenaga kesehatan.';

export function formatRoleLabel(role) {
  switch (role) {
    case 'kader':
      return 'Kader Posyandu';
    case 'petugas_puskesmas':
      return 'Petugas Puskesmas';
    case 'dinas_kesehatan':
      return 'Dinas Kesehatan';
    case 'administrator':
      return 'Administrator';
    default:
      return role || '-';
  }
}

export function formatOrgTypeLabel(type) {
  switch (type) {
    case 'dinas_kesehatan':
      return 'Dinas Kesehatan';
    case 'puskesmas':
      return 'Puskesmas';
    case 'posyandu':
      return 'Posyandu';
    default:
      return type || '-';
  }
}

export function formatSessionStatusInfo(status) {
  switch (status) {
    case 'open':
      return { label: 'Terbuka', badgeClass: 'tp-badge-green' };
    case 'closed':
      return { label: 'Selesai', badgeClass: 'tp-badge-neutral' };
    case 'cancelled':
      return { label: 'Dibatalkan', badgeClass: 'tp-badge-red' };
    default:
      return { label: status || '-', badgeClass: 'tp-badge-neutral' };
  }
}

export function formatCategoryInfo(category) {
  switch (category) {
    case 'sangat_pendek':
      return { label: 'Sangat Pendek', shortLabel: 'SP', range: '<-3 SD', badgeClass: 'tp-badge-red' };
    case 'pendek':
      return { label: 'Pendek', shortLabel: 'P', range: '-3 s.d. <-2 SD', badgeClass: 'tp-badge-amber' };
    case 'normal':
      return { label: 'Normal', shortLabel: 'N', range: '-2 s.d. +3 SD', badgeClass: 'tp-badge-green' };
    case 'tinggi':
      return { label: 'Tinggi', shortLabel: 'T', range: '>+3 SD', badgeClass: 'tp-badge-blue' };
    default:
      return { label: 'Belum Diukur', shortLabel: '-', range: '', badgeClass: 'tp-badge-neutral' };
  }
}

export function formatReviewStatusInfo(status) {
  switch (status) {
    case 'pending':
      return { label: 'Perlu Tinjauan', badgeClass: 'tp-badge-amber' };
    case 'remeasure_requested':
    case 'flagged_for_remeasurement':
      return { label: 'Ukur Ulang', badgeClass: 'tp-badge-red' };
    case 'validated':
    case 'confirmed':
    case 'monitoring':
      return { label: 'Tervalidasi', badgeClass: 'tp-badge-green' };
    case 'not_flagged':
      return { label: 'Normal', badgeClass: 'tp-badge-neutral' };
    default:
      return { label: status || '-', badgeClass: 'tp-badge-neutral' };
  }
}

export function formatFollowUpStatusInfo(status, isOverdue = false) {
  if (isOverdue && status !== 'closed') {
    return { label: 'Terlambat', badgeClass: 'tp-badge-red' };
  }
  switch (status) {
    case 'open':
      return { label: 'Terbuka', badgeClass: 'tp-badge-amber' };
    case 'in_progress':
      return { label: 'Berjalan', badgeClass: 'tp-badge-blue' };
    case 'closed':
      return { label: 'Selesai', badgeClass: 'tp-badge-green' };
    default:
      return { label: status || '-', badgeClass: 'tp-badge-neutral' };
  }
}

export function formatFollowUpTypeLabel(type) {
  switch (type) {
    case 'clinical_review':
      return 'Konseling Gizi & Tinjauan Klinis';
    case 'remeasurement':
      return 'Pengukuran Ulang';
    case 'operational_measurement':
      return 'Kunjungan Rumah';
    case 'Konseling Gizi':
    case 'Pemberian PMT':
    case 'Rujukan Puskesmas':
    case 'Kunjungan Rumah':
      return type;
    default:
      return type || '-';
  }
}

export function formatPositionLabel(pos) {
  if (pos === 'recumbent') return 'Terlentang (PB)';
  if (pos === 'standing') return 'Berdiri (TB)';
  return pos || '-';
}

export function calculateZScorePercent(zScore) {
  const z = Number(zScore);
  if (!Number.isFinite(z)) return 50;
  const clamped = Math.max(-4, Math.min(4, z));
  return ((clamped + 4) / 8) * 100;
}

export function getInitials(name) {
  if (!name) return 'TP';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_TONES = [
  'tp-avatar-emerald',
  'tp-avatar-blue',
  'tp-avatar-amber',
  'tp-avatar-teal'
];

export function getAvatarToneClass(seedValue) {
  const str = String(seedValue || '');
  let sum = 0;
  for (let i = 0; i < str.length; i += 1) {
    sum += str.charCodeAt(i);
  }
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}
