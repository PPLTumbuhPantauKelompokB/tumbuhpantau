import React from 'react';
import { calculateZScorePercent, formatCategoryInfo } from '../utils/formatters.js';

export function ZScoreBar({ zScore, category, qualityStatus }) {
  const numZ = Number(zScore);
  const markerLeft = calculateZScorePercent(numZ);
  const catInfo = formatCategoryInfo(category);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <span className="small fw-semibold text-secondary">Indeks PB/U atau TB/U</span>
        <span className="font-mono-num fw-bold fs-4 text-dark">
          {Number.isFinite(numZ) ? (numZ > 0 ? `+${numZ.toFixed(2)}` : numZ.toFixed(2)) : '-'}{' '}
          <span className="small fw-normal text-secondary">SD</span>
        </span>
      </div>

      <div className="tp-zscore-track" aria-label="Posisi Z-Score pada rentang standar deviasi WHO">
        <div className="tp-zscore-seg-red" title="Sangat Pendek (< -3 SD)" />
        <div className="tp-zscore-seg-amber" title="Pendek (-3 SD s.d. < -2 SD)" />
        <div className="tp-zscore-seg-green" title="Normal (-2 SD s.d. +3 SD)" />
        <div className="tp-zscore-seg-blue" title="Tinggi (> +3 SD)" />
        {Number.isFinite(numZ) && (
          <div
            className="tp-zscore-marker"
            style={{ left: `${markerLeft}%` }}
            title={`Z-Score: ${numZ.toFixed(2)} SD`}
          />
        )}
      </div>

      <div className="d-flex justify-content-between small text-secondary font-mono-num mb-2">
        <span>-4 SD</span>
        <span>-3 SD</span>
        <span>-2 SD</span>
        <span>0</span>
        <span>+2 SD</span>
        <span>+3 SD</span>
        <span>+4 SD</span>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
        <span className={`tp-badge ${catInfo.badgeClass}`}>
          {catInfo.label} {catInfo.range ? `(${catInfo.range})` : ''}
        </span>
        {qualityStatus === 'flagged_plausibility' ? (
          <span className="tp-badge tp-badge-blue">Cek Plausibilitas (|Z| &gt; 6)</span>
        ) : (
          <span className="tp-badge tp-badge-neutral">Data Valid</span>
        )}
      </div>
    </div>
  );
}
