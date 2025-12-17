import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function PrivateRoute() {
  const { user, userInfo, loading, userInfoLoading } = useAuth();

  if (loading || userInfoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isVerified = userInfo?.verified_email === true;

  return user && isVerified ? <Outlet /> : <Navigate to="/login" replace />;
}
