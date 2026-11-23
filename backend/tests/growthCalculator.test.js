import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAgeDays,
  evaluateGrowth,
  getLmsForAge,
  getPositionAdjustmentCm,
  getWhoReferenceCurves,
  CLINICAL_DISCLAIMER
} from '../src/services/growthCalculator.js';

function addDaysIso(baseDateIso, daysToAdd) {
  const [y, m, d] = baseDateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysToAdd));
  return dt.toISOString().slice(0, 10);
}

test('TEST-01a: perhitungan age_days dan batas usia 0-1826 hari sesuai standar WHO', () => {
  assert.equal(calculateAgeDays('2026-01-01', '2026-01-01'), 0);
  assert.equal(calculateAgeDays('2024-01-01', '2026-01-01'), 731);

  assert.throws(
    () =>
      evaluateGrowth({
        birthDate: '2026-05-10',
        measuredAt: '2026-05-09',
        sex: 'L',
        lengthHeightCm: 50.0,
        position: 'recumbent'
      }),
    (err) => err.statusCode === 422 && err.code === 'MEASURED_BEFORE_BIRTH'
  );

  assert.throws(
    () =>
      evaluateGrowth({
        birthDate: '2021-01-01',
        measuredAt: '2026-01-02',
        sex: 'P',
        lengthHeightCm: 110.0,
        position: 'standing'
      }),
    (err) => err.statusCode === 422 && err.code === 'AGE_OUT_OF_RANGE'
  );
});

test('TEST-01b: koreksi posisi +-0,7 cm tepat pada batas 24 bulan (730 dan 731 hari)', () => {
  assert.equal(getPositionAdjustmentCm(730, 'recumbent'), 0.0);
  assert.equal(getPositionAdjustmentCm(730, 'standing'), 0.7);
  assert.equal(getPositionAdjustmentCm(731, 'standing'), 0.0);
  assert.equal(getPositionAdjustmentCm(731, 'recumbent'), -0.7);

  const boy730Standing = evaluateGrowth({
    birthDate: '2024-11-11',
    measuredAt: '2026-11-11',
    sex: 'L',
    lengthHeightCm: 87.1,
    position: 'standing'
  });
  assert.equal(boy730Standing.ageDays, 730);
  assert.equal(boy730Standing.adjustmentCm, 0.7);
  assert.equal(boy730Standing.adjustedLengthHeightCm, 87.8);
  assert.ok(Math.abs(boy730Standing.zScore) <= 0.01);

  const girl731Recumbent = evaluateGrowth({
    birthDate: '2024-11-10',
    measuredAt: '2026-11-11',
    sex: 'P',
    lengthHeightCm: 86.4,
    position: 'recumbent'
  });
  assert.equal(girl731Recumbent.ageDays, 731);
  assert.equal(girl731Recumbent.adjustmentCm, -0.7);
  assert.equal(girl731Recumbent.adjustedLengthHeightCm, 85.7);
  assert.ok(Math.abs(girl731Recumbent.zScore) <= 0.01);
});

