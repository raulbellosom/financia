import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases } from "../lib/appwrite";
import { Query, ID } from "appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";

export const useAccounts = () => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ["accounts", userInfo?.$id],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
        [Query.equal("profile", userInfo.$id), Query.equal("isArchived", false)]
      );
      return response.documents;
    },
    enabled: !!userInfo,
  });

  const createAccountMutation = useMutation({
    mutationFn: async (newAccount) => {
      return await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          ...newAccount,
          currentBalance: newAccount.initialBalance,
          isArchived: false,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Remove restricted attributes that cannot be updated directly if passed
      const {
        $id,
        $createdAt,
        $updatedAt,
        $permissions,
        $databaseId,
        $collectionId,
        ...updateData
      } = data;

      return await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
        id,
        updateData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId) => {
      return await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
        accountId,
        { isArchived: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
    },
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    isError: accountsQuery.isError,
    createAccount: createAccountMutation.mutateAsync,
    isCreating: createAccountMutation.isPending,
    updateAccount: updateAccountMutation.mutateAsync,
    isUpdating: updateAccountMutation.isPending,
    deleteAccount: deleteAccountMutation.mutateAsync,
    isDeleting: deleteAccountMutation.isPending,
  };
};
