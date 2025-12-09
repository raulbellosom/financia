import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/Button";
import { Ghost, Home, LogIn } from "lucide-react";

const NotFound = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleNavigation = () => {
    if (user) {
      navigate("/");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
      <div className="text-center space-y-8 max-w-lg">
        <div className="relative flex justify-center">
          <h1 className="text-9xl font-bold text-zinc-900 select-none">404</h1>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Ghost size={64} className="text-indigo-500 mb-4 animate-bounce" />
            <span className="text-2xl md:text-3xl font-bold text-white">
              {t("notFound.title")}
            </span>
          </div>
        </div>

        <p className="text-zinc-400 text-lg">{t("notFound.message")}</p>

        <div className="flex justify-center gap-4">
          <Button onClick={handleNavigation} size="lg" className="gap-2">
            {user ? <Home size={20} /> : <LogIn size={20} />}
            {user ? t("notFound.backToDashboard") : t("notFound.goToLogin")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
