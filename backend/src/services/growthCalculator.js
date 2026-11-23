import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AppError } from '../lib/AppError.js';

const boysPath = fileURLToPath(new URL('../../db/reference/who_lhfa_boys_0_5.json', import.meta.url));
const girlsPath = fileURLToPath(new URL('../../db/reference/who_lhfa_girls_0_5.json', import.meta.url));
const metaPath = fileURLToPath(new URL('../../db/reference/metadata.json', import.meta.url));

const boysTable = JSON.parse(readFileSync(boysPath, 'utf8'));
const girlsTable = JSON.parse(readFileSync(girlsPath, 'utf8'));
export const referenceMetadata = JSON.parse(readFileSync(metaPath, 'utf8'));

export const CLINICAL_DISCLAIMER =
  'Hasil antropometri, bukan diagnosis. Interpretasi oleh tenaga kesehatan.';

function toUtcDateOnly(input) {
  if (!input) {
    throw new AppError('Tanggal tidak boleh kosong.', 400, 'VALIDATION_ERROR');
  }
  if (input instanceof Date) {
    const y = input.getFullYear();
    const m = input.getMonth();
    const d = input.getDate();
    return Date.UTC(y, m, d);
  }
  const str = String(input).trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError('Format tanggal tidak valid.', 400, 'VALIDATION_ERROR');
    }
    return Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function calculateAgeDays(birthDate, measuredAt) {
  const birthMs = toUtcDateOnly(birthDate);
  const measuredMs = toUtcDateOnly(measuredAt);
  return Math.round((measuredMs - birthMs) / 86400000);
}

export function getRecommendedPosition(ageDays) {
  return ageDays < 731 ? 'recumbent' : 'standing';
}

export function getPositionAdjustmentCm(ageDays, position) {
  if (position !== 'recumbent' && position !== 'standing') {
    throw new AppError('Posisi ukur harus recumbent atau standing.', 400, 'VALIDATION_ERROR');
  }
  if (ageDays < 731) {
    return position === 'standing' ? 0.7 : 0.0;
  }
  return position === 'recumbent' ? -0.7 : 0.0;
}

export function getLmsForAge(sex, ageDays) {
  const table = sex === 'L' ? boysTable : sex === 'P' ? girlsTable : null;
  if (!table) {
    throw new AppError('Jenis kelamin harus L atau P.', 400, 'VALIDATION_ERROR');
  }
  const lms = table.days[String(ageDays)];
  if (!lms) {
    throw new AppError(
      'Data referensi WHO tidak ditemukan untuk umur tersebut.',
      422,
      'OUT_OF_AGE_RANGE'
    );
  }
  return lms;
}

export function evaluateGrowth({ birthDate, measuredAt, sex, lengthHeightCm, position }) {
  const ageDays = calculateAgeDays(birthDate, measuredAt);

  if (ageDays < 0) {
    throw new AppError(
      'Tanggal pengukuran tidak boleh sebelum tanggal lahir anak.',
      422,
      'MEASURED_BEFORE_BIRTH'
    );
  }

  if (ageDays > 1826) {
    throw new AppError(
      'Usia anak di luar cakupan layanan balita 0 sampai 59 bulan (maksimal 1826 hari).',
      422,
      'AGE_OUT_OF_RANGE'
    );
  }

  const rawMeasure = Number(lengthHeightCm);
  if (!Number.isFinite(rawMeasure) || rawMeasure <= 20 || rawMeasure > 160) {
    throw new AppError(
      'Panjang atau tinggi badan harus berada pada rentang yang valid (20.1 - 160.0 cm).',
      400,
      'VALIDATION_ERROR',
      { length_height_cm: 'Masukkan panjang atau tinggi badan antara 20.1 hingga 160.0 cm.' }
    );
  }

  const adjustmentCm = getPositionAdjustmentCm(ageDays, position);
  const adjustedLengthHeightCm = Number((rawMeasure + adjustmentCm).toFixed(1));
  const { L, M, S } = getLmsForAge(sex, ageDays);

  const rawZ = L !== 0
    ? (Math.pow(adjustedLengthHeightCm / M, L) - 1) / (L * S)
    : Math.log(adjustedLengthHeightCm / M) / S;

  let category;
  if (rawZ < -3.0) {
    category = 'sangat_pendek';
  } else if (rawZ < -2.0) {
    category = 'pendek';
  } else if (rawZ <= 3.0) {
    category = 'normal';
  } else {
    category = 'tinggi';
  }

  const zScore = Number(rawZ.toFixed(2));
  const isPlausibilityFlagged = Math.abs(rawZ) > 6.0;

  let qualityStatus = 'valid';
  let reviewStatus = 'not_flagged';
  let reviewReason = null;

  if (isPlausibilityFlagged) {
    qualityStatus = 'flagged_plausibility';
    reviewStatus = 'pending';
    reviewReason = 'Pemeriksaan kualitas: nilai di luar rentang rujukan wajar (|Z| > 6)';
  } else if (category !== 'normal') {
    qualityStatus = 'valid';
    reviewStatus = 'pending';
    reviewReason = `Kategori ${category.replace('_', ' ')} memerlukan peninjauan tenaga kesehatan Puskesmas`;
  }

  return {
    ageDays,
    ageMonthsApprox: Number((ageDays / 30.4375).toFixed(1)),
    recommendedPosition: getRecommendedPosition(ageDays),
    adjustmentCm,
    adjustedLengthHeightCm,
    zScore,
    rawZScore: rawZ,
    category,
    qualityStatus,
    reviewStatus,
    reviewReason,
    lms: { L, M, S },
    disclaimer: CLINICAL_DISCLAIMER
  };
}

export function getWhoReferenceCurves(sex = 'L') {
  const table = sex === 'P' ? girlsTable : boysTable;
  const points = [];
  for (let month = 0; month <= 60; month++) {
    const day = month === 24 ? 731 : Math.min(1826, Math.round(month * 30.4375));
    const { L, M, S } = table.days[String(day)];
    const valueAtZ = (z) => Number((M * Math.pow(1 + L * S * z, 1 / L)).toFixed(2));
    points.push({
      month,
      ageDays: day,
      sdNeg3: valueAtZ(-3),
      sdNeg2: valueAtZ(-2),
      sd0: valueAtZ(0),
      sdPos2: valueAtZ(2),
      sdPos3: valueAtZ(3)
    });
  }
  return points;
}
