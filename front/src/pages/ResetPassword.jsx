import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import Logo from "../components/Logo";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("auth.passwordsDoNotMatch", "Passwords do not match"));
      return;
    }

    setLoading(true);
    try {
      const emailServerUrl =
        import.meta.env.VITE_EMAIL_SERVER_URL || "http://localhost:3001";

      const response = await fetch(`${emailServerUrl}/reset-password-confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          t("auth.passwordResetSuccess", "Password reset successfully")
        );
        navigate("/login");
      } else {
        toast.error(
          data.error || t("auth.passwordResetError", "Failed to reset password")
        );
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">{t("common.error")}</h1>
          <p className="text-zinc-400">
            {t("auth.invalidToken", "Invalid or missing token")}
          </p>
          <Button
            className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold"
            onClick={() => navigate("/login")}
          >
            {t("auth.backToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 mb-4"
          >
            <Logo className="w-full h-full" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {t("auth.resetPassword")}
          </h1>
          <p className="text-zinc-400">
            {t("auth.enterNewPassword", "Enter your new password")}
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="space-y-6 bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-xl"
        >
          <Input
            label={t("auth.newPassword", "New Password")}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          <Input
            label={t("auth.confirmPassword", "Confirm Password")}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />

          <Button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold"
            isLoading={loading}
          >
            {t("auth.resetPassword")}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
}
