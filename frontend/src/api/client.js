let csrfTokenInMemory = '';

export function setCsrfToken(token) {
  if (token) {
    csrfTokenInMemory = token;
  }
}

export function getCsrfToken() {
  return csrfTokenInMemory;
}

export function showPopup({ type = 'success', title, message, nextAction = null }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tp:popup-feedback', {
        detail: {
          id: Date.now(),
          type,
          title,
          message,
          nextAction
        }
      })
    );
  }
}

function formatReadableCategory(cat) {
  if (cat === 'sangat_pendek') return 'Sangat Pendek';
  if (cat === 'pendek') return 'Pendek';
  if (cat === 'normal') return 'Normal';
  if (cat === 'tinggi') return 'Tinggi';
  return cat || 'Terhitung';
}

function buildAutoPopupForMutation(path, method, data) {
  const cleanPath = path.split('?')[0];

  if (
    cleanPath === '/auth/login' ||
    cleanPath === '/auth/logout' ||
    cleanPath === '/measurements/preview'
  ) {
    return null;
  }

  if (method === 'POST' && cleanPath === '/children') {
    return {
      type: 'success',
      title: 'Data Balita Berhasil Disimpan',
      message: `Balita ${data?.name || 'baru'} (${data?.internal_code || 'Kode Otomatis'}) telah terdaftar di Posyandu.`,
      nextAction: { label: 'Lanjut ke Sesi & Kehadiran', to: '/sesi' }
    };
  }

  if (method === 'PATCH' && /^\/children\/\d+\/activate$/.test(cleanPath)) {
    return {
      type: 'success',
      title: 'Profil Balita Diaktifkan Kembali',
      message: 'Status balita kini Aktif dan dapat mengikuti sesi penimbangan Posyandu.'
    };
  }

  if (method === 'PATCH' && /^\/children\/\d+\/deactivate$/.test(cleanPath)) {
    return {
      type: 'info',
      title: 'Profil Balita Dinonaktifkan',
      message: 'Status balita diubah menjadi Nonaktif. Seluruh riwayat pengukuran tetap tersimpan aman.'
    };
  }

  if (method === 'PATCH' && /^\/children\/\d+\/guardian$/.test(cleanPath)) {
    return {
      type: 'success',
      title: 'Relasi Orang Tua / Wali Diperbarui',
      message: 'Perubahan keterkaitan wali pengasuh balita berhasil disimpan.'
    };
  }

  if (method === 'PATCH' && /^\/children\/\d+$/.test(cleanPath)) {
    return {
      type: 'success',
      title: 'Perubahan Identitas Tersimpan',
      message: `Data profil balita ${data?.name || ''} berhasil diperbarui.`
    };
  }

  if (method === 'POST' && cleanPath === '/guardians') {
    return {
      type: 'success',
      title: 'Data Orang Tua / Wali Tersimpan',
      message: `Profil wali ${data?.name || 'baru'} berhasil ditambahkan.`
    };
  }

  if (method === 'PUT' && /^\/guardians\/\d+$/.test(cleanPath)) {
    return {
      type: 'success',
      title: 'Perubahan Kontak Wali Tersimpan',
      message: 'Informasi kontak dan alamat orang tua/wali berhasil diperbarui.'
    };
  }

  if (method === 'POST' && cleanPath === '/sessions') {
    return {
      type: 'success',
      title: 'Sesi Posyandu Berhasil Dibuka',
      message: 'Langkah selanjutnya: tandai kehadiran balita ("Hadir"), lalu klik tombol "Input Ukur".'
    };
  }

  if (method === 'PUT' && /^\/sessions\/\d+$/.test(cleanPath)) {
    return {
      type: 'success',
      title: 'Jadwal Sesi Diperbarui',
      message: 'Perubahan tanggal dan catatan agenda sesi Posyandu berhasil disimpan.'
    };
  }

  if (method === 'POST' && /^\/sessions\/\d+\/close$/.test(cleanPath)) {
    return {
      type: 'success',
      title: 'Sesi Posyandu Selesai & Ditutup',
      message: 'Sesi pelayanan telah ditutup dan data kehadiran dikunci.'
    };
  }

  if (method === 'PATCH' && /^\/sessions\/\d+\/cancel$/.test(cleanPath)) {
    return {
      type: 'info',
      title: 'Sesi Posyandu Dibatalkan',
      message: 'Status sesi telah diubah menjadi Dibatalkan beserta alasan pembatalannya.'
    };
  }

  if (
    (method === 'POST' && /^\/sessions\/\d+\/attendances$/.test(cleanPath)) ||
    (method === 'PATCH' && /^\/sessions\/\d+\/attendances\/\d+$/.test(cleanPath))
  ) {
    return {
      type: 'success',
      title: 'Kehadiran Balita Tersimpan',
      message: 'Status kehadiran telah diperbarui. Untuk balita yang Hadir, klik tombol hijau "Input Ukur".'
    };
  }

  if (
    method === 'POST' &&
    (cleanPath === '/measurements/draft' || /^\/attendances\/\d+\/measurements\/drafts$/.test(cleanPath))
  ) {
    return {
      type: 'info',
      title: 'Draf Pengukuran Tersimpan',
      message: 'Data disimpan sementara sebagai draf. Klik "Kirim Pengukuran" untuk menghitung Z-Score resmi.'
    };
  }

  if (
    method === 'DELETE' &&
    (/^\/measurements\/drafts\/\d+$/.test(cleanPath) || /^\/measurements\/\d+\/draft$/.test(cleanPath))
  ) {
    return {
      type: 'info',
      title: 'Draf Pengukuran Dihapus',
      message: 'Draf pengukuran sementara telah dibatalkan dan dihapus.'
    };
  }

  if (
    method === 'POST' &&
    (cleanPath === '/measurements/submit' || /^\/attendances\/\d+\/measurements\/submit$/.test(cleanPath))
  ) {
    const zScore = data?.assessment?.z_score ?? '-';
    const catLabel = formatReadableCategory(data?.assessment?.category);
    const needsReview = data?.assessment?.review_status === 'pending';
    return {
      type: 'success',
      title: 'Pengukuran Berhasil Dikirim!',
      message: `Hasil Z-Score WHO: ${zScore} SD (Kategori: ${catLabel}).${
        needsReview
          ? ' Kasus ini otomatis diteruskan ke Antrean Peninjauan Petugas Puskesmas.'
          : ' Pertumbuhan balita berada pada rentang normal.'
      }`,
      nextAction: data?.measurement?.id
        ? { label: 'Lihat Detail & Riwayat Versi', to: `/pengukuran/detail/${data.measurement.id}` }
        : null
    };
  }

  if (
    method === 'POST' &&
    (/^\/measurements\/\d+\/revisions$/.test(cleanPath) || /^\/measurements\/\d+\/revise$/.test(cleanPath))
  ) {
    const revNo = data?.measurement?.revision_no ?? '';
    const zScore = data?.assessment?.z_score ?? '-';
    const catLabel = formatReadableCategory(data?.assessment?.category);
    return {
      type: 'success',
      title: `Revisi Pengukuran #${revNo} Tersimpan!`,
      message: `Data lama disimpan sebagai histori dan digantikan dengan Z-Score baru: ${zScore} SD (${catLabel}).`
    };
  }

  if (
    (method === 'PATCH' && /^\/growth-assessments\/\d+\/review$/.test(cleanPath)) ||
    (method === 'POST' && /^\/reviews\/\d+(\/decision)?$/.test(cleanPath))
  ) {
    return {
      type: 'success',
      title: 'Keputusan Peninjauan Tersimpan!',
      message: data?.follow_up_id
        ? `Verifikasi disimpan dan Tugas Tindak Lanjut #${data.follow_up_id} otomatis dibuat untuk Kader Posyandu.`
        : 'Keputusan verifikasi hasil antropometri telah berhasil disimpan.',
      nextAction: data?.follow_up_id
        ? { label: 'Lihat Tugas Tindak Lanjut', to: `/tindak-lanjut/${data.follow_up_id}` }
        : null
    };
  }

  if (method === 'POST' && cleanPath === '/follow-ups') {
    return {
      type: 'success',
      title: 'Tugas Tindak Lanjut Dibuat!',
      message: 'Tugas intervensi gizi baru telah disimpan dan diteruskan ke petugas penanggung jawab.'
    };
  }

  if (method === 'POST' && /^\/follow-ups\/\d+\/updates$/.test(cleanPath)) {
    return {
      type: 'success',
      title: 'Catatan Progres Tersimpan!',
      message: 'Perkembangan kunjungan lapangan berhasil ditambahkan dan status tugas kini Sedang Berjalan.'
    };
  }

  if (
    (method === 'PATCH' || method === 'POST') &&
    /^\/follow-ups\/\d+\/close$/.test(cleanPath)
  ) {
    return {
      type: 'success',
      title: 'Tugas Tindak Lanjut Resmi Ditutup!',
      message: 'Kesimpulan evaluasi akhir telah disimpan dan status tugas ditandai Selesai.'
    };
  }

  if (cleanPath.startsWith('/organizations')) {
    return {
      type: 'success',
      title: 'Data Unit Organisasi Tersimpan',
      message: 'Perubahan data unit organisasi berhasil disimpan ke sistem.'
    };
  }

  if (cleanPath.startsWith('/users')) {
    return {
      type: 'success',
      title: 'Data Akun Pengguna Tersimpan',
      message: 'Perubahan informasi akun pengguna berhasil disimpan.'
    };
  }

  return {
    type: 'success',
    title: 'Perubahan Berhasil Disimpan',
    message: 'Data Anda telah berhasil diproses dan disimpan ke database.'
  };
}

