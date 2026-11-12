export const CLINICAL_DISCLAIMER =
  'Hasil pencatatan administratif posyandu. Verifikasi data oleh petugas kesehatan.';

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
