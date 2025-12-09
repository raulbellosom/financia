import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Wallet } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success(t("auth.successLogin"));
      navigate("/");
    } else {
      toast.error(result.error || t("auth.errorLogin"));
    }
  };

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
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4"
          >
            <Wallet className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {t("auth.welcomeBack")}
          </h1>
          <p className="text-zinc-400">{t("auth.enterCredentials")}</p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="space-y-6 bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-xl"
        >
          <Input
            label={t("auth.email")}
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label={t("auth.password")}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold"
            isLoading={loading}
          >
            {t("auth.signIn")}
          </Button>

          <p className="text-center text-sm text-zinc-400">
            {t("auth.dontHaveAccount")}{" "}
            <Link
              to="/register"
              className="font-medium text-emerald-500 hover:text-emerald-400"
            >
              {t("auth.signUp")}
            </Link>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
