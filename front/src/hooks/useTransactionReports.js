import { useQuery } from "@tanstack/react-query";
import { databases } from "../lib/appwrite";
import { Query } from "appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import {
  calculateTotals,
  filterTransactions,
  groupByPeriod,
} from "../utils/reportUtils";
import { isDateInRange } from "../utils/dateUtils";

/**
 * Hook for transaction reports and analytics
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Start date for filtering
 * @param {Date} options.endDate - End date for filtering
 * @param {string} options.accountId - Filter by account ID (optional)
 * @param {string} options.categoryId - Filter by category ID (optional)
 * @param {string} options.type - Filter by type: income, expense, transfer (optional)
 * @param {boolean} options.includeDrafts - Include draft transactions (default: false)
 * @param {string} options.groupBy - Group by period: day, week, month, year (optional)
 * @returns {Object} Report data and status
 */
export const useTransactionReports = ({
  startDate,
  endDate,
  accountId = null,
  categoryId = null,
  type = null,
  includeDrafts = false,
  groupBy = null,
} = {}) => {
  const { userInfo } = useAuth();

  const reportsQuery = useQuery({
    queryKey: [
      "transaction-reports",
      userInfo?.$id,
      startDate?.toISOString(),
      endDate?.toISOString(),
      accountId,
      categoryId,
      type,
      includeDrafts,
      groupBy,
    ],
    queryFn: async () => {
      if (!userInfo) return null;

      // Build Appwrite queries
      const queries = [
        Query.equal("profile", userInfo.$id),
        Query.equal("isDeleted", false),
        Query.orderDesc("date"),
        Query.limit(5000), // High limit for comprehensive reports
      ];

      // Add draft filter if not including drafts
      if (!includeDrafts) {
        queries.push(Query.equal("isDraft", false));
      }

      // Add account filter if specified
      if (accountId) {
        queries.push(Query.equal("account", accountId));
      }

      // Add category filter if specified
      if (categoryId) {
        queries.push(Query.equal("category", categoryId));
      }

      // Add type filter if specified
      if (type) {
        queries.push(Query.equal("type", type));
      }

      // Fetch transactions
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        queries
      );

      let transactions = response.documents;

      // Client-side date filtering (more flexible than Appwrite date queries)
      if (startDate || endDate) {
        transactions = transactions.filter((tx) => {
          if (!startDate && !endDate) return true;
          if (!startDate) return new Date(tx.date) <= endDate;
          if (!endDate) return new Date(tx.date) >= startDate;
          return isDateInRange(tx.date, startDate, endDate);
        });
      }

      // Calculate totals
      const totals = calculateTotals(transactions);

      // Group by period if specified
      const groupedData = groupBy ? groupByPeriod(transactions, groupBy) : null;

      return {
        transactions,
        totals,
        groupedData,
      };
    },
    enabled: !!userInfo,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    transactions: reportsQuery.data?.transactions || [],
    totals: reportsQuery.data?.totals || {
      income: 0,
      expenses: 0,
      net: 0,
      count: 0,
    },
    groupedData: reportsQuery.data?.groupedData || null,
    isLoading: reportsQuery.isLoading,
    isError: reportsQuery.isError,
    error: reportsQuery.error,
  };
};
