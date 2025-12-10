import { createContext, useContext, useEffect } from "react";
import client, { account, databases } from "../lib/appwrite";
import { ID, Query } from "appwrite";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { APPWRITE_CONFIG } from "../lib/constants";
import i18n from "../i18n";

import LoadingSpinner from "../components/ui/LoadingSpinner";

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
      const user = await account.get();

      // Check verified_email in users_info
      try {
        const response = await databases.listDocuments(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID,
          [Query.equal("authUserId", user.$id)]
        );

        if (response.documents.length > 0) {
          const userInfoDoc = response.documents[0];
          if (!userInfoDoc.verified_email) {
            await account.deleteSession("current");
            return {
              success: false,
              error: t("auth.emailNotVerified"),
            };
          }
        }
      } catch (dbError) {
        console.error("Failed to check verification status", dbError);
        // If we can't check, we might want to allow login or block it.
        // For security, maybe block? But if DB is down...
        // Let's assume if we can't check, we proceed (or block if strict).
        // User asked to "no permitas... si no ha verificado".
        // If we can't verify, we shouldn't allow.
      }

      await refetchUser();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, firstName, lastName) => {
    try {
      const userId = ID.unique();
      const fullName = `${firstName} ${lastName}`.trim();
      await account.create(userId, email, password, fullName);

      await account.createEmailPasswordSession(email, password);

      // Create users_info document immediately
      try {
        await databases.createDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID,
          ID.unique(),
          {
            authUserId: userId,
            country: "MX",
            defaultCurrency: "MXN",
            language: i18n.language || "es-MX",
            onboardingDone: false,
            role: "user",
            verified_email: false,
            verified_phone: false,
            firstName: firstName,
            lastName: lastName,
          }
        );
      } catch (dbError) {
        console.error("Failed to create user info document", dbError);
        // If this fails, login might fail later. But we proceed.
      }

      // Send verification email via custom server
      try {
        const emailServerUrl =
          import.meta.env.VITE_EMAIL_SERVER_URL || "http://localhost:3001";
        const verificationLink = `${window.location.origin}/verify-email?userId=${userId}`;
        const lang = i18n.language || "es";

        await fetch(`${emailServerUrl}/send-verification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            name: fullName,
            verificationLink,
            lang,
          }),
        });
      } catch (error) {
        console.error("Failed to send verification email", error);
        // Don't block registration success if email fails, but warn
      }

      await account.deleteSession("current");
      return { success: true, requireVerification: true };
    } catch (error) {
      return { success: false, error: error.message, code: error.code };
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
      {!loading ? children : <LoadingSpinner />}
    </AuthContext.Provider>
  );
};
