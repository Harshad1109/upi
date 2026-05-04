/**
 * transactionStore.js
 * -------------------
 * Lightweight in-memory store for UPI transactions.
 * Tracks per-payer velocity windows, known devices, and known payees.
 * No external DB required — all state lives in process memory.
 */

// Master list of all submitted transactions
const transactions = [];

// Per-payer state maps
const payerDevices = {};     // payer_id -> Set of known device_ids
const payerPayees  = {};     // payer_id -> Set of known payee_ids (beneficiaries)
const payerTxTimes = {};     // payer_id -> Array of timestamps (for velocity)

/**
 * Persist a new transaction and update all payer-state maps.
 * @param {Object} tx - The transaction object (already risk-evaluated)
 */
function addTransaction(tx) {
  transactions.unshift(tx); // latest first

  const { payer_id, payee_id, device_id, timestamp } = tx;

  // Track velocity timestamps
  if (!payerTxTimes[payer_id]) payerTxTimes[payer_id] = [];
  payerTxTimes[payer_id].push(new Date(timestamp).getTime());

  // Track known devices
  if (!payerDevices[payer_id]) payerDevices[payer_id] = new Set();
  payerDevices[payer_id].add(device_id);

  // Track known payees (beneficiaries)
  if (!payerPayees[payer_id]) payerPayees[payer_id] = new Set();
  payerPayees[payer_id].add(payee_id);
}

/**
 * Retrieve all transactions.
 */
function getAllTransactions() {
  return transactions;
}

/**
 * Retrieve only HIGH-risk flagged transactions.
 */
function getFlaggedTransactions() {
  return transactions.filter(tx => tx.riskLevel === 'HIGH');
}

/**
 * Get timestamps of past transactions for a payer (for velocity checks).
 * Returns them BEFORE the current transaction is saved.
 */
function getPriorTxTimes(payer_id) {
  return payerTxTimes[payer_id] || [];
}

/**
 * Check if a device is new for this payer (at evaluation time, before save).
 */
function isNewDevice(payer_id, device_id) {
  if (!payerDevices[payer_id]) return true;
  return !payerDevices[payer_id].has(device_id);
}

/**
 * Check if a payee is new for this payer (at evaluation time, before save).
 */
function isNewPayee(payer_id, payee_id) {
  if (!payerPayees[payer_id]) return true;
  return !payerPayees[payer_id].has(payee_id);
}

/**
 * Reset the entire store (useful for testing / demo resets).
 */
function resetStore() {
  transactions.length = 0;
  Object.keys(payerDevices).forEach(k => delete payerDevices[k]);
  Object.keys(payerPayees).forEach(k => delete payerPayees[k]);
  Object.keys(payerTxTimes).forEach(k => delete payerTxTimes[k]);
}

module.exports = {
  addTransaction,
  getAllTransactions,
  getFlaggedTransactions,
  getPriorTxTimes,
  isNewDevice,
  isNewPayee,
  resetStore,
};
