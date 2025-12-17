import { createContext, useContext, useEffect } from "react";
import client, { account, databases } from "../lib/appwrite";
import { ID, Query } from "appwrite";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { APPWRITE_CONFIG } from "../lib/constants";
import i18n from "../i18n";

import LoadingSpinner from "../components/ui/LoadingSpinner";

const AuthContext = createContext({
  user: null,
  userInfo: null,
  loading: true,
  userInfoLoading: true,
  login: async () => ({ success: false, errorKey: "auth.errorLogin" }),
  register: async () => ({ success: false, errorKey: "auth.errorRegister" }),
  logout: async () => {},
  changeUserLanguage: async () => {},
});

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
        const doc = response.documents[0];
        // Fix invalid timezone if present (e.g. "Central Standard Time (Mexico)")
        // We want IANA format like "America/Mexico_City"
        if (
          doc.timezone &&
          (doc.timezone.includes("Standard Time") ||
            doc.timezone.includes("Daylight Time"))
        ) {
          try {
            const correctTimezone =
              Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (correctTimezone !== doc.timezone) {
              await databases.updateDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID,
                doc.$id,
                { timezone: correctTimezone }
              );
              doc.timezone = correctTimezone;
            }
          } catch (e) {
            console.warn("Could not auto-fix timezone", e);
          }
        }
        return doc;
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

  // Hard-block access if profile is missing or email is not verified.
  useEffect(() => {
    const enforceVerification = async () => {
      if (!user || userInfoLoading) return;

      const isVerified = userInfo?.verified_email === true;
      if (!isVerified) {
        try {
          // If profile is missing, trigger a repair on the backend (email-server)
          if (!userInfo) {
            const emailServerUrl =
              import.meta.env.VITE_EMAIL_SERVER_URL || "http://localhost:3001";
            const lang = i18n.language || "es";
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            await fetch(`${emailServerUrl}/ensure-user-info-on-login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                authUserId: user.$id,
                lang,
                timezone,
              }),
            }).catch(() => {
              // ignore
            });
          }
        } finally {
          try {
            await account.deleteSession("current");
          } catch {
            // ignore
          }
          queryClient.setQueryData(["auth"], null);
          queryClient.setQueryData(["userInfo", user?.$id], null);
        }
      }
    };

    enforceVerification();
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
      const authedUser = await account.get();

      const emailServerUrl =
        import.meta.env.VITE_EMAIL_SERVER_URL || "http://localhost:3001";
      const lang = i18n.language || "es";
      let verificationLink = `${window.location.origin}/verify-email?userId=${authedUser.$id}`;
      let userInfoId;

      // Check verified_email in users_info
      try {
        const response = await databases.listDocuments(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID,
          [Query.equal("authUserId", authedUser.$id)]
        );

        if (response.documents.length === 0) {
          // Profile missing -> trigger repair and block
          const ensureRes = await fetch(
            `${emailServerUrl}/ensure-user-info-on-login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                authUserId: authedUser.$id,
                lang,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }),
            }
          ).catch(() => {
            // ignore
          });

          if (ensureRes?.ok) {
            try {
              const json = await ensureRes.json();
              if (json?.id) {
                userInfoId = json.id;
                verificationLink = `${window.location.origin}/verify-email?userInfoId=${json.id}`;
              }
            } catch {
              // ignore
            }
          }

          await account.deleteSession("current");
          return {
            success: false,
            errorKey: "auth.emailNotVerified",
            verification: {
              userId: authedUser.$id,
              userInfoId,
              email: authedUser.email,
              name: authedUser.name,
              verificationLink,
            },
          };
        }

        const userInfoDoc = response.documents[0];
        userInfoId = userInfoDoc?.$id;
        if (userInfoId) {
          verificationLink = `${window.location.origin}/verify-email?userInfoId=${userInfoId}`;
        }
        if (userInfoDoc?.verified_email !== true) {
          await account.deleteSession("current");
          return {
            success: false,
            errorKey: "auth.emailNotVerified",
            verification: {
              userId: authedUser.$id,
              userInfoId,
              email: authedUser.email,
              name: authedUser.name,
              verificationLink,
            },
          };
        }
      } catch (dbError) {
        console.error("Failed to check verification status", dbError);
        // If we can't verify, do not allow login (business rule).
        try {
          await account.deleteSession("current");
        } catch {
          // ignore
        }
        return {
          success: false,
          errorKey: "auth.errorLogin",
        };
      }

      await refetchUser();
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === 429) {
        return {
          success: false,
          errorKey: "auth.rateLimitExceeded",
        };
      }

      if (error?.type === "user_invalid_credentials" || error?.code === 401) {
        return {
          success: false,
          errorKey: "auth.invalidCredentials",
        };
      }

      return { success: false, errorKey: "auth.errorLogin" };
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
        // Get user timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const createdUserInfo = await databases.createDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID,
          ID.unique(),
          {
            authUserId: userId,
            email: email, // Save email to users_info as requested
            country: "MX",
            defaultCurrency: "MXN",
            language: i18n.language || "es-MX",
            onboardingDone: false,
            role: "user",
            verified_email: false,
            verified_phone: false,
            firstName: firstName,
            lastName: lastName,
            timezone: timezone, // Save IANA timezone (e.g., "America/Mexico_City")
          }
        );

        // Send verification email via custom server
        try {
          const emailServerUrl =
            import.meta.env.VITE_EMAIL_SERVER_URL || "http://localhost:3001";
          const verificationLink = `${window.location.origin}/verify-email?userInfoId=${createdUserInfo.$id}`;
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
          // Don't block registration success if email fails
        }
      } catch (dbError) {
        console.error("Failed to create user info document", dbError);
        // If this fails, login might fail later. But we proceed.
      }

      await account.deleteSession("current");
      return { success: true, requireVerification: true, userId };
    } catch (error) {
      if (error?.code === 409) {
        return {
          success: false,
          errorKey: "auth.userAlreadyExists",
          code: 409,
        };
      }

      return {
        success: false,
        errorKey: "auth.errorRegister",
        code: error?.code,
      };
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
    userInfoLoading,
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
