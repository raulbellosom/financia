import { useTranslation } from "react-i18next";

export const useDateFormatter = () => {
  const { i18n } = useTranslation();

  const formatDate = (dateString, options = {}) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const locale = i18n.language === "es" ? "es-ES" : "en-US";

    // Default options can be overridden
    const defaultOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...options,
    };

    return date.toLocaleDateString(locale, defaultOptions);
  };

  return { formatDate };
};
