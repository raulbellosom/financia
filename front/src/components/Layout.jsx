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
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router-dom";
import Logo from "./Logo";
import { useRuleProcessor } from "../hooks/useRuleProcessor";

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { logout, userInfo, changeUserLanguage } = useAuth();
  const { i18n, t } = useTranslation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Process recurring rules
  useRuleProcessor();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigation = [
    { name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
    { name: t("nav.accounts"), href: "/accounts", icon: Wallet },
    { name: t("nav.categories"), href: "/categories", icon: Tags },
    { name: t("nav.recurring"), href: "/recurring-rules", icon: CalendarClock },
    {
      name: t("nav.transactions"),
      href: "/transactions",
      icon: ArrowRightLeft,
    },
    { name: t("nav.receipts"), href: "/receipts", icon: Receipt },
  ];

  // Desktop navigation includes Profile
  const desktopNavigation = [
    ...navigation,
    { name: t("nav.profile"), href: "/profile", icon: User },
  ];

  if (userInfo?.role === "admin") {
    desktopNavigation.push({
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
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"
            title="Switch Language"
          >
            <Languages size={20} />
            <span className="text-sm font-medium">
              {i18n.language === "es" ? "English" : "Español"}
            </span>
          </button>

          <div className="flex items-center gap-3 px-4 py-3 mb-2">
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
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            {t("nav.signOut")}
          </button>
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

        {/* Content */}
        <div className="flex-1">{children}</div>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden sticky bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-4 z-50">
          <nav className="flex justify-around">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center gap-1 ${
                    isActive ? "text-emerald-500" : "text-zinc-500"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
