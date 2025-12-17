import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases } from "../lib/appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { Query, ID } from "appwrite";
import { useAuth } from "../context/AuthContext";

export const useInstallmentPlans = () => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ["installmentPlans", userInfo?.$id],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        [
          Query.equal("profile", userInfo.$id),
          Query.equal("isDeleted", false),
          Query.greaterThan("installments", 1),
          // We can assume active if installmentsPaid < installments
          // Ideally sort by date
          Query.orderDesc("date"),
        ]
      );
      // Filter out completed plans if desired, or handle in UI
      // For now, return all
      return response.documents;
    },
    enabled: !!userInfo,
  });

  const createPlanMutation = useMutation({
    mutationFn: async (newPlan) => {
      // Maps Plan data to Transaction data
      return await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          account: newPlan.account,
          description: newPlan.title, // Map title to description
          amount: parseFloat(newPlan.principalAmount),
          date: newPlan.startDate,
          type: "expense", // MSI is typically an expense
          installments: parseInt(newPlan.installmentsTotal),
          installmentsPaid: parseInt(newPlan.installmentsPaid) || 0,
          isDraft: false,
          isPending: false,
          isDeleted: false,
          // currency taken from account usually, or passed
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["installmentPlans"]);
      queryClient.invalidateQueries(["transactions"]);
      queryClient.invalidateQueries(["accounts"]);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId) => {
      return await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        planId,
        { isDeleted: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["installmentPlans"]);
      queryClient.invalidateQueries(["transactions"]);
    },
  });

  return {
    plans: plansQuery.data || [],
    isLoading: plansQuery.isLoading,
    isError: plansQuery.isError,
    createPlan: createPlanMutation.mutateAsync,
    isCreating: createPlanMutation.isPending,
    deletePlan: deletePlanMutation.mutateAsync,
    isDeleting: deletePlanMutation.isPending,
  };
};
