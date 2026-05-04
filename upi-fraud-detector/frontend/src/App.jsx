/**
 * App.jsx
 * --------
 * Root component for the UPI Fraud Detector dashboard.
 *
 * Views:
 *   - "submit"  → Transaction input form
 *   - "dashboard" → Stats overview
 *   - "all"     → All transactions table
 *   - "flagged" → Flagged (HIGH-risk) transactions table
 *
 * State is polled every 5 s from the backend for near-real-time updates.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransactionForm from './components/TransactionForm';
import Dashboard from './components/Dashboard';
import FlaggedList from './components/FlaggedList';

// ── Toast System ─────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.level} ${t.exiting ? 'exiting' : ''}`}>
          <div className="toast-header">
            <span className={`toast-title ${t.level}`}>
              {t.level === 'HIGH' ? '🚨 HIGH RISK ALERT' : t.level === 'MEDIUM' ? '⚠ Medium Risk' : '✅ Low Risk'}
            </span>
            <button className="toast-close" onClick={() => onDismiss(t.id)}>×</button>
          </div>
          <div className="toast-body">
            Score <strong>{t.score}/100</strong> — {t.payerId} → {t.payeeId} — ₹{t.amount.toLocaleString('en-IN')}
            {t.rules.length > 0 && (
              <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                Rules: {t.rules.join(', ')}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sidebar Navigation ────────────────────────────────────────────────────────
function Sidebar({ view, setView, flaggedCount }) {
  const navItems = [
    { id: 'submit',    icon: '📤', label: 'Submit Transaction' },
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'all',       icon: '📋', label: 'All Transactions' },
    { id: 'flagged',   icon: '🚨', label: 'Flagged',  badge: flaggedCount > 0 ? flaggedCount : null },
  ];

  return (
    <aside className="sidebar">
      <div className="nav-section-label">Navigation</div>
      {navItems.map(item => (
        <div
          key={item.id}
          className={`nav-item ${view === item.id ? 'active' : ''}`}
          onClick={() => setView(item.id)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setView(item.id)}
          id={`nav-${item.id}`}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
          {item.badge !== null && item.badge !== undefined && (
            <span className="nav-badge">{item.badge}</span>
          )}
        </div>
      ))}

      <div className="nav-section-label" style={{ marginTop: 16 }}>Rules Engine</div>
      <div style={{ padding: '0 14px' }}>
        {[
          { id: 'HIGH_AMOUNT',                   pts: 20, label: 'High Amount (≥₹10k)' },
          { id: 'VELOCITY_1MIN',                 pts: 25, label: 'Velocity — 1 min' },
          { id: 'VELOCITY_5MIN',                 pts: 20, label: 'Velocity — 5 min' },
          { id: 'FIRST_TIME_MERCHANT_HIGH',       pts: 20, label: 'New Merchant + High Amt' },
          { id: 'UNUSUAL_HOUR',                  pts: 10, label: 'Unusual Hour (12–5am)' },
          { id: 'DEVICE_CHANGE_NEW_BENEFICIARY', pts: 25, label: 'Device + Beneficiary Change' },
        ].map(r => (
          <div key={r.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.label}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-bright)', fontWeight: 600 }}>
              +{r.pts}
            </span>
          </div>
        ))}
        <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div>🟢 LOW: 0–39 pts</div>
          <div>🟡 MED: 40–69 pts</div>
          <div>🔴 HIGH: 70–100 pts</div>
        </div>
      </div>
    </aside>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]               = useState('submit');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats]             = useState({});
  const [toasts, setToasts]           = useState([]);
  const [latestTx, setLatestTx]       = useState(null);
  const toastTimers                   = useRef({});

  // ── Fetch data from backend ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [txRes, statsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/stats'),
      ]);
      const txData    = await txRes.json();
      const statsData = await statsRes.json();
      setTransactions(txData);
      setStats(statsData);
    } catch {
      // silently fail during polling — backend might not be up yet
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Handle new transaction result ────────────────────────────────────────
  const handleResult = useCallback((tx) => {
    setLatestTx(tx);
    fetchData(); // immediate refresh

    // Fire toast
    const toastId = Date.now();
    setToasts(prev => [...prev, {
      id:      toastId,
      level:   tx.riskLevel,
      score:   tx.score,
      payerId: tx.payer_id,
      payeeId: tx.payee_id,
      amount:  tx.amount,
      rules:   tx.triggeredRules.map(r => r.id),
      exiting: false,
    }]);

    // Auto-dismiss after 6 s
    toastTimers.current[toastId] = setTimeout(() => dismissToast(toastId), 6000);

    // Auto-switch to flagged view on HIGH risk
    if (tx.riskLevel === 'HIGH') {
      setTimeout(() => setView('flagged'), 800);
    }
  }, [fetchData]);

  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current[id]);
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  const flaggedCount = transactions.filter(tx => tx.riskLevel === 'HIGH').length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-icon">🛡</div>
          <div>
            <div className="topbar-title">UPI Fraud Detector</div>
            <div className="topbar-subtitle">Real-Time Risk Monitoring System</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Session: <span style={{ color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)' }}>
              {transactions.length} tx
            </span>
          </div>
          <div className="topbar-status">
            <div className="status-dot" />
            System Active
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar view={view} setView={setView} flaggedCount={flaggedCount} />

      {/* Main content */}
      <main className="main-content">
        {view === 'submit' && (
          <div>
            <div className="section-header">
              <h1 className="section-title">📤 Submit UPI Transaction</h1>
            </div>
            <div className="card">
              <div className="card-title">🔐 Transaction Details</div>
              <TransactionForm onResult={handleResult} />
            </div>

            {latestTx && (
              <div style={{ marginTop: 20 }}>
                <div className="card-title" style={{ marginBottom: 12 }}>📋 Last Evaluation Result</div>
                <div className="card" style={{
                  borderColor: latestTx.riskLevel === 'HIGH' ? 'rgba(248,113,113,0.4)'
                    : latestTx.riskLevel === 'MEDIUM' ? 'rgba(251,191,36,0.4)' : 'rgba(52,211,153,0.4)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 48, fontWeight: 800, fontFamily: 'var(--font-mono)',
                      color: latestTx.riskLevel === 'HIGH' ? 'var(--high)' : latestTx.riskLevel === 'MEDIUM' ? 'var(--medium)' : 'var(--low)' }}>
                      {latestTx.score}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Risk Score / 100</div>
                      <span className={`risk-badge ${latestTx.riskLevel}`} style={{ fontSize: 13, padding: '5px 14px' }}>
                        {latestTx.riskLevel === 'HIGH' ? '🔴' : latestTx.riskLevel === 'MEDIUM' ? '🟡' : '🟢'} {latestTx.riskLevel} RISK
                      </span>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>₹{latestTx.amount.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{latestTx.payer_id} → {latestTx.payee_id}</div>
                    </div>
                  </div>

                  {latestTx.triggeredRules.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Reason Codes:</div>
                      {latestTx.triggeredRules.map(r => (
                        <div key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 12px', marginBottom: 6,
                          background: 'rgba(59,130,246,0.06)',
                          borderRadius: 6, border: '1px solid rgba(59,130,246,0.12)',
                        }}>
                          <span className="rule-tag">{r.id}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.description}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)' }}>
                            +{r.weight} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--low)' }}>✅ No fraud indicators detected.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'dashboard' && (
          <div>
            <div className="section-header">
              <h1 className="section-title">📊 Risk Dashboard</h1>
              <button className="btn btn-ghost" onClick={fetchData} style={{ fontSize: 13 }}>🔄 Refresh</button>
            </div>
            <Dashboard stats={stats} latestTx={latestTx} />
          </div>
        )}

        {(view === 'all' || view === 'flagged') && (
          <FlaggedList
            transactions={transactions}
            filterMode={view}
            onRefresh={fetchData}
          />
        )}
      </main>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
