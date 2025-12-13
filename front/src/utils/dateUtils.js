/**
 * Date utility functions for period calculations and formatting
 */

/**
 * Get the start of a period (day, week, month, year)
 * @param {Date} date - Reference date
 * @param {string} period - Period type: 'day', 'week', 'month', 'year'
 * @returns {Date} Start of the period
 */
export const getStartOfPeriod = (date, period) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  switch (period) {
    case "day":
      return d;
    case "week":
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
      d.setDate(diff);
      return d;
    case "month":
      d.setDate(1);
      return d;
    case "year":
      d.setMonth(0, 1);
      return d;
    default:
      return d;
  }
};

/**
 * Get the end of a period (day, week, month, year)
 * @param {Date} date - Reference date
 * @param {string} period - Period type: 'day', 'week', 'month', 'year'
 * @returns {Date} End of the period
 */
export const getEndOfPeriod = (date, period) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);

  switch (period) {
    case "day":
      return d;
    case "week":
      const day = d.getDay();
      const diff = d.getDate() + (day === 0 ? 0 : 7 - day);
      d.setDate(diff);
      return d;
    case "month":
      d.setMonth(d.getMonth() + 1, 0);
      return d;
    case "year":
      d.setMonth(11, 31);
      return d;
    default:
      return d;
  }
};

/**
 * Get the previous period range
 * @param {Date} startDate - Current period start
 * @param {Date} endDate - Current period end
 * @returns {Object} { startDate, endDate } for previous period
 */
export const getPreviousPeriod = (startDate, endDate) => {
  const duration = endDate - startDate;
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { startDate: prevStart, endDate: prevEnd };
};

/**
 * Get the next period range
 * @param {Date} startDate - Current period start
 * @param {Date} endDate - Current period end
 * @returns {Object} { startDate, endDate } for next period
 */
export const getNextPeriod = (startDate, endDate) => {
  const duration = endDate - startDate;
  const nextStart = new Date(endDate.getTime() + 1);
  const nextEnd = new Date(nextStart.getTime() + duration);
  return { startDate: nextStart, endDate: nextEnd };
};

/**
 * Format a period label for display
 * @param {Date} startDate - Period start
 * @param {Date} endDate - Period end
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted period label
 */
export const formatPeriodLabel = (startDate, endDate, locale = "es-MX") => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options = { timeZone: "UTC" };

  // Same day
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...options,
    });
  }

  // Same month
  if (
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear()
  ) {
    return start.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
      ...options,
    });
  }

  // Same year
  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${start.toLocaleDateString(locale, {
      month: "short",
      ...options,
    })} - ${end.toLocaleDateString(locale, {
      month: "short",
      year: "numeric",
      ...options,
    })}`;
  }

  // Different years
  return `${start.toLocaleDateString(locale, {
    month: "short",
    year: "numeric",
    ...options,
  })} - ${end.toLocaleDateString(locale, {
    month: "short",
    year: "numeric",
    ...options,
  })}`;
};

/**
 * Group transactions by date
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Transactions grouped by date string (YYYY-MM-DD)
 */
export const groupTransactionsByDate = (transactions) => {
  const grouped = {};

  transactions.forEach((tx) => {
    // Use UTC date for grouping to avoid timezone shifts
    const date = new Date(tx.date);
    // Get UTC YYYY-MM-DD
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(tx);
  });

  return grouped;
};

/**
 * Get quick period presets
 * @returns {Object} Period presets with start and end dates
 */
export const getQuickPeriods = () => {
  const now = new Date();

  return {
    today: {
      startDate: getStartOfPeriod(now, "day"),
      endDate: getEndOfPeriod(now, "day"),
    },
    thisWeek: {
      startDate: getStartOfPeriod(now, "week"),
      endDate: getEndOfPeriod(now, "week"),
    },
    thisMonth: {
      startDate: getStartOfPeriod(now, "month"),
      endDate: getEndOfPeriod(now, "month"),
    },
    thisYear: {
      startDate: getStartOfPeriod(now, "year"),
      endDate: getEndOfPeriod(now, "year"),
    },
  };
};

/**
 * Check if a date is within a range
 * @param {Date} date - Date to check
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {boolean} True if date is within range
 */
export const isDateInRange = (date, startDate, endDate) => {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return d >= start && d <= end;
};

/**
 * Get the current date (YYYY-MM-DD) in a specific timezone
 * @param {string} timezone - Timezone string (e.g., 'America/Mexico_City')
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getTodayInTimezone = (timezone) => {
  try {
    // If timezone is provided, use it. Otherwise, use system timezone.
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };

    if (timezone) {
      options.timeZone = timezone;
    }

    // en-CA locale uses YYYY-MM-DD format
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    return formatter.format(new Date());
  } catch (e) {
    console.warn("Error formatting date with timezone:", timezone, e);
    // Fallback to local time YYYY-MM-DD
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
};
