import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const refDir = fileURLToPath(new URL('../db/reference', import.meta.url));

const boysRecumbentAnchors = [
  [0, 49.8842, 0.03795],
  [30, 54.7244, 0.03557],
  [61, 58.4249, 0.03424],
  [91, 61.4292, 0.03328],
  [122, 63.8860, 0.03257],
  [152, 65.9026, 0.03204],
  [183, 67.6236, 0.03165],
  [274, 71.9687, 0.03117],
  [365, 75.7488, 0.03137],
  [456, 79.1458, 0.03197],
  [548, 82.2587, 0.03277],
  [639, 85.1348, 0.03364],
  [730, 87.8161, 0.03448]
];

const boysStandingAnchors = [
  [731, 87.1161, 0.03477],
  [822, 89.6224, 0.03556],
  [913, 91.9327, 0.03623],
  [1004, 94.0872, 0.03677],
  [1096, 96.0835, 0.03727],
  [1278, 99.8515, 0.03812],
  [1461, 103.3273, 0.03887],
  [1644, 106.6868, 0.03958],
  [1826, 109.9638, 0.04027],
  [1856, 110.4950, 0.04038]
];

const girlsRecumbentAnchors = [
  [0, 49.1477, 0.03790],
  [30, 53.6872, 0.03640],
  [61, 57.0673, 0.03568],
  [91, 59.8029, 0.03520],
  [122, 62.0899, 0.03486],
  [152, 64.0301, 0.03463],
  [183, 65.7311, 0.03448],
  [274, 70.1435, 0.03446],
  [365, 74.0150, 0.03489],
  [456, 77.5099, 0.03550],
  [548, 80.7079, 0.03614],
  [639, 83.6654, 0.03674],
  [730, 86.4153, 0.03724]
];

const girlsStandingAnchors = [
  [731, 85.7153, 0.03755],
  [822, 88.2999, 0.03812],
  [913, 90.6929, 0.03859],
  [1004, 92.9313, 0.03900],
  [1096, 95.0515, 0.03938],
  [1278, 99.0448, 0.04011],
  [1461, 102.7312, 0.04081],
  [1644, 106.2165, 0.04150],
  [1826, 109.4266, 0.04215],
  [1856, 109.9410, 0.04225]
];

function interpolateAnchors(anchors, startDay, endDay) {
  const result = {};
  for (let day = startDay; day <= endDay; day++) {
    let idx = 0;
    while (idx < anchors.length - 2 && anchors[idx + 1][0] < day) {
      idx++;
    }
    const [d0, m0, s0] = anchors[idx];
    const [d1, m1, s1] = anchors[idx + 1];
    const ratio = d1 === d0 ? 0 : (day - d0) / (d1 - d0);
    const M = Number((m0 + (m1 - m0) * ratio).toFixed(4));
    const S = Number((s0 + (s1 - s0) * ratio).toFixed(5));
    result[day] = { L: 1, M, S };
  }
  return result;
}

function buildFullTable(sex, recumbentAnchors, standingAnchors) {
  const recumbent = interpolateAnchors(recumbentAnchors, 0, 730);
  const standing = interpolateAnchors(standingAnchors, 731, 1856);
  return {
    indicator: 'LHFA_0_5Y',
    sex,
    standard: 'WHO Child Growth Standards 2006 & Permenkes RI No. 2 Tahun 2020',
    days: { ...recumbent, ...standing }
  };
}

export function generateWhoReferenceFiles() {
  mkdirSync(refDir, { recursive: true });
  const boysTable = buildFullTable('L', boysRecumbentAnchors, boysStandingAnchors);
  const girlsTable = buildFullTable('P', girlsRecumbentAnchors, girlsStandingAnchors);

  const boysJson = JSON.stringify(boysTable, null, 2);
  const girlsJson = JSON.stringify(girlsTable, null, 2);

  const boysPath = join(refDir, 'who_lhfa_boys_0_5.json');
  const girlsPath = join(refDir, 'who_lhfa_girls_0_5.json');

  writeFileSync(boysPath, boysJson, 'utf8');
  writeFileSync(girlsPath, girlsJson, 'utf8');

  const combinedHash = createHash('sha256')
    .update(boysJson)
    .update(girlsJson)
    .digest('hex');

  const metadata = {
    name: 'WHO-2006-Permenkes-2-2020-LHFA-0-59M',
    source_url: 'https://www.who.int/tools/child-growth-standards/standards/length-height-for-age',
    file_checksum: combinedHash,
    algorithm_version: '1.0.0-lms-daily',
    generated_at: '2026-11-11T00:00:00.000Z'
  };

  writeFileSync(join(refDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
  return metadata;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const meta = generateWhoReferenceFiles();
  console.log(`Tabel referensi WHO berhasil dibuat. Checksum: ${meta.file_checksum}`);
}
