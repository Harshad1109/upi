/**
 * RiskBadge.jsx
 * Displays a colored badge for LOW / MEDIUM / HIGH risk levels.
 * Also renders a score bar below it when `showBar` is true.
 */
import React from 'react';

const ICONS = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };

export default function RiskBadge({ level, score, showBar = false }) {
  const pct = Math.min(score, 100);

  // Color the score bar based on the numeric value
  const barColor = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ minWidth: 90 }}>
      <span className={`risk-badge ${level}`}>
        {ICONS[level]} {level}
      </span>
      {showBar && (
        <div className="score-bar-wrap">
          <div
            className="score-bar-fill"
            style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 6px ${barColor}88` }}
          />
        </div>
      )}
    </div>
  );
}
