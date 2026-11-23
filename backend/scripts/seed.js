import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool, withTransaction, closePool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { runMigrations } from './migrate.js';
import { evaluateGrowth, getLmsForAge, getRecommendedPosition } from '../src/services/growthCalculator.js';
import { getActiveReferenceVersionId, resetReferenceVersionCache } from '../src/services/referenceService.js';
import { recordAuditLog } from '../src/services/auditService.js';

const CHILD_PROFILES_PER_POSYANDU = [
  { nameSuffix: 'Arka Pratama', guardian: 'Ibu Wulandari', sex: 'L', birthDate: '2025-11-15', targetZ: -0.35, state: 'submitted' },
  { nameSuffix: 'Nadhira Putri', guardian: 'Ibu Kartini', sex: 'P', birthDate: '2025-08-20', targetZ: -2.45, state: 'submitted_revised' },
  { nameSuffix: 'Rafka Aditya', guardian: 'Ibu Sri Wahyuni', sex: 'L', birthDate: '2025-05-10', targetZ: -3.35, state: 'submitted_followup' },
  { nameSuffix: 'Aisyah Zahra', guardian: 'Ibu Fitriani', sex: 'P', birthDate: '2025-02-14', targetZ: 0.45, state: 'submitted' },
  { nameSuffix: 'Bima Sakti', guardian: 'Ibu Kusuma', sex: 'L', birthDate: '2024-11-05', targetZ: -1.10, state: 'submitted' },
  { nameSuffix: 'Kirana Larasati', guardian: 'Ibu Megawati', sex: 'P', birthDate: '2024-07-18', targetZ: -2.65, state: 'submitted_remeasure' },
  { nameSuffix: 'Daffa Ramadhan', guardian: 'Ibu Nurhayati', sex: 'L', birthDate: '2024-03-22', targetZ: 0.20, state: 'submitted' },
  { nameSuffix: 'Salsabila Azzahra', guardian: 'Ibu Handayani', sex: 'P', birthDate: '2023-12-09', targetZ: -0.80, state: 'submitted' },
  { nameSuffix: 'Gilang Saputra', guardian: 'Ibu Puspitasari', sex: 'L', birthDate: '2023-08-30', targetZ: 3.35, state: 'submitted' },
  { nameSuffix: 'Tiara Maharani', guardian: 'Ibu Permata', sex: 'P', birthDate: '2023-04-12', targetZ: -3.20, state: 'submitted_validated' },
  { nameSuffix: 'Fajar Nugroho', guardian: 'Ibu Rahayu', sex: 'L', birthDate: '2022-12-19', targetZ: 0.10, state: 'submitted' },
  { nameSuffix: 'Alya Nabila', guardian: 'Ibu Anggraini', sex: 'P', birthDate: '2022-08-25', targetZ: -2.25, state: 'submitted' },
  { nameSuffix: 'Reza Mahendra', guardian: 'Ibu Oktaviani', sex: 'L', birthDate: '2024-09-14', targetZ: -0.50, state: 'draft_only' },
  { nameSuffix: 'Citra Lestari', guardian: 'Ibu Damayanti', sex: 'P', birthDate: '2023-10-03', targetZ: 0.00, state: 'unmeasured_present' },
  { nameSuffix: 'Bagas Kurniawan', guardian: 'Ibu Setyowati', sex: 'L', birthDate: '2023-01-17', targetZ: -0.40, state: 'absent' }
];

function computeHeightFromZ(sex, birthDate, sessionDate, targetZ) {
  const bMs = Date.UTC(
    Number(birthDate.slice(0, 4)),
    Number(birthDate.slice(5, 7)) - 1,
    Number(birthDate.slice(8, 10))
  );
  const sMs = Date.UTC(
    Number(sessionDate.slice(0, 4)),
    Number(sessionDate.slice(5, 7)) - 1,
    Number(sessionDate.slice(8, 10))
  );
  const ageDays = Math.max(0, Math.min(1826, Math.round((sMs - bMs) / 86400000)));
  const { L, M, S } = getLmsForAge(sex, ageDays);
  const heightCm = Number((M * Math.pow(1 + L * S * targetZ, 1 / L)).toFixed(1));
  const position = getRecommendedPosition(ageDays);
  const weightKg = Number(Math.max(3.2, (heightCm * 0.165 - 4.2 + targetZ * 0.35)).toFixed(2));
  return { ageDays, heightCm, weightKg, position };
}

