import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage } from "../lib/appwrite";
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
    refetchInterval: (data) => {
      // Poll every 5 seconds if there are processing receipts
      if (!data || !Array.isArray(data)) return false;
      const hasProcessing = data.some(
        (r) => r.status === "uploaded" || r.status === "processing"
      );
      return hasProcessing ? 5000 : false;
    },
  });

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
      return await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        transactionId,
        {
          ...updates,
          isDraft: false,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["transactions"]);
      queryClient.invalidateQueries(["transaction-reports"]);
      queryClient.invalidateQueries(["accounts"]); // Balance might change
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
