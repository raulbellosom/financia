import { YIELD_FREQUENCIES, YIELD_CALCULATION_BASE } from "../lib/constants";

/**
 * Calculates the daily yield amount for an account.
 * @param {Object} account - The account object.
 * @returns {number} The calculated daily yield amount.
 */
export const calculateDailyYield = (account) => {
  if (account.type !== "investment" || !account.yieldRate) {
    return 0;
  }

  let baseAmount = 0;
  if (account.yieldCalculationBase === YIELD_CALCULATION_BASE.FIXED) {
    baseAmount = account.yieldFixedAmount || 0;
  } else {
    baseAmount = account.currentBalance || 0;
  }

  if (baseAmount <= 0) return 0;

  let dailyRate = 0;
  const rate = account.yieldRate / 100; // Convert percentage to decimal

  switch (account.yieldFrequency) {
    case YIELD_FREQUENCIES.ANNUAL:
      dailyRate = rate / 365;
      break;
    case YIELD_FREQUENCIES.MONTHLY:
      dailyRate = rate / 30;
      break;
    case YIELD_FREQUENCIES.DAILY:
      dailyRate = rate;
      break;
    default:
      dailyRate = 0;
  }

  return baseAmount * dailyRate;
};

/**
 * Checks if yield should be generated for an account.
 * @param {Object} account - The account object.
 * @returns {boolean} True if yield should be generated.
 */
export const shouldGenerateYield = (account) => {
  if (account.type !== "investment" || !account.yieldRate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!account.lastYieldDate) {
    // If never generated, maybe start from today or creation date?
    // For now, let's say if it's not set, we generate it for today.
    // Or maybe we should rely on the caller to handle the first time.
    // Let's assume if lastYieldDate is missing, we generate.
    return true;
  }

  const lastDate = new Date(account.lastYieldDate);
  lastDate.setHours(0, 0, 0, 0);

  return today > lastDate;
};

/**
 * Calculates the number of days missed since the last yield date.
 * @param {Object} account - The account object.
 * @returns {number} Number of days missed.
 */
export const getMissedYieldDays = (account) => {
  if (!account.lastYieldDate) return 1; // Treat as 1 day if never run

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = new Date(account.lastYieldDate);
  lastDate.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(today - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};
