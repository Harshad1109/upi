/**
 * server.js
 * ---------
 * Express server for the Real-Time UPI Fraud Detector.
 * Uses an in-memory store — no external database required.
 *
 * Available Routes:
 *   POST   /api/transaction   → Submit & evaluate a UPI transaction
 *   GET    /api/transactions  → Fetch all transactions (latest first)
 *   GET    /api/flagged       → Fetch only HIGH-risk flagged transactions
 *   GET    /api/export/csv    → Download flagged transactions as CSV
 *   DELETE /api/reset         → Clear the in-memory store (dev utility)
 *   GET    /api/stats         → Summary statistics for the dashboard
 */

const express = require('express');
const cors    = require('cors');
const { v4: uuidv4 } = require('crypto').webcrypto ? 
  { v4: () => require('crypto').randomUUID() } : 
  { v4: () => require('crypto').randomUUID() };

const store = require('./store/transactionStore');
const { evaluateTransaction } = require('./rules/fraudRules');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── POST /api/transaction ─────────────────────────────────────────────────────
/**
 * Accept a simulated UPI transaction, evaluate it against fraud rules,
 * persist it, and return the risk assessment.
 *
 * Expected body:
 * {
 *   payer_id  : string,
 *   payee_id  : string,
 *   amount    : number,
 *   timestamp : ISO-8601 string,
 *   location  : string,
 *   device_id : string
 * }
 */
app.post('/api/transaction', (req, res) => {
  const { payer_id, payee_id, amount, timestamp, location, device_id } = req.body;

  // --- Input validation ---
  if (!payer_id || !payee_id || !amount || !timestamp || !device_id) {
    return res.status(400).json({
      error: 'Missing required fields: payer_id, payee_id, amount, timestamp, device_id',
    });
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  // --- Gather store context BEFORE saving this tx ---
  const priorTimes = store.getPriorTxTimes(payer_id);
  const isNewDevice = store.isNewDevice(payer_id, device_id);
  const isNewPayee  = store.isNewPayee(payer_id, payee_id);

  const txPayload = {
    payer_id,
    payee_id,
    amount: parsedAmount,
    timestamp,
    location: location || 'Unknown',
    device_id,
  };

  // --- Evaluate fraud rules ---
  const { score, riskLevel, triggeredRules } = evaluateTransaction(txPayload, {
    priorTimes,
    isNewDevice,
    isNewPayee,
  });

  // --- Build final transaction record ---
  const tx = {
    id: require('crypto').randomUUID(),
    ...txPayload,
    score,
    riskLevel,
    triggeredRules,
    evaluatedAt: new Date().toISOString(),
  };

  // --- Persist to in-memory store ---
  store.addTransaction(tx);

  return res.status(201).json(tx);
});

// ── GET /api/transactions ─────────────────────────────────────────────────────
app.get('/api/transactions', (req, res) => {
  res.json(store.getAllTransactions());
});

// ── GET /api/flagged ──────────────────────────────────────────────────────────
app.get('/api/flagged', (req, res) => {
  res.json(store.getFlaggedTransactions());
});

// ── GET /api/stats ────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const all      = store.getAllTransactions();
  const flagged  = store.getFlaggedTransactions();
  const total    = all.length;
  const avgScore = total
    ? Math.round(all.reduce((s, t) => s + t.score, 0) / total)
    : 0;

  const byLevel = all.reduce((acc, tx) => {
    acc[tx.riskLevel] = (acc[tx.riskLevel] || 0) + 1;
    return acc;
  }, { LOW: 0, MEDIUM: 0, HIGH: 0 });

  res.json({ total, flaggedCount: flagged.length, avgScore, byLevel });
});

// ── GET /api/export/csv ───────────────────────────────────────────────────────
/**
 * Stream a CSV download of all HIGH-risk (flagged) transactions.
 * Columns: id, payer_id, payee_id, amount, timestamp, location,
 *          device_id, score, riskLevel, triggeredRules, evaluatedAt
 */
app.get('/api/export/csv', (req, res) => {
  const flagged = store.getFlaggedTransactions();

  const header = [
    'id', 'payer_id', 'payee_id', 'amount', 'timestamp',
    'location', 'device_id', 'score', 'riskLevel', 'triggeredRules', 'evaluatedAt',
  ].join(',');

  const rows = flagged.map(tx => [
    tx.id,
    tx.payer_id,
    tx.payee_id,
    tx.amount,
    tx.timestamp,
    `"${tx.location}"`,
    tx.device_id,
    tx.score,
    tx.riskLevel,
    `"${tx.triggeredRules.map(r => r.id).join('; ')}"`,
    tx.evaluatedAt,
  ].join(','));

  const csv = [header, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="flagged_transactions.csv"');
  res.send(csv);
});

// ── DELETE /api/reset ─────────────────────────────────────────────────────────
app.delete('/api/reset', (req, res) => {
  store.resetStore();
  res.json({ message: 'Store reset successfully' });
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 UPI Fraud Detector API running at http://localhost:${PORT}`);
  console.log(`   POST /api/transaction   → Submit & evaluate transaction`);
  console.log(`   GET  /api/transactions  → All transactions`);
  console.log(`   GET  /api/flagged       → Flagged (HIGH-risk) transactions`);
  console.log(`   GET  /api/stats         → Dashboard statistics`);
  console.log(`   GET  /api/export/csv    → Download flagged CSV`);
  console.log(`   DEL  /api/reset         → Reset store`);
});
