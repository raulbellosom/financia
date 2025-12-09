import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases } from "../lib/appwrite";
import { Query, ID } from "appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";

export const useRecurringRules = () => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ["recurring_rules", userInfo?.$id],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECURRING_RULES_COLLECTION_ID,
        [Query.equal("profile", userInfo.$id), Query.orderAsc("nextRun")]
      );
      return response.documents;
    },
    enabled: !!userInfo,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (newRule) => {
      return await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECURRING_RULES_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          ...newRule,
          isActive: true,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["recurring_rules"]);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
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
        APPWRITE_CONFIG.RECURRING_RULES_COLLECTION_ID,
        id,
        updateData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["recurring_rules"]);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId) => {
      return await databases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.RECURRING_RULES_COLLECTION_ID,
        ruleId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["recurring_rules"]);
    },
  });

  return {
    rules: rulesQuery.data || [],
    isLoading: rulesQuery.isLoading,
    isError: rulesQuery.isError,
    createRule: createRuleMutation.mutateAsync,
    isCreating: createRuleMutation.isPending,
    updateRule: updateRuleMutation.mutateAsync,
    isUpdating: updateRuleMutation.isPending,
    deleteRule: deleteRuleMutation.mutateAsync,
    isDeleting: deleteRuleMutation.isPending,
  };
};
