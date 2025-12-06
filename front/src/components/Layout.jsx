import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  User,
  LogOut,
  Users,
  Receipt,
  Languages,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router-dom";

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { logout, userInfo, changeUserLanguage } = useAuth();
  const { i18n, t } = useTranslation();

  const navigation = [
    { name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
    { name: t("nav.accounts"), href: "/accounts", icon: Wallet },
    {
      name: t("nav.transactions"),
      href: "/transactions",
      icon: ArrowRightLeft,
    },
    { name: t("nav.receipts"), href: "/receipts", icon: Receipt },
    { name: t("nav.profile"), href: "/profile", icon: User },
  ];

  if (userInfo?.role === "admin") {
    navigation.push({
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
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="font-bold text-black">F</span>
          </div>
          <span className="text-xl font-bold">Financia</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navigation.map((item) => {
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

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-4 z-50">
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
                <Icon size={24} />
                <span className="text-[10px]">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen pb-24 md:pb-0">
        {children}
      </main>
    </div>
  );
}
