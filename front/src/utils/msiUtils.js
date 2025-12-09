/**
 * Calculates the status of a transaction with installments (MSI)
 * @param {Object} transaction - The transaction object
 * @param {Object} account - The account object (needed for billingDay)
 * @returns {Object} Status details
 */
export const calculateInstallmentStatus = (transaction, account) => {
  if (!transaction.installments || transaction.installments <= 1) {
    return null;
  }

  if (!account || !account.billingDay) {
    return {
      currentInstallment: 1,
      totalInstallments: transaction.installments,
      monthlyAmount: transaction.amount / transaction.installments,
      paidAmount: 0,
      remainingAmount: transaction.amount,
      isPaidOff: false,
    };
  }

  const txDate = new Date(transaction.date);
  const today = new Date();
  const billingDay = account.billingDay;
  const totalInstallments = transaction.installments;
  const monthlyAmount = transaction.amount / totalInstallments;

  // Calculate the first billing date (cut-off date) for this transaction
  let firstBillingDate = new Date(
    txDate.getFullYear(),
    txDate.getMonth(),
    billingDay
  );

  // If transaction was made after the billing day, it goes to the next month's cut-off
  if (txDate.getDate() > billingDay) {
    firstBillingDate.setMonth(firstBillingDate.getMonth() + 1);
  }

  // Set to end of day to be safe
  firstBillingDate.setHours(23, 59, 59, 999);

  // Calculate how many billing cycles have passed
  let installmentsPassed = 0;

  // Clone date for iteration
  let checkDate = new Date(firstBillingDate);

  // If today is before the first billing date, no installments have "cut" yet.
  // But usually we consider the first one as "current" or "pending".

  // Let's count how many cut-off dates have passed strictly before today
  // Example: Cut-off 15th. Bought 10th. Today 12th. Passed = 0. Current = 1.
  // Example: Cut-off 15th. Bought 10th. Today 16th. Passed = 1. Current = 2.

  while (checkDate < today && installmentsPassed < totalInstallments) {
    installmentsPassed++;
    checkDate.setMonth(checkDate.getMonth() + 1);
    // Handle month rollover edge cases (like Feb 30 -> Mar 2) if needed,
    // but for billing day logic usually we stick to the day.
    // Re-setting the day ensures we stay on the billing day.
    checkDate.setDate(billingDay);
  }

  // The "current" installment is the one we are paying now.
  // If 0 passed, we are on installment 1.
  // If 1 passed, we are on installment 2.
  let currentInstallment = installmentsPassed + 1;

  if (currentInstallment > totalInstallments) {
    currentInstallment = totalInstallments;
  }

  const isPaidOff = installmentsPassed >= totalInstallments;
  const paidAmount = installmentsPassed * monthlyAmount;
  const remainingAmount = transaction.amount - paidAmount;

  return {
    currentInstallment,
    totalInstallments,
    monthlyAmount,
    paidAmount,
    remainingAmount,
    isPaidOff,
    installmentsPassed,
  };
};
