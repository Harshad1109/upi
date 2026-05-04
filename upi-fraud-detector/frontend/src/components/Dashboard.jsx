/**
 * Dashboard.jsx
 * --------------
 * Summary statistics panel.
 * Shows: total transactions, flagged count, avg risk score,
 *        risk distribution bars, and a latest-transaction score gauge.
 */
import React from 'react';

// SVG arc gauge component
function ScoreGauge({ score, level }) {
  const r = 58;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const dashOffset = circumference * (1 - pct);

  const color = level === 'HIGH' ? '#ef4444' : level === 'MEDIUM' ? '#f59e0b' : '#10b981';
  const glow  = level === 'HIGH' ? 'rgba(239,68,68,0.5)' : level === 'MEDIUM' ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)';

  return (
    <div className="gauge-wrap">
      <div className="gauge-ring">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          {/* Arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            filter="url(#glow)"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.4s' }}
          />
        </svg>
        <div className="gauge-label">
          <span className="gauge-score" style={{ color }}>{score}</span>
          <span className="gauge-text">/ 100</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Latest Score</div>
        <span className={`risk-badge ${level}`}>{level}</span>
      </div>
    </div>
  );
}

export default function Dashboard({ stats, latestTx }) {
  const { total = 0, flaggedCount = 0, avgScore = 0, byLevel = {} } = stats || {};
  const maxCount = Math.max(byLevel.HIGH || 0, byLevel.MEDIUM || 0, byLevel.LOW || 0, 1);

  return (
    <div>
      {/* Summary stat cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value blue">{total}</div>
          <div className="stat-sub">Evaluated in this session</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">🚨 Flagged (HIGH)</div>
          <div className="stat-value red">{flaggedCount}</div>
          <div className="stat-sub">{total ? Math.round((flaggedCount / total) * 100) : 0}% of total</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Average Risk Score</div>
          <div className="stat-value amber">{avgScore}</div>
          <div className="stat-sub">Weighted 0–100</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">✅ Safe (LOW)</div>
          <div className="stat-value green">{byLevel.LOW || 0}</div>
          <div className="stat-sub">Below threshold</div>
        </div>
      </div>

      {/* Bottom row: gauge + distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
        {/* Gauge */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {latestTx ? (
            <ScoreGauge score={latestTx.score} level={latestTx.riskLevel} />
          ) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <div className="empty-icon">📊</div>
              <div className="empty-text" style={{ fontSize: 12 }}>Submit a transaction</div>
            </div>
          )}
        </div>

        {/* Distribution */}
        <div className="card">
          <div className="card-title">📈 Risk Distribution</div>
          {['HIGH', 'MEDIUM', 'LOW'].map(level => (
            <div className="dist-bar-row" key={level}>
              <div className="dist-label" style={{
                color: level === 'HIGH' ? 'var(--high)' : level === 'MEDIUM' ? 'var(--medium)' : 'var(--low)',
              }}>
                {level}
              </div>
              <div className="dist-track">
                <div
                  className={`dist-fill ${level}`}
                  style={{ width: `${((byLevel[level] || 0) / maxCount) * 100}%` }}
                />
              </div>
              <div className="dist-count">{byLevel[level] || 0}</div>
            </div>
          ))}
          {total === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
              No data yet — submit some transactions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
