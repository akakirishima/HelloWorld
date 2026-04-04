/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, apiFetch } from "@/api/client";
import type { AcademicGrade, AuthUser } from "@/types/app";

type AuthPayload = {
  user_id: string;
  full_name: string;
  display_name: string;
  role: "admin" | "member";
  academic_year: string;
  room_id: number | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
};

type AuthResponse = {
  message: string;
  user: AuthPayload;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  loginError: string | null;
  login: (payload: { userId: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  changePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<AuthUser>;
  clearLoginError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const payload = await apiFetch<AuthPayload>("/auth/me");
      const nextUser = normalizeAuthUser(payload);
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return null;
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      loginError,
      async login(payload) {
        setLoginError(null);
        const response = await apiFetch<AuthResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            user_id: payload.userId,
            password: payload.password,
          }),
        });
        const nextUser = normalizeAuthUser(response.user);
        setUser(nextUser);
        return nextUser;
      },
      async logout() {
        await apiFetch<AuthResponse>("/auth/logout", {
          method: "POST",
        });
        setUser(null);
        setLoginError(null);
      },
      refresh,
      async changePassword(payload) {
        const response = await apiFetch<AuthResponse>("/auth/change-password", {
          method: "POST",
          body: JSON.stringify({
            current_password: payload.currentPassword,
            new_password: payload.newPassword,
          }),
        });
        const nextUser = normalizeAuthUser(response.user);
        setUser(nextUser);
        return nextUser;
      },
      clearLoginError() {
        setLoginError(null);
      },
    }),
    [isLoading, loginError, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

function normalizeAuthUser(payload: AuthPayload): AuthUser {
  return {
    userId: payload.user_id,
    fullName: payload.full_name,
    displayName: payload.display_name,
    role: payload.role,
    academicYear: normalizeAcademicYear(payload.academic_year),
    roomId: payload.room_id === null ? null : String(payload.room_id),
    isActive: payload.is_active,
    mustChangePassword: payload.must_change_password,
    lastLoginAt: payload.last_login_at,
  };
}

function normalizeAcademicYear(value: string): AcademicGrade {
  if (value === "B4" || value === "M1" || value === "M2" || value === "D1" || value === "D2" || value === "D3") {
    return value;
  }

  return "Researcher";
}
