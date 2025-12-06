import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import { useAuth } from '../context/AuthContext';

export const useTransactions = (limit = 100) => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ['transactions', userInfo?.$id, limit],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_APPWRITE_TRANSACTIONS_COLLECTION_ID,
        [
          Query.equal('profile', userInfo.$id),
          Query.equal('isDeleted', false),
          Query.orderDesc('date'),
          Query.limit(limit)
        ]
      );
      return response.documents;
    },
    enabled: !!userInfo,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (newTransaction) => {
      return await databases.createDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_APPWRITE_TRANSACTIONS_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          ...newTransaction,
          isPending: false,
          isTransferLeg: false,
          isDeleted: false
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      // Also invalidate accounts if balances changed (logic to be added later)
      queryClient.invalidateQueries(['accounts']);
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
