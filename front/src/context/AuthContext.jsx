import { createContext, useContext, useEffect } from "react";
import { account, databases } from "../lib/appwrite";
import { ID, Query } from "appwrite";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { APPWRITE_CONFIG } from "../lib/constants";
import i18n from "../i18n";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const {
    data: user,
    isLoading: userLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      try {
        return await account.get();
      } catch (error) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 15, // 15 min
  });

  const { data: userInfo, isLoading: userInfoLoading } = useQuery({
    queryKey: ["userInfo", user?.$id],
    queryFn: async () => {
      if (!user) return null;
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID,
        [Query.equal("authUserId", user.$id)]
      );
      if (response.documents.length > 0) {
        return response.documents[0];
      }
      return null;
    },
    enabled: !!user,
  });

  // Sync language from DB to i18n
  useEffect(() => {
    if (userInfo?.language) {
      const langCode = userInfo.language.split("-")[0]; // simple 'es' or 'en'
      if (i18n.language !== langCode) {
        i18n.changeLanguage(langCode);
      }
    }
  }, [userInfo]);

  // Mutation to create user info if missing
  const createUserInfoMutation = useMutation({
    mutationFn: async (userData) => {
      return await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID,
        ID.unique(),
        {
          authUserId: userData.$id,
          country: "MX",
          defaultCurrency: "MXN",
          language: "es-MX",
          onboardingDone: false,
          role: "user",
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["userInfo"]);
    },
  });

  useEffect(() => {
    if (user && !userInfo && !userInfoLoading) {
      createUserInfoMutation.mutate(user);
    }
  }, [user, userInfo, userInfoLoading]);

  const changeUserLanguage = async (langCode) => {
    // 1. Change local
    i18n.changeLanguage(langCode);

    // 2. Update DB if logged in and profile exists
    if (userInfo) {
      try {
        await databases.updateDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID,
          userInfo.$id,
          {
            language: langCode, // saving 'en' or 'es' directly now for simplicity
          }
        );
        queryClient.invalidateQueries(["userInfo"]);
      } catch (error) {
        console.error("Failed to persist language preference", error);
      }
    }
  };

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
      await account.deleteSession("current");
      queryClient.setQueryData(["auth"], null);
      queryClient.setQueryData(["userInfo", user?.$id], null);
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
    changeUserLanguage,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? (
        children
      ) : (
        <div className="flex items-center justify-center h-screen bg-black text-white">
          Loading...
        </div>
      )}
    </AuthContext.Provider>
  );
};
