/**
 * fraudRules.js
 * -------------
 * Rule-based fraud detection engine for UPI transactions.
 *
 * Each rule has:
 *   - id:          Unique machine-readable code
 *   - description: Human-readable explanation shown on the dashboard
 *   - weight:      Points added to the risk score (0–100 total, capped)
 *   - evaluate:    Pure function(tx, storeHelpers) => boolean
 *
 * Risk Score Thresholds:
 *   LOW    : 0  – 39
 *   MEDIUM : 40 – 69
 *   HIGH   : 70 – 100  ← flagged as suspicious
 */

const RULES = [
  {
    id: 'HIGH_AMOUNT',
    description: 'Transaction amount ≥ ₹10,000 (high-value single transfer)',
    weight: 20,
    /**
     * Trigger: amount is at or above the high-value threshold.
     */
    evaluate: (tx) => {
      return Number(tx.amount) >= 10000;
    },
  },

  {
    id: 'VELOCITY_1MIN',
    description: '≥ 2 transactions from the same payer within the last 60 seconds',
    weight: 25,
    /**
     * Trigger: payer has sent at least 1 prior tx in the last 60 s,
     * making this the 2nd (or more) within that window.
     */
    evaluate: (tx, { priorTimes }) => {
      const now = new Date(tx.timestamp).getTime();
      const window = 60 * 1000; // 60 seconds
      const recent = priorTimes.filter(t => now - t < window);
      return recent.length >= 1; // current tx would be the 2nd+
    },
  },

  {
    id: 'VELOCITY_5MIN',
    description: '> 10 transactions from the same payer within 5 minutes',
    weight: 20,
    /**
     * Trigger: payer has more than 10 prior tx in the last 5 minutes.
     */
    evaluate: (tx, { priorTimes }) => {
      const now = new Date(tx.timestamp).getTime();
      const window = 5 * 60 * 1000; // 5 minutes
      const recent = priorTimes.filter(t => now - t < window);
      return recent.length > 10;
    },
  },

  {
    id: 'FIRST_TIME_MERCHANT_HIGH',
    description: 'First-time payee (new beneficiary) combined with amount ≥ ₹5,000',
    weight: 20,
    /**
     * Trigger: payee is brand-new for this payer AND amount is significant.
     */
    evaluate: (tx, { isNewPayee }) => {
      return isNewPayee && Number(tx.amount) >= 5000;
    },
  },

  {
    id: 'UNUSUAL_HOUR',
    description: 'Transaction during unusual hours (midnight–5 AM local time)',
    weight: 10,
    /**
     * Trigger: hour of the transaction timestamp falls between 0 and 4 (inclusive).
     */
    evaluate: (tx) => {
      const hour = new Date(tx.timestamp).getHours();
      return hour >= 0 && hour < 5;
    },
  },

  {
    id: 'DEVICE_CHANGE_NEW_BENEFICIARY',
    description: 'New device ID paired with a new beneficiary for this payer',
    weight: 25,
    /**
     * Trigger: payer is using a device not seen before AND
     * sending to a payee not seen before — both simultaneously.
     * This is a strong social-engineering / account-takeover signal.
     */
    evaluate: (tx, { isNewDevice, isNewPayee }) => {
      return isNewDevice && isNewPayee;
    },
  },
];

/**
 * evaluateTransaction
 * --------------------
 * Runs all rules against a transaction and computes a weighted risk score.
 *
 * @param {Object} tx          - Transaction payload
 * @param {Object} storeHelpers - { priorTimes, isNewDevice, isNewPayee }
 * @returns {{ score: number, riskLevel: string, triggeredRules: Array }}
 */
function evaluateTransaction(tx, storeHelpers) {
  const triggeredRules = [];
  let score = 0;

  for (const rule of RULES) {
    if (rule.evaluate(tx, storeHelpers)) {
      triggeredRules.push({
        id: rule.id,
        description: rule.description,
        weight: rule.weight,
      });
      score += rule.weight;
    }
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Classify risk level
  let riskLevel;
  if (score >= 70) {
    riskLevel = 'HIGH';
  } else if (score >= 40) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return { score, riskLevel, triggeredRules };
}

module.exports = { RULES, evaluateTransaction };
