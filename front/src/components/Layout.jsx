import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  User,
  LogOut,
  Users,
  Receipt,
  Languages,
  Tags,
  CalendarClock,
  Calendar,
  ChevronDown,
  Menu,
  X,
  Download,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router-dom";
import Logo from "./Logo";
import { useRuleProcessor } from "../hooks/useRuleProcessor";
import { useYieldProcessor } from "../hooks/useYieldProcessor";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { logout, userInfo, changeUserLanguage } = useAuth();
  const { i18n, t } = useTranslation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const queryClient = useQueryClient();

  // Process recurring rules
  useRuleProcessor();
  // Process investment yields
  useYieldProcessor();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // PWA Install Prompt
  useEffect(() => {
    // Check if standalone
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const checkShowPrompt = () => {
      if (isStandaloneMode) return;

      const hasDismissed = localStorage.getItem("pwa-prompt-dismissed");
      const lastDismissed = hasDismissed ? parseInt(hasDismissed) : 0;
      const now = Date.now();

      // Show if never dismissed or dismissed more than 7 days ago
      if (!hasDismissed || now - lastDismissed > 7 * 24 * 60 * 60 * 1000) {
        setShowInstallPrompt(true);
      }
    };

    const handler = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
      checkShowPrompt();
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For iOS, check immediately since there's no event
    if (isIOSDevice && !isStandaloneMode) {
      checkShowPrompt();
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        window.deferredPrompt = null;
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    } else {
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <span className="font-bold">
              {isIOS ? "Instalar en iPhone/iPad" : "Instalar Aplicación"}
            </span>
            {isIOS ? (
              <>
                <span className="text-sm">
                  1. Pulsa el botón Compartir{" "}
                  <span className="inline-block px-1 bg-zinc-800 rounded">
                    ⎋
                  </span>
                </span>
                <span className="text-sm">
                  2. Selecciona "Agregar a Inicio"{" "}
                  <span className="inline-block px-1 bg-zinc-800 rounded">
                    +
                  </span>
                </span>
              </>
            ) : (
              <>
                <span className="text-sm">
                  1. Abre el menú del navegador{" "}
                  <span className="inline-block px-1 bg-zinc-800 rounded">
                    ⋮
                  </span>
                </span>
                <span className="text-sm">
                  2. Selecciona "Instalar aplicación" o "Agregar a la pantalla
                  principal"
                </span>
              </>
            )}
            <button
              onClick={() => toast.dismiss(t.id)}
              className="mt-2 px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg self-start"
            >
              Entendido
            </button>
          </div>
        ),
        { duration: 8000, position: "bottom-center" }
      );
      setShowInstallPrompt(false);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    // Dismiss for 7 days
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries();
      toast.success(t("common.refreshed", "Data refreshed"));
    } catch (error) {
      console.error("Refresh failed", error);
      toast.error(t("common.refreshError", "Failed to refresh data"));
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const navigation = [
    { name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
    {
      name: t("nav.transactions"),
      href: "/transactions",
      icon: ArrowRightLeft,
    },
    { name: t("nav.receipts"), href: "/receipts", icon: Receipt },
    { name: t("nav.calendar"), href: "/calendar", icon: Calendar },
    { name: t("nav.accounts"), href: "/accounts", icon: Wallet },
    { name: t("nav.categories"), href: "/categories", icon: Tags },
    { name: t("nav.recurring"), href: "/recurring-rules", icon: CalendarClock },
  ];

  // Desktop navigation includes Profile
  const desktopNavigation = [...navigation];

  if (userInfo?.role === "admin") {
    desktopNavigation.push({
      name: t("nav.users"),
      href: "/admin/users",
      icon: Users,
    });
  }

  // Mobile Navigation Split
  const bottomNavItems = navigation.slice(0, 4);
  const moreNavItems = navigation.slice(4);

  if (userInfo?.role === "admin") {
    moreNavItems.push({
      name: t("nav.users"),
      href: "/admin/users",
      icon: Users,
    });
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "es" : "en";
    changeUserLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 p-6">
        <div className="flex items-center gap-3 mb-10">
          <Logo className="h-8 w-auto" />
          <span className="text-xl font-bold">Financia</span>
        </div>

        <nav className="flex-1 space-y-2">
          {desktopNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-500 font-medium"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-zinc-800 pt-4">
          <div className="relative group">
            {/* User Info Trigger */}
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-left">
              <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                {userInfo?.avatarFileId ? (
                  <img
                    src={`https://appwrite.racoondevs.com/v1/storage/buckets/${
                      import.meta.env.VITE_APPWRITE_AVATARS_BUCKET_ID
                    }/files/${userInfo.avatarFileId}/view?project=${
                      import.meta.env.VITE_APPWRITE_PROJECT_ID
                    }`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <User size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userInfo?.firstName} {userInfo?.lastName}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {userInfo?.email}
                </p>
              </div>
              <ChevronDown
                size={16}
                className="text-zinc-500 group-hover:text-white transition-colors"
              />
            </button>

            {/* Dropdown Menu */}
            <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-bottom translate-y-2 group-hover:translate-y-0 z-50">
              {/* Profile Link */}
              <Link
                to="/profile"
                className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <User size={18} />
                <span className="text-sm">{t("nav.profile")}</span>
              </Link>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-left"
              >
                <Languages size={18} />
                <span className="text-sm">
                  {i18n.language === "es" ? "English" : "Español"}
                </span>
              </button>

              <div className="h-px bg-zinc-800 mx-2"></div>

              {/* Logout */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut size={18} />
                <span className="text-sm">{t("nav.signOut")}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper - Handles Scroll */}
      <div
        className="flex-1 flex flex-col h-screen overflow-y-auto"
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 10)}
      >
        {/* Mobile Top Bar with Profile Dropdown */}
        <div
          className={`md:hidden fixed top-0 left-0 right-0 px-4 py-3 z-50 flex items-center justify-between transition-all duration-300 ${
            isScrolled ? "bg-black/80 backdrop-blur-md" : "bg-transparent"
          }`}
        >
          <div className="flex items-center gap-2">
            <Logo className="h-7 w-auto" />
            <span className="text-lg font-bold">Financia</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ${
                isRefreshing ? "animate-spin text-emerald-500" : ""
              }`}
            >
              <RefreshCw size={20} />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center p-1 rounded-full hover:bg-white/10 transition-colors relative z-50"
              >
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out flex items-center ${
                    isScrolled
                      ? "max-w-0 opacity-0 translate-x-8"
                      : "max-w-[150px] opacity-100 mr-3 translate-x-0"
                  }`}
                >
                  <span className="text-sm font-medium text-white truncate">
                    {userInfo?.firstName}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0 ring-2 ring-transparent hover:ring-emerald-500/50 transition-all relative z-10">
                  {userInfo?.avatarFileId ? (
                    <img
                      src={`https://appwrite.racoondevs.com/v1/storage/buckets/${
                        import.meta.env.VITE_APPWRITE_AVATARS_BUCKET_ID
                      }/files/${userInfo.avatarFileId}/view?project=${
                        import.meta.env.VITE_APPWRITE_PROJECT_ID
                      }`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <User size={16} />
                    </div>
                  )}
                </div>
              </button>

              {/* Dropdown Menu */}
              {isProfileMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-sm font-medium text-white truncate">
                        {userInfo?.firstName} {userInfo?.lastName}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {userInfo?.email}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                      >
                        <User size={18} />
                        <span className="text-sm">{t("nav.profile")}</span>
                      </Link>

                      <button
                        onClick={toggleLanguage}
                        className="w-full flex items-center gap-3 px-4 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                      >
                        <Languages size={18} />
                        <span className="text-sm">
                          {i18n.language === "es" ? "English" : "Español"}
                        </span>
                      </button>

                      {userInfo?.role === "admin" && (
                        <Link
                          to="/admin/users"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                          <Users size={18} />
                          <span className="text-sm">{t("nav.users")}</span>
                        </Link>
                      )}

                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <LogOut size={18} />
                        <span className="text-sm">{t("nav.signOut")}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 pb-20 md:pb-0">{children}</div>

        {/* PWA Install Prompt */}
        <AnimatePresence>
          {showInstallPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-96 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl z-50 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Download className="text-emerald-500" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white text-sm">Instalar App</h3>
                <p className="text-xs text-zinc-400">
                  Instala Financia para una mejor experiencia
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDismissInstall}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
                >
                  <X size={18} />
                </button>
                <button
                  onClick={handleInstallClick}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Instalar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 pb-safe z-40">
          <nav className="flex justify-around items-center h-16">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center gap-1 w-full h-full justify-center active:scale-95 transition-transform ${
                    isActive ? "text-emerald-500" : "text-zinc-500"
                  }`}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`flex flex-col items-center gap-1 w-full h-full justify-center active:scale-95 transition-transform ${
                isMobileMenuOpen ? "text-emerald-500" : "text-zinc-500"
              }`}
            >
              <Menu size={24} />
              <span className="text-[10px] font-medium">{t("nav.more")}</span>
            </button>
          </nav>
        </div>

        {/* Mobile More Menu Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              />
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(e, { offset, velocity }) => {
                  if (offset.y > 100 || velocity.y > 0.5) {
                    setIsMobileMenuOpen(false);
                  }
                }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl z-50 md:hidden border-t border-zinc-800 max-h-[85vh] overflow-y-auto touch-none"
              >
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-6" />

                <div className="px-6 pb-8 space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    {moreNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800"
                          }`}
                        >
                          <Icon size={24} />
                          <span className="text-xs font-medium text-center">
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="h-px bg-zinc-800" />

                  <div className="space-y-2">
                    <Link
                      to="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/30 text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User size={20} />
                      </div>
                      <span className="font-medium">{t("nav.profile")}</span>
                    </Link>

                    <button
                      onClick={toggleLanguage}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800/30 text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Languages size={20} />
                      </div>
                      <span className="font-medium">
                        {i18n.language === "es"
                          ? "Cambiar a Inglés"
                          : "Switch to Spanish"}
                      </span>
                    </button>

                    {!isStandalone && (
                      <button
                        onClick={handleInstallClick}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Download size={20} />
                        </div>
                        <span className="font-medium">Instalar Aplicación</span>
                      </button>
                    )}

                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <LogOut size={20} />
                      </div>
                      <span className="font-medium">{t("nav.signOut")}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
