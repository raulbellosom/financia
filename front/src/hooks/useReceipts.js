import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client, { databases, storage } from "../lib/appwrite";
import { Query, ID } from "appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

/**
 * Hook for managing receipts and their linked transactions
 */
export const useReceipts = () => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  // Fetch receipts with polling for OCR status updates
  const receiptsQuery = useQuery({
    queryKey: ["receipts", userInfo?.$id],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECEIPTS_COLLECTION_ID,
        [
          Query.equal("profile", userInfo.$id),
          Query.equal("isDeleted", false),
          Query.orderDesc("$createdAt"),
        ]
      );
      return response.documents;
    },
    enabled: !!userInfo,
  });

  // Real-time subscription for receipt updates
  useEffect(() => {
    if (!userInfo) return;

    const channel = `databases.${APPWRITE_CONFIG.DATABASE_ID}.collections.${APPWRITE_CONFIG.RECEIPTS_COLLECTION_ID}.documents`;

    const unsubscribe = client.subscribe(channel, (response) => {
      // Check if the event is an update or create
      if (
        response.events.includes(
          "databases.*.collections.*.documents.*.update"
        ) ||
        response.events.includes("databases.*.collections.*.documents.*.create")
      ) {
        // Invalidate the query to fetch the latest data
        queryClient.invalidateQueries(["receipts", userInfo.$id]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userInfo, queryClient]);

  // Upload receipt mutation
  const uploadReceiptMutation = useMutation({
    mutationFn: async (file) => {
      // 1. Upload file to storage
      const fileResponse = await storage.createFile(
        APPWRITE_CONFIG.RECEIPTS_BUCKET_ID,
        ID.unique(),
        file
      );

      // 2. Create receipt document
      return await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECEIPTS_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          fileId: fileResponse.$id,
          status: "uploaded",
          isDeleted: false,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["receipts"]);
    },
  });

  // Delete receipt mutation
  const deleteReceiptMutation = useMutation({
    mutationFn: async (receipt) => {
      // 1. If receipt has a linked draft transaction, delete it
      if (receipt.transaction) {
        try {
          const transaction = await databases.getDocument(
            APPWRITE_CONFIG.DATABASE_ID,
            APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
            receipt.transaction
          );

          // Only delete if it's a draft
          if (transaction.isDraft) {
            await databases.deleteDocument(
              APPWRITE_CONFIG.DATABASE_ID,
              APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
              receipt.transaction
            );
          }
        } catch (e) {
          console.warn("Transaction might already be deleted:", e);
        }
      }

      // 2. Delete file from storage
      if (receipt.fileId) {
        try {
          await storage.deleteFile(
            APPWRITE_CONFIG.RECEIPTS_BUCKET_ID,
            receipt.fileId
          );
        } catch (e) {
          console.warn("File might already be deleted:", e);
        }
      }

      // 3. Delete receipt document
      await databases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECEIPTS_COLLECTION_ID,
        receipt.$id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["receipts"]);
      queryClient.invalidateQueries(["transactions"]);
    },
  });

  // Confirm draft transaction (convert to real transaction)
  const confirmDraftMutation = useMutation({
    mutationFn: async ({ transactionId, updates }) => {
      // 1. Update the transaction
      const transaction = await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        transactionId,
        {
          ...updates,
          isDraft: false,
        }
      );

      // 2. Update Account Balance
      try {
        const accountId = updates.account || transaction.account;
        const account = await databases.getDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
          accountId
        );

        let newBalance = account.currentBalance;
        const amount = parseFloat(transaction.amount);

        if (account.type === "credit") {
          // Credit Card: Expense increases debt
          if (transaction.type === "expense") {
            newBalance += amount;
          } else if (transaction.type === "income") {
            newBalance -= amount;
          }
        } else {
          // Asset: Expense decreases balance
          if (transaction.type === "expense") {
            newBalance -= amount;
          } else if (transaction.type === "income") {
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
      queryClient.invalidateQueries(["transaction-reports"]);
      queryClient.invalidateQueries(["accounts"]);
    },
  });

  return {
    receipts: receiptsQuery.data || [],
    isLoading: receiptsQuery.isLoading,
    isError: receiptsQuery.isError,
    uploadReceipt: uploadReceiptMutation.mutateAsync,
    isUploading: uploadReceiptMutation.isPending,
    deleteReceipt: deleteReceiptMutation.mutateAsync,
    isDeleting: deleteReceiptMutation.isPending,
    confirmDraft: confirmDraftMutation.mutateAsync,
    isConfirming: confirmDraftMutation.isPending,
  };
};
