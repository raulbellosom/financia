/**
 * Report utility functions for transaction calculations and filtering
 */

/**
 * Calculate totals from transactions
 * @param {Array} transactions - Array of transactions
 * @returns {Object} { income, expenses, net, count }
 */
export const calculateTotals = (transactions) => {
  const totals = {
    income: 0,
    expenses: 0,
    net: 0,
    count: transactions.length,
  };

  transactions.forEach((tx) => {
    const amount = parseFloat(tx.amount) || 0;

    if (
      tx.type === "income" ||
      (tx.type === "transfer" && tx.transferSide === "incoming")
    ) {
      totals.income += amount;
    } else if (
      tx.type === "expense" ||
      (tx.type === "transfer" && tx.transferSide === "outgoing")
    ) {
      totals.expenses += amount;
    }
  });

  totals.net = totals.income - totals.expenses;

  return totals;
};

/**
 * Group transactions by period
 * @param {Array} transactions - Array of transactions
 * @param {string} period - Period type: 'day', 'week', 'month', 'year'
 * @returns {Object} Transactions grouped by period
 */
export const groupByPeriod = (transactions, period) => {
  const grouped = {};

  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    let key;

    switch (period) {
      case "day":
        key = date.toISOString().split("T")[0]; // YYYY-MM-DD
        break;
      case "week":
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        key = weekStart.toISOString().split("T")[0];
        break;
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
        break;
      case "year":
        key = String(date.getFullYear());
        break;
      default:
        key = date.toISOString().split("T")[0];
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(tx);
  });

  return grouped;
};

/**
 * Calculate running balance for transactions
 * @param {Array} transactions - Array of transactions (sorted by date)
 * @param {number} initialBalance - Starting balance
 * @returns {Array} Transactions with runningBalance property
 */
export const calculateRunningBalance = (transactions, initialBalance = 0) => {
  let balance = initialBalance;

  return transactions.map((tx) => {
    const amount = parseFloat(tx.amount) || 0;

    if (
      tx.type === "income" ||
      (tx.type === "transfer" && tx.transferSide === "incoming")
    ) {
      balance += amount;
    } else if (
      tx.type === "expense" ||
      (tx.type === "transfer" && tx.transferSide === "outgoing")
    ) {
      balance -= amount;
    }

    return {
      ...tx,
      runningBalance: balance,
    };
  });
};

/**
 * Filter transactions based on multiple criteria
 * @param {Array} transactions - Array of transactions
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered transactions
 */
export const filterTransactions = (transactions, filters = {}) => {
  return transactions.filter((tx) => {
    // Filter by account
    if (filters.accountId && tx.account !== filters.accountId) {
      return false;
    }

    // Filter by category
    if (filters.categoryId && tx.category !== filters.categoryId) {
      return false;
    }

    // Filter by type
    if (filters.type && tx.type !== filters.type) {
      return false;
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      const txDate = new Date(tx.date);
      if (filters.startDate && txDate < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && txDate > new Date(filters.endDate)) {
        return false;
      }
    }

    // Filter drafts
    if (!filters.includeDrafts && tx.isDraft) {
      return false;
    }

    // Filter deleted
    if (tx.isDeleted) {
      return false;
    }

    return true;
  });
};

/**
 * Format currency with locale
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (e.g., 'MXN', 'USD')
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "MXN", locale = "es-MX") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount);
};

/**
 * Get transaction summary by category
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Summary grouped by category
 */
export const getSummaryByCategory = (transactions) => {
  const summary = {};

  transactions.forEach((tx) => {
    const categoryId = tx.category || "uncategorized";
    const amount = parseFloat(tx.amount) || 0;

    if (!summary[categoryId]) {
      summary[categoryId] = {
        income: 0,
        expenses: 0,
        count: 0,
      };
    }

    if (
      tx.type === "income" ||
      (tx.type === "transfer" && tx.transferSide === "incoming")
    ) {
      summary[categoryId].income += amount;
    } else if (
      tx.type === "expense" ||
      (tx.type === "transfer" && tx.transferSide === "outgoing")
    ) {
      summary[categoryId].expenses += amount;
    }

    summary[categoryId].count += 1;
  });

  return summary;
};

/**
 * Get transaction summary by account
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Summary grouped by account
 */
export const getSummaryByAccount = (transactions) => {
  const summary = {};

  transactions.forEach((tx) => {
    const accountId = tx.account;
    const amount = parseFloat(tx.amount) || 0;

    if (!summary[accountId]) {
      summary[accountId] = {
        income: 0,
        expenses: 0,
        count: 0,
      };
    }

    if (
      tx.type === "income" ||
      (tx.type === "transfer" && tx.transferSide === "incoming")
    ) {
      summary[accountId].income += amount;
    } else if (
      tx.type === "expense" ||
      (tx.type === "transfer" && tx.transferSide === "outgoing")
    ) {
      summary[accountId].expenses += amount;
    }

    summary[accountId].count += 1;
  });

  return summary;
};