export async function apiRequest(
  path,
  { method = 'GET', body = undefined, headers = {}, silentPopup = false } = {}
) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tp:network-activity', { detail: { active: true } }));
  }

  const reqHeaders = {
    Accept: 'application/json',
    ...headers
  };

  const upperMethod = method.toUpperCase();
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(upperMethod);

  if (isMutation && csrfTokenInMemory) {
    reqHeaders['X-CSRF-Token'] = csrfTokenInMemory;
  }

  if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: upperMethod,
      credentials: 'include',
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } finally {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tp:network-activity', { detail: { active: false } }));
    }
  }

  const headerCsrf = response.headers.get('x-csrf-token');
  if (headerCsrf) {
    csrfTokenInMemory = headerCsrf;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`Permintaan gagal (${response.status})`);
    }
    return response;
  }

  const payload = await response.json();
  if (payload?.data?.csrfToken) {
    csrfTokenInMemory = payload.data.csrfToken;
  }

  if (!response.ok || payload?.success === false) {
    const err = new Error(payload?.error?.message || 'Terjadi kesalahan saat memproses permintaan.');
    err.status = response.status;
    err.code = payload?.error?.code || 'ERROR';
    err.fieldErrors = payload?.error?.fieldErrors || null;

    const cleanPath = path.split('?')[0];
    if (
      isMutation &&
      !silentPopup &&
      cleanPath !== '/auth/login' &&
      cleanPath !== '/measurements/preview' &&
      err.code !== 'DUPLICATE_CHILD_WARNING'
    ) {
      showPopup({
        type: 'danger',
        title: 'Gagal Menyimpan Data',
        message: err.message
      });
    }

    throw err;
  }

  if (isMutation && !silentPopup) {
    const popupConfig = buildAutoPopupForMutation(path, upperMethod, payload.data);
    if (popupConfig) {
      showPopup(popupConfig);
    }
  }

  return payload.data;
}
