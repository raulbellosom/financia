import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";

/**
 * Generate recurring events based on rules within a date range
 * @param {Array} rules - Array of recurring rules
 * @param {Date} startDate - Start of the visible range
 * @param {Date} endDate - End of the visible range
 * @returns {Array} Array of projected transaction objects
 */
export const generateRecurringEvents = (rules, startDate, endDate) => {
  if (!rules || !Array.isArray(rules)) return [];

  const events = [];
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  rules.forEach((rule) => {
    if (!rule.isActive) return;

    let currentDate = new Date(rule.nextRun || rule.startDate);

    // If the rule starts after the end of the range, skip it
    if (isAfter(currentDate, end)) return;

    // If the rule starts before the range, we might need to advance it
    // But for simplicity, we can just iterate until we hit the range or pass it
    // Optimization: Advance currentDate to at least startDate if it's far behind
    // (This requires complex logic for different frequencies, so simple iteration is safer for now unless range is huge)

    // Safety break to prevent infinite loops
    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (
      isBefore(currentDate, end) ||
      currentDate.getTime() === end.getTime()
    ) {
      if (iterations++ > MAX_ITERATIONS) break;

      // If current date is within range, add event
      if (
        (isAfter(currentDate, start) ||
          currentDate.getTime() === start.getTime()) &&
        (isBefore(currentDate, end) || currentDate.getTime() === end.getTime())
      ) {
        events.push({
          $id: `recurring-${rule.$id}-${currentDate.getTime()}`,
          description: rule.name || rule.description || "recurring.payment",
          amount: rule.amount,
          type: rule.type,
          date: new Date(currentDate).toISOString(),
          category: rule.category,
          account: rule.account,
          isRecurring: true,
          ruleId: rule.$id,
          status: "projected",
        });
      }

      // Advance date based on frequency
      switch (rule.frequency) {
        case "daily":
          currentDate = addDays(currentDate, rule.interval || 1);
          break;
        case "weekly":
          currentDate = addWeeks(currentDate, rule.interval || 1);
          break;
        case "monthly":
          currentDate = addMonths(currentDate, rule.interval || 1);
          break;
        case "yearly":
          currentDate = addYears(currentDate, rule.interval || 1);
          break;
        default:
          // Unknown frequency, break loop
          iterations = MAX_ITERATIONS + 1;
          break;
      }
    }
  });

  return events;
};

/**
 * Generate MSI events based on transactions with installments
 * @param {Array} transactions - Array of transactions (should include past transactions if possible)
 * @param {Date} startDate - Start of the visible range
 * @param {Date} endDate - End of the visible range
 * @returns {Array} Array of projected MSI installment objects
 */
export const generateMSIEvents = (transactions, startDate, endDate) => {
  if (!transactions || !Array.isArray(transactions)) return [];

  const events = [];
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  transactions.forEach((tx) => {
    // Check if transaction has installments
    if (!tx.installments || tx.installments <= 1) return;

    // We need to calculate future dates.
    // Assuming monthly installments.
    // Logic similar to msiUtils but generating events.

    const txDate = new Date(tx.date);
    const billingDay = tx.account?.billingDay || txDate.getDate(); // Fallback to transaction day if no billing day

    // Calculate first installment date (usually the transaction date or next billing date)
    // If it's "Meses Sin Intereses", usually the first charge is on the transaction date,
    // or it starts appearing on the credit card statement.
    // Let's assume the first installment is the transaction itself (which is already in the calendar if in range).
    // We need to generate installments 2 to N.

    let installmentDate = new Date(txDate);
    // Align to billing day for subsequent months?
    // Usually MSI charges appear on the cut-off date or the transaction day of subsequent months.
    // Let's assume transaction day of subsequent months for simplicity, or billing day if provided.

    // If we use billing day logic:
    // First billing date:
    let nextDate = new Date(txDate);

    for (let i = 1; i < tx.installments; i++) {
      // Advance one month
      nextDate = addMonths(nextDate, 1);

      // If we want to align to billing day (optional, depends on user preference)
      // nextDate.setDate(billingDay);

      // Check if this installment is within the view range
      if (
        (isAfter(nextDate, start) || nextDate.getTime() === start.getTime()) &&
        (isBefore(nextDate, end) || nextDate.getTime() === end.getTime())
      ) {
        events.push({
          $id: `msi-${tx.$id}-${i + 1}`,
          description: `${tx.description} (${i + 1}/${tx.installments})`,
          amount: tx.amount / tx.installments,
          type: tx.type,
          date: new Date(nextDate).toISOString(),
          category: tx.category,
          account: tx.account,
          isMSI: true,
          originalTransactionId: tx.$id,
          installmentNumber: i + 1,
          totalInstallments: tx.installments,
          status: "projected",
        });
      }
    }
  });

  return events;
};
