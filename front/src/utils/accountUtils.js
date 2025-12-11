/**
 * Formats the account label for select options.
 * Includes name, last 4 digits (if available), and current balance.
 * For credit cards, positive balance (debt) is displayed as negative.
 *
 * @param {Object} account - The account object.
 * @returns {string} The formatted label.
 */
export const formatAccountLabel = (account) => {
  if (!account) return "";

  const { name, cardLast4, currentBalance, type, currency } = account;
  const balance = parseFloat(currentBalance || 0);

  let displayBalance = balance;

  // For credit cards, a positive balance usually represents debt in this system.
  // We display it as negative to indicate liability to the user.
  if (type === "credit" && balance > 0) {
    displayBalance = -balance;
  }

  const formattedBalance = displayBalance.toLocaleString("es-MX", {
    style: "currency",
    currency: currency || "MXN",
    minimumFractionDigits: 2,
  });

  let label = name;
  if (cardLast4) {
    label += ` (**** ${cardLast4})`;
  }

  label += ` - ${formattedBalance}`;

  return label;
};
