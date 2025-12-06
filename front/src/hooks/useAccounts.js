import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import { APPWRITE_CONFIG } from '../lib/constants';
import { useAuth } from '../context/AuthContext';

export const useAccounts = () => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['accounts', userInfo?.$id],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
        [Query.equal('profile', userInfo.$id), Query.equal('isArchived', false)]
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
          isArchived: false
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
    },
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    isError: accountsQuery.isError,
    createAccount: createAccountMutation.mutateAsync,
    isCreating: createAccountMutation.isPending,
  };
};
