import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function PublicRoute() {
  const { user, userInfo, loading, userInfoLoading } = useAuth();

  if (loading || userInfoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const isVerified = userInfo?.verified_email === true;

  // Only fully verified sessions may skip public pages
  return user && isVerified ? <Navigate to="/" replace /> : <Outlet />;
}
