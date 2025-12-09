import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Languages } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import Logo from "../components/Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

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

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "es" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4 relative">
      {/* Language Toggle - Top Right */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={toggleLanguage}
        className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"
      >
        <Languages size={20} />
        <span className="text-sm font-medium uppercase">{i18n.language}</span>
      </motion.button>

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
