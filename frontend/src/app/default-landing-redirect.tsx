import { Navigate } from "react-router-dom";

import { useAuth } from "@/features/auth/auth-context";

export function DefaultLandingRedirect() {
  const { user } = useAuth();

  if (user?.role === "member") {
    return <Navigate replace to="/notes" />;
  }

  return <Navigate replace to="/admin/dashboard" />;
}
