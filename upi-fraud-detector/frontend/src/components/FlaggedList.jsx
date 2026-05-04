/**
 * FlaggedList.jsx
 * ----------------
 * Displays all transactions (or only flagged ones) in a sortable table.
 * Each row is expandable to show full detail + triggered rule descriptions.
 * Includes a CSV export button for flagged transactions.
 */
import React, { useState } from 'react';
import RiskBadge from './RiskBadge';

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatCurrency(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function FlaggedList({ transactions, filterMode, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleRow = (id) => setExpandedId(prev => prev === id ? null : id);

  const handleExport = () => {
    window.open('/api/export/csv', '_blank');
  };

  const displayed = filterMode === 'flagged'
    ? transactions.filter(tx => tx.riskLevel === 'HIGH')
    : transactions;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">
          {filterMode === 'flagged' ? '🚨 Flagged Transactions' : '📋 All Transactions'}
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 10 }}>
            ({displayed.length})
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onRefresh} style={{ fontSize: 13 }}>
            🔄 Refresh
          </button>
          <button
            id="export-csv-btn"
            className="btn btn-success"
            onClick={handleExport}
            style={{ fontSize: 13 }}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">{filterMode === 'flagged' ? '✅' : '📭'}</div>
            <div className="empty-text">
              {filterMode === 'flagged'
                ? 'No flagged transactions yet — system looks clean!'
                : 'No transactions submitted yet.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Risk</th>
                  <th>Score</th>
                  <th>Payer</th>
                  <th>Payee</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                  <th>Location</th>
                  <th>Rules Triggered</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(tx => (
                  <React.Fragment key={tx.id}>
                    <tr
                      className={tx.riskLevel === 'HIGH' ? 'row-high' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleRow(tx.id)}
                    >
                      {/* Expand toggle */}
                      <td style={{ width: 32, color: 'var(--text-muted)', fontSize: 11 }}>
                        {expandedId === tx.id ? '▼' : '▶'}
                      </td>

                      <td><RiskBadge level={tx.riskLevel} score={tx.score} showBar /></td>

                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 15,
                          fontWeight: 700,
                          color: tx.riskLevel === 'HIGH' ? 'var(--high)' : tx.riskLevel === 'MEDIUM' ? 'var(--medium)' : 'var(--low)',
                        }}>
                          {tx.score}
                        </span>
                      </td>

                      <td className="mono">{tx.payer_id}</td>
                      <td className="mono">{tx.payee_id}</td>

                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatCurrency(tx.amount)}
                      </td>

                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {formatTime(tx.timestamp)}
                      </td>

                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {tx.location}
                      </td>

                      <td>
                        <div className="rule-tags">
                          {tx.triggeredRules.length === 0
                            ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</span>
                            : tx.triggeredRules.map(r => (
                              <span className="rule-tag" key={r.id}>{r.id}</span>
                            ))}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedId === tx.id && (
                      <tr className="detail-row">
                        <td colSpan={9}>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <label>Transaction ID</label>
                              <span>{tx.id}</span>
                            </div>
                            <div className="detail-item">
                              <label>Device ID</label>
                              <span>{tx.device_id}</span>
                            </div>
                            <div className="detail-item">
                              <label>Evaluated At</label>
                              <span>{formatTime(tx.evaluatedAt)}</span>
                            </div>
                          </div>

                          {tx.triggeredRules.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                                Triggered Rules & Reason Codes
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {tx.triggeredRules.map(r => (
                                  <div
                                    key={r.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      padding: '7px 12px',
                                      background: 'rgba(59,130,246,0.06)',
                                      borderRadius: 6,
                                      border: '1px solid rgba(59,130,246,0.12)',
                                    }}
                                  >
                                    <span className="rule-tag">{r.id}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.description}</span>
                                    <span style={{
                                      marginLeft: 'auto',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: 'var(--accent-bright)',
                                      fontFamily: 'var(--font-mono)',
                                    }}>
                                      +{r.weight} pts
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
