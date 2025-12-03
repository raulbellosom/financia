import { createContext, useContext, useState, useEffect } from 'react';
import { account, databases } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const { data: user, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      try {
        return await account.get();
      } catch (error) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 15, // 15 min
  });

  const { data: userInfo, isLoading: userInfoLoading, refetch: refetchUserInfo } = useQuery({
    queryKey: ['userInfo', user?.$id],
    queryFn: async () => {
      if (!user) return null;
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_APPWRITE_USERS_INFO_COLLECTION_ID,
        [Query.equal('authUserId', user.$id)]
      );
      if (response.documents.length > 0) {
        return response.documents[0];
      }
      return null;
    },
    enabled: !!user,
  });

  // Mutation to create user info if missing
  const createUserInfoMutation = useMutation({
    mutationFn: async (userData) => {
      return await databases.createDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_APPWRITE_USERS_INFO_COLLECTION_ID,
        ID.unique(),
        {
          authUserId: userData.$id,
          country: 'MX',
          defaultCurrency: 'MXN',
          language: 'es-MX',
          onboardingDone: false,
          role: 'user',
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userInfo']);
    },
  });

  useEffect(() => {
    if (user && !userInfo && !userInfoLoading) {
      // Only create if we have a user, but no userInfo, and we finished loading userInfo
      // We also need to check if we already tried to create it to avoid loops, 
      // but React Query's dedupe helps. 
      // To be safe, we can check if the query actually returned null (meaning not found)
      // The queryFn returns null if not found.
      createUserInfoMutation.mutate(user);
    }
  }, [user, userInfo, userInfoLoading]);

  const login = async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password);
      await refetchUser();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      await account.create(ID.unique(), email, password, name);
      await login(email, password);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      queryClient.setQueryData(['auth'], null);
      queryClient.setQueryData(['userInfo', user?.$id], null);
    } catch (error) {
      console.error(error);
    }
  };

  const loading = userLoading || userInfoLoading;

  const value = {
    user,
    userInfo,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <div className="flex items-center justify-center h-screen bg-black text-white">Loading...</div>}
    </AuthContext.Provider>
  );
};
