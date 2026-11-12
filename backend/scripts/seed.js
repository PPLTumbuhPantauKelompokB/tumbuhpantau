import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool, withTransaction, closePool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { runMigrations } from './migrate.js';
import { recordAuditLog } from '../src/services/auditService.js';

const CHILD_PROFILES_PER_POSYANDU = [
  { nameSuffix: 'Arka Pratama', guardian: 'Ibu Wulandari', sex: 'L', birthDate: '2025-11-15' },
  { nameSuffix: 'Nadhira Putri', guardian: 'Ibu Kartini', sex: 'P', birthDate: '2025-08-20' },
  { nameSuffix: 'Rafka Aditya', guardian: 'Ibu Sri Wahyuni', sex: 'L', birthDate: '2025-05-10' },
  { nameSuffix: 'Aisyah Zahra', guardian: 'Ibu Fitriani', sex: 'P', birthDate: '2025-02-14' },
  { nameSuffix: 'Bima Sakti', guardian: 'Ibu Kusuma', sex: 'L', birthDate: '2024-11-05' },
  { nameSuffix: 'Kirana Larasati', guardian: 'Ibu Megawati', sex: 'P', birthDate: '2024-07-18' },
  { nameSuffix: 'Daffa Ramadhan', guardian: 'Ibu Nurhayati', sex: 'L', birthDate: '2024-03-22' },
  { nameSuffix: 'Salsabila Azzahra', guardian: 'Ibu Handayani', sex: 'P', birthDate: '2023-12-09' },
  { nameSuffix: 'Gilang Saputra', guardian: 'Ibu Puspitasari', sex: 'L', birthDate: '2023-08-30' },
  { nameSuffix: 'Tiara Maharani', guardian: 'Ibu Permata', sex: 'P', birthDate: '2023-04-12' },
  { nameSuffix: 'Fajar Nugroho', guardian: 'Ibu Rahayu', sex: 'L', birthDate: '2022-12-19' },
  { nameSuffix: 'Alya Nabila', guardian: 'Ibu Anggraini', sex: 'P', birthDate: '2022-08-25' },
  { nameSuffix: 'Reza Mahendra', guardian: 'Ibu Oktaviani', sex: 'L', birthDate: '2024-09-14' },
  { nameSuffix: 'Citra Lestari', guardian: 'Ibu Damayanti', sex: 'P', birthDate: '2023-10-03' },
  { nameSuffix: 'Bagas Kurniawan', guardian: 'Ibu Setyowati', sex: 'L', birthDate: '2023-01-17' }
];

export async function seedDatabase(targetDbName = env.db.name) {
  await runMigrations(targetDbName);

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
      { parentId: pkmMelatiId, code: 'POS-MLT-01', name: 'Posyandu Melati 01' },
      { parentId: pkmMelatiId, code: 'POS-MLT-03', name: 'Posyandu Melati 03' },
      { parentId: pkmKenangaId, code: 'POS-KNG-01', name: 'Posyandu Kenanga 01' },
      { parentId: pkmKenangaId, code: 'POS-KNG-02', name: 'Posyandu Kenanga 02' }
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

    for (let pIdx = 0; pIdx < posyandus.length; pIdx++) {
      const posyandu = posyandus[pIdx];
      const kader = usersByUsername[kaderUsernames[pIdx]];

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
          const isAbsent = (cIdx % 5 === 0) && sIdx === sessions.length - 1;
          const attStatus = isAbsent ? 'absent' : 'present';

          await conn.query(
            `INSERT INTO attendances (session_id, child_id, status, recorded_by, recorded_at)
             VALUES (?, ?, ?, ?, ?)`,
            [sess.id, childId, attStatus, kader.id, `${sess.date} 08:30:00`]
          );
        }
      }
    }

    const adminUser = usersByUsername['admin'];
    await recordAuditLog(
      {
        actorId: adminUser.id,
        organizationId: adminUser.orgId,
        action: 'SYSTEM_SEED',
        entityType: 'database',
        entityId: null,
        changeSummary: 'Inisialisasi data benih Sprint 1 TumbuhPantau selesai.'
      },
      conn
    );
  });

  return { ok: true, database: targetDbName };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  seedDatabase()
    .then(() => {
      console.log('Seeding basis data Sprint 1 selesai.');
    })
    .catch((err) => {
      console.error('Gagal menjalankan seeder:', err);
      process.exit(1);
    })
    .finally(() => closePool());
}
