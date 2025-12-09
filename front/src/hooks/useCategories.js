import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases } from "../lib/appwrite";
import { Query, ID } from "appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";

export const useCategories = () => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories", userInfo?.$id],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.CATEGORIES_COLLECTION_ID,
        [
          Query.equal("profile", userInfo.$id),
          Query.equal("isEnabled", true),
          Query.orderAsc("sortOrder"),
        ]
      );
      return response.documents;
    },
    enabled: !!userInfo,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (newCategory) => {
      return await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.CATEGORIES_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          ...newCategory,
          isEnabled: true,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
    },
  });

  const updateCategoryMutation = useMutation({
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
        APPWRITE_CONFIG.CATEGORIES_COLLECTION_ID,
        id,
        updateData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId) => {
      return await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.CATEGORIES_COLLECTION_ID,
        categoryId,
        { isEnabled: false }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
    },
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    createCategory: createCategoryMutation.mutateAsync,
    isCreating: createCategoryMutation.isPending,
    updateCategory: updateCategoryMutation.mutateAsync,
    isUpdating: updateCategoryMutation.isPending,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isDeleting: deleteCategoryMutation.isPending,
  };
};