test('TEST-01c: klasifikasi kategori Permenkes No. 2/2020 dan pemeriksaan plausibilitas |Z| > 6', () => {
  const normalNewborn = evaluateGrowth({
    birthDate: '2026-11-11',
    measuredAt: '2026-11-11',
    sex: 'L',
    lengthHeightCm: 49.9,
    position: 'recumbent'
  });
  assert.equal(normalNewborn.category, 'normal');
  assert.equal(normalNewborn.qualityStatus, 'valid');
  assert.equal(normalNewborn.reviewStatus, 'not_flagged');
  assert.equal(normalNewborn.disclaimer, CLINICAL_DISCLAIMER);

  const pendekChild = evaluateGrowth({
    birthDate: '2025-11-11',
    measuredAt: '2026-11-11',
    sex: 'L',
    lengthHeightCm: 70.0,
    position: 'recumbent'
  });
  assert.equal(pendekChild.category, 'pendek');
  assert.equal(pendekChild.qualityStatus, 'valid');
  assert.equal(pendekChild.reviewStatus, 'pending');

  const sangatPendekChild = evaluateGrowth({
    birthDate: '2025-11-11',
    measuredAt: '2026-11-11',
    sex: 'L',
    lengthHeightCm: 67.5,
    position: 'recumbent'
  });
  assert.equal(sangatPendekChild.category, 'sangat_pendek');
  assert.equal(sangatPendekChild.qualityStatus, 'valid');
  assert.equal(sangatPendekChild.reviewStatus, 'pending');

  const tinggiChild = evaluateGrowth({
    birthDate: '2025-11-11',
    measuredAt: '2026-11-11',
    sex: 'P',
    lengthHeightCm: 83.0,
    position: 'recumbent'
  });
  assert.equal(tinggiChild.category, 'tinggi');
  assert.equal(tinggiChild.reviewStatus, 'pending');

  const extremeFlagged = evaluateGrowth({
    birthDate: '2025-11-11',
    measuredAt: '2026-11-11',
    sex: 'L',
    lengthHeightCm: 52.0,
    position: 'recumbent'
  });
  assert.equal(extremeFlagged.qualityStatus, 'flagged_plausibility');
  assert.equal(extremeFlagged.reviewStatus, 'pending');
  assert.match(extremeFlagged.reviewReason, /\|Z\| > 6/);
});

test('TEST-01d (SCRUM-35): validasi >= 60 kombinasi Z-Score WHO (0-59 bln, L/P, posisi) dengan deviasi <= 0.01', () => {
  const sampleAgesDays = [
    0, 15, 30, 61, 91, 122, 183, 274, 365, 456,
    548, 639, 730, 731, 821, 913, 1095, 1278, 1461, 1826
  ];
  const targetZValues = [-3.2, -2.5, -1.25, 0.0, 1.5, 3.25];
  const birthDate = '2021-01-01';
  let testedCombinations = 0;

  for (const ageDays of sampleAgesDays) {
    const measuredAt = addDaysIso(birthDate, ageDays);
    for (const sex of ['L', 'P']) {
      const ref = getLmsForAge(sex, ageDays);
      assert.ok(ref, `Referensi WHO wajib tersedia untuk sex=${sex} ageDays=${ageDays}`);

      for (const idx of [0, 1, 3, 5]) {
        const targetZ = targetZValues[idx];
        const useNonStandardPosition = (ageDays + idx) % 2 === 1;
        const position =
          ageDays < 731
            ? useNonStandardPosition
              ? 'standing'
              : 'recumbent'
            : useNonStandardPosition
              ? 'recumbent'
              : 'standing';

        const adjustment = getPositionAdjustmentCm(ageDays, position);
        const targetAdjustedHeight = Number((ref.M * (1 + ref.L * ref.S * targetZ)).toFixed(1));
        const rawInputHeight = Number((targetAdjustedHeight - adjustment).toFixed(1));

        const expectedZ =
          (Math.pow(targetAdjustedHeight / ref.M, ref.L) - 1) / (ref.L * ref.S);

        const evaluated = evaluateGrowth({
          birthDate,
          measuredAt,
          sex,
          lengthHeightCm: rawInputHeight,
          position
        });

        const diff = Math.abs(evaluated.zScore - expectedZ);
        assert.ok(
          diff <= 0.01,
          `Deviasi Z-Score melebihi 0.01 pada ageDays=${ageDays}, sex=${sex}, pos=${position}: actual=${evaluated.zScore}, expected=${expectedZ}, diff=${diff}`
        );
        testedCombinations += 1;
      }
    }
  }

  assert.ok(
    testedCombinations >= 50,
    `Jumlah kombinasi uji harus >= 50 (teruji: ${testedCombinations})`
  );
});

test('TEST-01e: kurva referensi WHO menghasilkan 61 titik bulan (0..60)', () => {
  const boysCurves = getWhoReferenceCurves('L');
  const girlsCurves = getWhoReferenceCurves('P');
  assert.equal(boysCurves.length, 61);
  assert.equal(girlsCurves.length, 61);
  assert.ok(boysCurves[0].sdNeg3 < boysCurves[0].sd0 && boysCurves[0].sd0 < boysCurves[0].sdPos3);
});