export async function seedDatabase(targetDbName = env.db.name) {
  await runMigrations(targetDbName);
  resetReferenceVersionCache();

  const passwordHash = await bcrypt.hash(env.seed.defaultPassword, 12);

  await withTransaction(async (conn) => {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'audit_logs',
      'follow_up_updates',
      'follow_ups',
      'growth_assessments',
      'reference_versions',
      'measurements',
      'attendances',
      'posyandu_sessions',
      'children',
      'guardians',
      'users',
      'organizations'
    ];
    for (const t of tables) {
      await conn.query(`TRUNCATE TABLE \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const refVersionId = await getActiveReferenceVersionId(conn);

    const [dinasRes] = await conn.query(
      `INSERT INTO organizations (parent_id, type, code, name, is_active)
       VALUES (NULL, 'dinas_kesehatan', 'DINKES-KOTA', 'Dinas Kesehatan Kota Harapan', 1)`
    );
    const dinasId = Number(dinasRes.insertId);

    const [pkmMltRes] = await conn.query(
      `INSERT INTO organizations (parent_id, type, code, name, is_active)
       VALUES (?, 'puskesmas', 'PKM-MLT', 'Puskesmas Kecamatan Melati', 1)`,
      [dinasId]
    );
    const pkmMelatiId = Number(pkmMltRes.insertId);

    const [pkmKngRes] = await conn.query(
      `INSERT INTO organizations (parent_id, type, code, name, is_active)
       VALUES (?, 'puskesmas', 'PKM-KNG', 'Puskesmas Kecamatan Kenanga', 1)`,
      [dinasId]
    );
    const pkmKenangaId = Number(pkmKngRes.insertId);

    const posyanduDefs = [
      { parentId: pkmMelatiId, code: 'POS-MLT-01', name: 'Posyandu Melati 01', prefix: 'Melati A' },
      { parentId: pkmMelatiId, code: 'POS-MLT-03', name: 'Posyandu Melati 03', prefix: 'Melati B' },
      { parentId: pkmKenangaId, code: 'POS-KNG-01', name: 'Posyandu Kenanga 01', prefix: 'Kenanga A' },
      { parentId: pkmKenangaId, code: 'POS-KNG-02', name: 'Posyandu Kenanga 02', prefix: 'Kenanga B' }
    ];

    const posyandus = [];
    for (const p of posyanduDefs) {
      const [res] = await conn.query(
        `INSERT INTO organizations (parent_id, type, code, name, is_active)
         VALUES (?, 'posyandu', ?, ?, 1)`,
        [p.parentId, p.code, p.name]
      );
      posyandus.push({ ...p, id: Number(res.insertId) });
    }

    const userDefs = [
      { orgId: dinasId, username: 'admin', name: 'Administrator Sistem', role: 'administrator' },
      { orgId: dinasId, username: 'dinas', name: 'dr. Ratna Kartika, M.Kes', role: 'dinas_kesehatan' },
      { orgId: pkmMelatiId, username: 'petugas.melati', name: 'Bidan Siti Rahmawati, A.Md.Keb', role: 'petugas_puskesmas' },
      { orgId: pkmKenangaId, username: 'petugas.kenanga', name: 'Ners Hendra Wijaya, S.Kep', role: 'petugas_puskesmas' },
      { orgId: posyandus[0].id, username: 'kader.mlt01', name: 'Ibu Rina Susanti', role: 'kader' },
      { orgId: posyandus[1].id, username: 'kader.mlt03', name: 'Ibu Dewi Lestari', role: 'kader' },
      { orgId: posyandus[2].id, username: 'kader.kng01', name: 'Ibu Yuni Astuti', role: 'kader' },
      { orgId: posyandus[3].id, username: 'kader.kng02', name: 'Ibu Nurul Hidayah', role: 'kader' }
    ];

    const usersByUsername = {};
    for (const u of userDefs) {
      const [uRes] = await conn.query(
        `INSERT INTO users (organization_id, name, username, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [u.orgId, u.name, u.username, passwordHash, u.role]
      );
      usersByUsername[u.username] = { ...u, id: Number(uRes.insertId) };
    }

    const sessionMonths = [
      { date: '2026-09-10', status: 'closed', notes: 'Sesi penimbangan rutin September' },
      { date: '2026-10-10', status: 'closed', notes: 'Sesi penimbangan rutin Oktober' },
      { date: '2026-11-10', status: 'open', notes: 'Sesi penimbangan berjalan November' }
    ];

    const kaderUsernames = ['kader.mlt01', 'kader.mlt03', 'kader.kng01', 'kader.kng02'];
    const petugasUsernames = ['petugas.melati', 'petugas.melati', 'petugas.kenanga', 'petugas.kenanga'];

    for (let pIdx = 0; pIdx < posyandus.length; pIdx++) {
      const posyandu = posyandus[pIdx];
      const kader = usersByUsername[kaderUsernames[pIdx]];
      const petugas = usersByUsername[petugasUsernames[pIdx]];

      const sessions = [];
      for (const sm of sessionMonths) {
        const [sRes] = await conn.query(
          `INSERT INTO posyandu_sessions (organization_id, session_date, status, notes, created_by, closed_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            posyandu.id,
            sm.date,
            sm.status,
            sm.notes,
            kader.id,
            sm.status === 'closed' ? `${sm.date} 15:00:00` : null
          ]
        );
        sessions.push({ id: Number(sRes.insertId), date: sm.date, status: sm.status });
      }

      for (let cIdx = 0; cIdx < CHILD_PROFILES_PER_POSYANDU.length; cIdx++) {
        const prof = CHILD_PROFILES_PER_POSYANDU[cIdx];
        const seqStr = String(cIdx + 1).padStart(4, '0');
        const internalCode = `${posyandu.code}-${seqStr}`;
        const childFullName = `${prof.nameSuffix} (${posyandu.code.slice(-5)})`;
        const phoneStr = `0812-000${pIdx + 1}-${String(cIdx + 10).padStart(4, '0')}`;
        const addressStr = `Jl. Mawar No. ${cIdx + 1}, RT 0${(cIdx % 5) + 1}/RW 02`;

        const [gRes] = await conn.query(
          `INSERT INTO guardians (organization_id, name, phone, address, is_active)
           VALUES (?, ?, ?, ?, 1)`,
          [posyandu.id, prof.guardian, phoneStr, addressStr]
        );
        const guardianId = Number(gRes.insertId);

        const [cRes] = await conn.query(
          `INSERT INTO children
            (organization_id, guardian_id, guardian_relationship, internal_code, name, birth_date, sex, registered_on)
           VALUES (?, ?, 'Ibu', ?, ?, ?, ?, '2026-01-10')`,
          [posyandu.id, guardianId, internalCode, childFullName, prof.birthDate, prof.sex]
        );
        const childId = Number(cRes.insertId);

        for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
          const sess = sessions[sIdx];
          const isCurrentMonth = sIdx === sessions.length - 1;

          const attStatus = isCurrentMonth && prof.state === 'absent' ? 'absent' : 'present';
          const [attRes] = await conn.query(
            `INSERT INTO attendances (session_id, child_id, status, recorded_by, recorded_at)
             VALUES (?, ?, ?, ?, ?)`,
            [sess.id, childId, attStatus, kader.id, `${sess.date} 08:30:00`]
          );
          const attendanceId = Number(attRes.insertId);

          if (attStatus === 'absent') {
            continue;
          }

          if (isCurrentMonth && prof.state === 'unmeasured_present') {
            continue;
          }

          const zShift = (sIdx - 2) * 0.08;
          const { heightCm, weightKg, position } = computeHeightFromZ(
            prof.sex,
            prof.birthDate,
            sess.date,
            prof.targetZ + zShift
          );

          if (isCurrentMonth && prof.state === 'draft_only') {
            await conn.query(
              `INSERT INTO measurements
                (attendance_id, revision_no, measured_at, weight_kg, length_height_cm, position, status, created_by, request_token)
               VALUES (?, 1, ?, ?, NULL, ?, 'draft', ?, ?)`,
              [attendanceId, `${sess.date} 09:15:00`, weightKg, position, kader.id, randomUUID()]
            );
            continue;
          }

          if (isCurrentMonth && prof.state === 'submitted_revised') {
            const wrongHeight = Number((heightCm - 3.5).toFixed(1));
            const wrongCalc = evaluateGrowth({
              birthDate: prof.birthDate,
              measuredAt: `${sess.date} 09:00:00`,
              sex: prof.sex,
              lengthHeightCm: wrongHeight,
              position
            });

            const [oldMRes] = await conn.query(
              `INSERT INTO measurements
                (attendance_id, revision_no, measured_at, weight_kg, length_height_cm, position, status, created_by, request_token)
               VALUES (?, 1, ?, ?, ?, ?, 'voided', ?, ?)`,
              [
                attendanceId,
                `${sess.date} 09:00:00`,
                weightKg,
                wrongHeight,
                position,
                kader.id,
                randomUUID()
              ]
            );
            const oldMeasurementId = Number(oldMRes.insertId);

            await conn.query(
              `INSERT INTO growth_assessments
                (measurement_id, reference_version_id, birth_date_used, sex_used, age_days,
                 adjustment_cm, adjusted_length_height_cm, z_score, category,
                 quality_status, review_reason, review_status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                oldMeasurementId,
                refVersionId,
                prof.birthDate,
                prof.sex,
                wrongCalc.ageDays,
                wrongCalc.adjustmentCm,
                wrongCalc.adjustedLengthHeightCm,
                wrongCalc.zScore,
                wrongCalc.category,
                wrongCalc.qualityStatus,
                wrongCalc.reviewReason,
                wrongCalc.reviewStatus
              ]
            );

            const revCalc = evaluateGrowth({
              birthDate: prof.birthDate,
              measuredAt: `${sess.date} 09:30:00`,
              sex: prof.sex,
              lengthHeightCm: heightCm,
              position
            });

            const [newMRes] = await conn.query(
              `INSERT INTO measurements
                (attendance_id, revision_no, supersedes_id, measured_at, weight_kg, length_height_cm,
                 position, status, correction_reason, created_by, request_token)
               VALUES (?, 2, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
              [
                attendanceId,
                oldMeasurementId,
                `${sess.date} 09:30:00`,
                weightKg,
                heightCm,
                position,
                'Koreksi hasil bacaan papan ukur panjang badan setelah pengukuran ulang bersama bidan.',
                kader.id,
                randomUUID()
              ]
            );
            const newMId = Number(newMRes.insertId);

            await conn.query(
              `INSERT INTO growth_assessments
                (measurement_id, reference_version_id, birth_date_used, sex_used, age_days,
                 adjustment_cm, adjusted_length_height_cm, z_score, category,
                 quality_status, review_reason, review_status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                newMId,
                refVersionId,
                prof.birthDate,
                prof.sex,
                revCalc.ageDays,
                revCalc.adjustmentCm,
                revCalc.adjustedLengthHeightCm,
                revCalc.zScore,
                revCalc.category,
                revCalc.qualityStatus,
                revCalc.reviewReason,
                revCalc.reviewStatus
              ]
            );
            continue;
          }

          const calc = evaluateGrowth({
            birthDate: prof.birthDate,
            measuredAt: `${sess.date} 09:10:00`,
            sex: prof.sex,
            lengthHeightCm: heightCm,
            position
          });

          const [mRes] = await conn.query(
            `INSERT INTO measurements
              (attendance_id, revision_no, measured_at, weight_kg, length_height_cm, position, status, created_by, request_token)
             VALUES (?, 1, ?, ?, ?, ?, 'submitted', ?, ?)`,
            [attendanceId, `${sess.date} 09:10:00`, weightKg, heightCm, position, kader.id, randomUUID()]
          );
          const measurementId = Number(mRes.insertId);

          let reviewStatus = calc.reviewStatus;
          let reviewedBy = null;
          let reviewedAt = null;
          let reviewNote = null;

          if (!isCurrentMonth && reviewStatus === 'pending') {
            reviewStatus = 'validated';
            reviewedBy = petugas.id;
            reviewedAt = `${sess.date} 14:00:00`;
            reviewNote = 'Data ukuran terverifikasi sesuai buku KIA.';
          } else if (isCurrentMonth && prof.state === 'submitted_remeasure') {
            reviewStatus = 'remeasure_requested';
            reviewedBy = petugas.id;
            reviewedAt = `${sess.date} 13:15:00`;
            reviewNote = 'Mohon pastikan tumit balita menempel rapat pada papan ukur saat berdiri.';
          } else if (
            isCurrentMonth &&
            (prof.state === 'submitted_followup' || prof.state === 'submitted_validated')
          ) {
            reviewStatus = 'validated';
            reviewedBy = petugas.id;
            reviewedAt = `${sess.date} 13:30:00`;
            reviewNote = 'Tervalidasi oleh petugas gizi Puskesmas, lanjutkan pemantauan terpadu.';
          }

          const [gaRes] = await conn.query(
            `INSERT INTO growth_assessments
              (measurement_id, reference_version_id, birth_date_used, sex_used, age_days,
               adjustment_cm, adjusted_length_height_cm, z_score, category,
               quality_status, review_reason, review_status, reviewed_by, reviewed_at, review_note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              measurementId,
              refVersionId,
              prof.birthDate,
              prof.sex,
              calc.ageDays,
              calc.adjustmentCm,
              calc.adjustedLengthHeightCm,
              calc.zScore,
              calc.category,
              calc.qualityStatus,
              calc.reviewReason,
              reviewStatus,
              reviewedBy,
              reviewedAt,
              reviewNote
            ]
          );
          const assessmentId = Number(gaRes.insertId);

          if (isCurrentMonth && prof.state === 'submitted_followup') {
            const [fuRes] = await conn.query(
              `INSERT INTO follow_ups
                (child_id, assessment_id, type, description, assigned_to, created_by, due_date, status)
               VALUES (?, ?, 'clinical_review', ?, ?, ?, '2026-11-08', 'in_progress')`,
              [
                childId,
                assessmentId,
                '[Kategori: Konseling Gizi] Kunjungan rumah dan konseling pemberian makan bayi dan anak (PMBA) bersama keluarga.',
                kader.id,
                petugas.id
              ]
            );
            const fuId = Number(fuRes.insertId);

            await conn.query(
              `INSERT INTO follow_up_updates (follow_up_id, actor_id, activity_at, note, result)
               VALUES (?, ?, '2026-11-10 16:00:00', ?, 'visited')`,
              [
                fuId,
                kader.id,
                'Telah mengunjungi rumah wali, memberikan edukasi jadwal MPASI padat protein hewani dan menjadwalkan kontrol Puskesmas.'
              ]
            );
          }

          if (isCurrentMonth && prof.state === 'submitted_validated') {
            const [fuClosedRes] = await conn.query(
              `INSERT INTO follow_ups
                (child_id, assessment_id, type, description, assigned_to, created_by, due_date, status, closed_by, closed_at, closure_note)
               VALUES (?, ?, 'clinical_review', ?, ?, ?, '2026-11-18', 'closed', ?, '2026-11-11 10:00:00', ?)`,
              [
                childId,
                assessmentId,
                '[Kategori: Rujukan Puskesmas] Evaluasi pola asuh dan verifikasi riwayat tumbuh kembang di Puskesmas.',
                kader.id,
                petugas.id,
                petugas.id,
                'Wali dan balita telah hadir konsultasi gizi di Puskesmas, rencana pemantauan bulan depan telah disepakati.'
              ]
            );
            const fuClosedId = Number(fuClosedRes.insertId);

            await conn.query(
              `INSERT INTO follow_up_updates (follow_up_id, actor_id, activity_at, note, result)
               VALUES (?, ?, '2026-11-10 15:30:00', ?, 'referred')`,
              [
                fuClosedId,
                kader.id,
                'Mendampingi wali menjadwalkan kunjungan ke ruang konseling gizi Puskesmas.'
              ]
            );
          }
        }
      }

      await recordAuditLog(
        {
          actorId: kader.id,
          organizationId: posyandu.id,
          action: 'SESSION_OPENED',
          entityType: 'posyandu_session',
          entityId: sessions[2].id,
          requestId: 'seed-init-req',
          changeSummary: `Membuka sesi bulanan ${posyandu.name} periode November 2026.`
        },
        conn
      );
    }

    await recordAuditLog(
      {
        actorId: usersByUsername.admin.id,
        organizationId: dinasId,
        action: 'ORGANIZATION_CREATED',
        entityType: 'organization',
        entityId: dinasId,
        requestId: 'seed-init-req',
        changeSummary: 'Inisialisasi struktur organisasi Dinas Kesehatan, 2 Puskesmas, dan 4 Posyandu.'
      },
      conn
    );
  });

  return { ok: true, database: targetDbName };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    await seedDatabase();
    console.log('Seeder database TumbuhPantau Sprint 1 & Sprint 2 berhasil dijalankan (60 balita sintetis, 60 wali, 8 akun, 3 periode sesi & pengukuran).');
  } catch (err) {
    console.error('Gagal menjalankan seeder:', err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
