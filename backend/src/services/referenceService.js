import { pool } from '../config/db.js';
import { referenceMetadata } from './growthCalculator.js';

let cachedRefVersionId = null;

export async function getActiveReferenceVersionId(executor = pool) {
  if (cachedRefVersionId) {
    return cachedRefVersionId;
  }

  const [existing] = await executor.query(
    'SELECT id FROM reference_versions WHERE name = ? LIMIT 1',
    [referenceMetadata.name]
  );

  if (existing.length > 0) {
    cachedRefVersionId = Number(existing[0].id);
    return cachedRefVersionId;
  }

  const [result] = await executor.query(
    `INSERT INTO reference_versions (name, source_url, file_checksum, algorithm_version)
     VALUES (?, ?, ?, ?)`,
    [
      referenceMetadata.name,
      referenceMetadata.source_url,
      referenceMetadata.file_checksum,
      referenceMetadata.algorithm_version
    ]
  );

  cachedRefVersionId = Number(result.insertId);
  return cachedRefVersionId;
}

export function resetReferenceVersionCache() {
  cachedRefVersionId = null;
}
