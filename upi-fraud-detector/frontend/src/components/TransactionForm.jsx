/**
 * TransactionForm.jsx
 * --------------------
 * Input form for simulated UPI transactions.
 * Matches the sample JSON structure from the problem statement:
 *   { payer_id, payee_id, amount, timestamp, location, device_id }
 *
 * On submit: POSTs to /api/transaction, calls onResult() with the response.
 */
import React, { useState } from 'react';

const DEFAULT_FORM = {
  payer_id:  '',
  payee_id:  '',
  amount:    '',
  timestamp: new Date().toISOString().slice(0, 16),
  location:  '',
  device_id: '',
};

// Preset quick-fill scenarios for demonstration
const PRESETS = [
  {
    label: '🔴 High-Risk Scenario',
    data: {
      payer_id: '9988776655',
      payee_id: 'MERCHANT121',
      amount:   '12500',
      timestamp: new Date(Date.now()).toISOString().slice(0, 16),
      location:  'Delhi',
      device_id: 'NEW_DEVICE_XYZ',
    },
  },
  {
    label: '🟡 Medium-Risk Scenario',
    data: {
      payer_id:  '8877665544',
      payee_id:  'SHOP_456',
      amount:    '6000',
      timestamp: new Date(Date.now()).toISOString().slice(0, 16),
      location:  'Mumbai',
      device_id: 'DEV_KNOWN_001',
    },
  },
  {
    label: '🌙 Night Transaction',
    data: {
      payer_id:  '7766554433',
      payee_id:  'ATM_CASH_99',
      amount:    '3000',
      timestamp: new Date(Date.now()).toISOString().slice(0, 10) + 'T02:30',
      location:  'Pune',
      device_id: 'DEV_002',
    },
  },
];

export default function TransactionForm({ onResult }) {
  const [form, setForm]       = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const fillPreset = (data) => {
    setForm(prev => ({ ...prev, ...data }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/transaction', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, amount: Number(form.amount) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Submission failed');
        return;
      }

      onResult(data);

      // Auto-fill next timestamp to "now" after each submit
      setForm(prev => ({
        ...prev,
        timestamp: new Date().toISOString().slice(0, 16),
      }));
    } catch (err) {
      setError('Network error — is the backend running on port 5000?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Quick-fill presets */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button
            key={p.label}
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '7px 14px' }}
            onClick={() => fillPreset(p.data)}
            type="button"
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="payer_id">Payer ID</label>
            <input
              id="payer_id"
              className="form-input"
              name="payer_id"
              placeholder="e.g. 9988776655"
              value={form.payer_id}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="payee_id">Payee / Merchant ID</label>
            <input
              id="payee_id"
              className="form-input"
              name="payee_id"
              placeholder="e.g. MERCHANT121"
              value={form.payee_id}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="amount">Amount (₹)</label>
            <input
              id="amount"
              className="form-input"
              name="amount"
              type="number"
              placeholder="e.g. 9500"
              min="1"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="device_id">Device ID</label>
            <input
              id="device_id"
              className="form-input"
              name="device_id"
              placeholder="e.g. ABC123"
              value={form.device_id}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="timestamp">Timestamp</label>
            <input
              id="timestamp"
              className="form-input"
              name="timestamp"
              type="datetime-local"
              value={form.timestamp}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="location">Location</label>
            <input
              id="location"
              className="form-input"
              name="location"
              placeholder="e.g. Delhi"
              value={form.location}
              onChange={handleChange}
            />
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 14,
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            fontSize: 13,
            color: '#f87171',
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            id="submit-transaction"
            className="btn btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? '⏳ Evaluating...' : '🔍 Submit & Evaluate'}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setForm(DEFAULT_FORM)}
          >
            ↺ Reset
          </button>
        </div>
      </form>
    </div>
  );
}
