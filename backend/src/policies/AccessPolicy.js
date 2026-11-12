import { AppError } from '../lib/AppError.js';
import { pool } from '../config/db.js';

export const ROLES = Object.freeze({
  KADER: 'kader',
  PETUGAS_PUSKESMAS: 'petugas_puskesmas',
  DINAS_KESEHATAN: 'dinas_kesehatan',
  ADMINISTRATOR: 'administrator'
});

export class AccessPolicy {
  static assertAuthenticated(user) {
    if (!user || !user.id) {
      throw AppError.unauthorized('Sesi login tidak ditemukan atau telah berakhir.');
    }
  }

  static assertRoles(user, allowedRoles) {
    this.assertAuthenticated(user);
    if (!allowedRoles.includes(user.role)) {
      throw AppError.forbidden('Peran akun Anda tidak memiliki izin untuk mengakses fitur ini.');
    }
  }

  static async resolveAllowedPosyanduIds(user, executor = pool) {
    this.assertAuthenticated(user);

    if (user.role === ROLES.KADER) {
      return [Number(user.organization_id)];
    }

    if (user.role === ROLES.PETUGAS_PUSKESMAS) {
      const [rows] = await executor.query(
        `SELECT id FROM organizations WHERE parent_id = ? AND type = 'posyandu' AND is_active = 1`,
        [user.organization_id]
      );
      return rows.map((r) => Number(r.id));
    }

    if (user.role === ROLES.DINAS_KESEHATAN || user.role === ROLES.ADMINISTRATOR) {
      const [rows] = await executor.query(
        `SELECT id FROM organizations WHERE type = 'posyandu'`
      );
      return rows.map((r) => Number(r.id));
    }

    return [];
  }

  static async assertPosyanduAccess(user, posyanduId, executor = pool) {
    this.assertAuthenticated(user);
    const targetId = Number(posyanduId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw AppError.badRequest('ID Posyandu tidak valid.');
    }

    if (user.role === ROLES.KADER) {
      if (Number(user.organization_id) !== targetId) {
        throw AppError.forbidden('Anda hanya dapat mengakses data pada Posyandu tempat Anda bertugas.');
      }
      return true;
    }

    if (user.role === ROLES.PETUGAS_PUSKESMAS) {
      const [rows] = await executor.query(
        `SELECT id FROM organizations WHERE id = ? AND parent_id = ? AND type = 'posyandu'`,
        [targetId, user.organization_id]
      );
      if (rows.length === 0) {
        throw AppError.forbidden('Posyandu ini berada di luar cakupan wilayah Puskesmas Anda.');
      }
      return true;
    }

    throw AppError.forbidden('Peran Anda tidak diizinkan mengakses data operasional Posyandu secara langsung.');
  }
}
