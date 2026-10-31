// Angka berikut 100% SIMULASI untuk demonstrasi UI. Tidak berasal dari pasien atau Posyandu nyata.
// Modul ini TIDAK BOLEH digunakan sebagai dasar keputusan klinis.
export const demoOverview = Object.freeze({
  demo: true,
  source: 'synthetic-fixture',
  title: 'TumbuhPantau — Tampilan Prototipe',
  metrics: [
    { key: 'children', label: 'Anak terdaftar', value: 128, helper: 'data sintetis' },
    { key: 'sessions', label: 'Sesi Posyandu', value: 8, helper: 'data sintetis' },
    { key: 'measurements', label: 'Pengukuran tercatat', value: 94, helper: 'data sintetis' },
    { key: 'reviews', label: 'Menunggu peninjauan', value: 5, helper: 'data sintetis' }
  ],
  modules: [
    { id: 'PBI-01', label: 'Organisasi & Akun', status: 'planned', description: 'Role dan cakupan wilayah' },
    { id: 'PBI-02', label: 'Data Anak & Wali', status: 'planned', description: 'Registrasi dan histori identitas' },
    { id: 'PBI-03', label: 'Sesi & Kehadiran', status: 'planned', description: 'Daftar kehadiran kegiatan' },
    { id: 'PBI-04', label: 'Pencatatan Pengukuran', status: 'planned', description: 'Draf, kirim, validasi input' },
    { id: 'PBI-05', label: 'Antropometri PB/U–TB/U', status: 'planned', description: 'Menunggu validasi referensi WHO' },
    { id: 'PBI-06', label: 'Histori Pertumbuhan', status: 'planned', description: 'Tabel dan grafik riwayat' },
    { id: 'PBI-08', label: 'Peninjauan Hasil', status: 'planned', description: 'Keputusan oleh petugas berwenang' },
    { id: 'PBI-10', label: 'Tindak Lanjut', status: 'planned', description: 'Tugas, perkembangan, evaluasi' }
  ],
  steps: [
    'Pendaftaran anak', 'Sesi Posyandu', 'Pengukuran', 'Peninjauan', 'Tindak lanjut'
  ]
});

export function safeDemoOverview() {
  // Menghasilkan objek baru untuk mencegah perubahan global oleh handler lain.
  return structuredClone(demoOverview);
}
