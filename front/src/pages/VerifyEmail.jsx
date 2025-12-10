import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client, { account } from "../lib/appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { Button } from "../components/ui/Button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState("verifying"); // verifying, success, error

  useEffect(() => {
    const userId = searchParams.get("userId");

    if (!userId) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const emailServerUrl =
          import.meta.env.VITE_EMAIL_SERVER_URL || "http://localhost:3001";

        const response = await fetch(`${emailServerUrl}/verify-account`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        });

        if (response.ok) {
          setStatus("success");
        } else {
          throw new Error("Verification failed");
        }
      } catch (error) {
        console.error("Verification failed", error);
        setStatus("error");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-xl text-center space-y-6"
      >
        {status === "verifying" && (
          <>
            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-white">
              {t("auth.verifyingEmail", "Verifying Email...")}
            </h1>
            <p className="text-zinc-400">
              {t(
                "auth.pleaseWait",
                "Please wait while we verify your email address."
              )}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold text-white">
              {t("auth.emailVerified", "Email Verified!")}
            </h1>
            <p className="text-zinc-400">
              {t(
                "auth.emailVerifiedDesc",
                "Your email has been successfully verified. You can now log in."
              )}
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold"
            >
              {t("auth.goToLogin", "Go to Login")}
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-white">
              {t("auth.verificationFailed", "Verification Failed")}
            </h1>
            <p className="text-zinc-400">
              {t(
                "auth.verificationFailedDesc",
                "The verification link is invalid or has expired."
              )}
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              {t("auth.backToLogin", "Back to Login")}
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
