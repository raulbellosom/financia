import { format } from "date-fns";

/**
 * Convert transactions to calendar events
 * @param {Array} transactions - Array of transaction objects
 * @returns {Array} Array of calendar event objects
 */
export const transactionsToEvents = (transactions) => {
  if (!transactions || !Array.isArray(transactions)) return [];

  return transactions.map((transaction) => ({
    id: transaction.$id,
    title: transaction.description || "Untitled",
    start: new Date(transaction.date),
    end: new Date(transaction.date),
    allDay: true,
    resource: {
      ...transaction,
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      account: transaction.account,
      isDraft: transaction.isDraft,
      origin: transaction.origin,
    },
  }));
};

/**
 * Get custom event style based on transaction type
 * @param {Object} event - Calendar event object
 * @returns {Object} Style object for the event
 */
export const getEventStyle = (event) => {
  const { type, isDraft, isRecurring, isMSI } = event.resource;

  const baseStyle = {
    borderRadius: "6px",
    border: "none",
    fontSize: "0.75rem",
    padding: "2px 4px",
    opacity: isDraft ? 0.6 : 1,
  };

  // Special styling for projected events
  if (isRecurring || isMSI) {
    baseStyle.opacity = 0.9;
    baseStyle.border = "1px dashed rgba(255,255,255,0.2)";
  }

  switch (type) {
    case "income":
      return {
        ...baseStyle,
        backgroundColor: "#3b82f6", // Blue 500
        color: "#ffffff",
      };
    case "expense":
      return {
        ...baseStyle,
        backgroundColor: "#ef4444", // Red 500
        color: "#ffffff",
      };
    case "transfer":
      return {
        ...baseStyle,
        backgroundColor: "#6366f1", // Indigo 500
        color: "#ffffff",
      };
    default:
      return {
        ...baseStyle,
        backgroundColor: "#71717a",
        color: "#ffffff",
      };
  }
};

/**
 * Get default calendar view based on screen size
 * @returns {string} View name (month, week, day, agenda)
 */
export const getDefaultView = () => {
  const width = window.innerWidth;

  if (width < 768) {
    return "agenda"; // Mobile
  } else if (width < 1024) {
    return "week"; // Tablet
  } else {
    return "month"; // Desktop
  }
};

/**
 * Format event title for calendar display
 * @param {Object} event - Calendar event object
 * @param {string} locale - Locale for formatting (default: 'es-MX')
 * @returns {string} Formatted event title
 */
export const formatEventTitle = (event, locale = "es-MX") => {
  const { description, amount, type } = event.resource;
  const sign = type === "income" ? "+" : "-";
  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${description || "Untitled"} (${sign}$${formattedAmount})`;
};

/**
 * Get calendar messages for localization
 * @param {Function} t - Translation function
 * @returns {Object} Messages object for react-big-calendar
 */
export const getCalendarMessages = (t) => ({
  allDay: t("calendar.allDay") || "All Day",
  previous: t("calendar.previous") || "Previous",
  next: t("calendar.next") || "Next",
  today: t("calendar.today") || "Today",
  month: t("calendar.views.month") || "Month",
  week: t("calendar.views.week") || "Week",
  day: t("calendar.views.day") || "Day",
  agenda: t("calendar.views.agenda") || "Agenda",
  date: t("calendar.date") || "Date",
  time: t("calendar.time") || "Time",
  event: t("calendar.event") || "Event",
  noEventsInRange: t("calendar.noEvents") || "No transactions for this period",
  showMore: (total) => `+${total} more`,
});

/**
 * Calculate visible date range based on calendar view
 * @param {Date} date - Current calendar date
 * @param {string} view - Current view (month, week, day, agenda)
 * @returns {Object} Object with startDate and endDate
 */
export const getVisibleDateRange = (date, view) => {
  const currentDate = new Date(date);
  let startDate, endDate;

  switch (view) {
    case "month":
      startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );
      break;

    case "week":
      const dayOfWeek = currentDate.getDay();
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - dayOfWeek);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;

    case "day":
      startDate = new Date(currentDate);
      endDate = new Date(currentDate);
      break;

    case "agenda":
      startDate = new Date(currentDate);
      endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 1);
      break;

    default:
      startDate = new Date(currentDate);
      endDate = new Date(currentDate);
  }

  // Set time to start and end of day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, locale = "es-MX") => {
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
