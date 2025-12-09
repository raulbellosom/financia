import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases } from "../lib/appwrite";
import { Query, ID } from "appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";

export const useTransactions = (limit = 100) => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ["transactions", userInfo?.$id, limit],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        [
          Query.equal("profile", userInfo.$id),
          Query.equal("isDeleted", false),
          Query.orderDesc("date"),
          Query.limit(limit),
        ]
      );
      return response.documents;
    },
    enabled: !!userInfo,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (newTransaction) => {
      // 1. Create the transaction
      const transaction = await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          isDraft: false,
          origin: "manual",
          ...newTransaction,
          isPending: false,
          isTransferLeg: false,
          isDeleted: false,
        }
      );

      // 2. Update Account Balance
      try {
        const accountId = newTransaction.account;
        const account = await databases.getDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
          accountId
        );

        let newBalance = account.currentBalance;
        const amount = parseFloat(newTransaction.amount);

        if (account.type === "credit") {
          // Credit Card Logic:
          // Expense -> Increases Debt (Balance + Amount)
          // Income (Payment) -> Decreases Debt (Balance - Amount)
          if (newTransaction.type === "expense") {
            newBalance += amount;
          } else if (newTransaction.type === "income") {
            newBalance -= amount;
          }
        } else {
          // Asset Logic (Cash, Debit, etc.):
          // Expense -> Decreases Asset (Balance - Amount)
          // Income -> Increases Asset (Balance + Amount)
          if (newTransaction.type === "expense") {
            newBalance -= amount;
          } else if (newTransaction.type === "income") {
            newBalance += amount;
          }
        }

        await databases.updateDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
          accountId,
          {
            currentBalance: newBalance,
          }
        );
      } catch (error) {
        console.error("Error updating account balance:", error);
      }

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["transactions"]);
      queryClient.invalidateQueries(["accounts"]);
    },
  });

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    isError: transactionsQuery.isError,
    createTransaction: createTransactionMutation.mutateAsync,
    isCreating: createTransactionMutation.isPending,
  };
};
