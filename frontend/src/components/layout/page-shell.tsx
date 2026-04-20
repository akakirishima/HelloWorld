import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { ToolbarButton } from "@/components/ui/toolbar-button";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";

const primaryNav = [
  { label: "日誌", to: "/notes" },
  { label: "勤怠履歴", to: "/sessions" },
  { label: "ボード", to: "/admin/dashboard/board" },
];

const adminLinks = [
  { label: "ダッシュボード", to: "/admin/dashboard" },
  { label: "研究室設定", to: "/admin/settings" },
  { label: "ユーザー管理", to: "/admin/users" },
  { label: "勤怠修正", to: "/admin/corrections" },
  { label: "集計 / CSV", to: "/admin/aggregates" },
  { label: "監査ログ", to: "/admin/audit-logs" },
];

export function PageShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, logout, user } = useAuth();
  const isAdminSection = location.pathname.startsWith("/admin");
  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f4f8fb_0%,_#eef3f2_100%)]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-4 text-sm font-medium text-slate-600 shadow-soft">
          認証状態を確認しています...
        </div>
      </div>
    );
  }

  if (user === null) {
    return <Navigate replace to="/login" />;
  }

  if (user.mustChangePassword) {
    return <Navigate replace to="/change-password" />;
  }

  if (isAdminSection && !isAdmin) {
    return <Navigate replace to="/notes" />;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,251,255,0.9),_transparent_32%),linear-gradient(180deg,_#f4f8fb_0%,_#eef3f2_100%)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-[32px] border border-white/70 bg-slate-950 px-5 py-6 text-white shadow-panel">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-300">
              Laboratory Ops
            </p>
            <div>
              <h1 className="text-2xl font-semibold text-white">研究室業務 UI</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                在室・勤怠・日誌を一体で扱うための業務ダッシュボードの見た目を先に固定しています。
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {isAdmin ? (
            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                管理メニュー
              </p>
              <div className="mt-3 space-y-2">
                {adminLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-2xl px-3 py-2 text-sm transition",
                        isActive
                          ? "bg-teal-400/20 text-teal-100"
                          : "text-slate-300 hover:bg-white/10 hover:text-white",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <p className="font-semibold">1研究室専用フロー</p>
              <p className="mt-2 leading-6 text-emerald-50/90">
                管理者が部屋を整備し、メンバーアカウントを作成して配布する運用を前提にしています。
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                ログイン
              </p>
              <p className="mt-2 font-semibold text-white">{user.displayName}</p>
              <p className="mt-1 text-slate-300">
                {user.role === "admin" ? "管理者" : "メンバー"}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                学年
              </p>
              <p className="mt-1 text-slate-100">{user.academicYear}</p>
              <p className="mt-2 text-slate-400">{user.userId}</p>
              <div className="mt-4">
                <ToolbarButton label="ログアウト" onClick={() => void handleLogout()} tone="primary" />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col gap-4">
          {isAdminSection && isAdmin ? (
            <div className="flex flex-wrap gap-2 rounded-[24px] border border-white/70 bg-white/70 p-3 shadow-panel backdrop-blur">
              {adminLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ) : null}

          <main className="min-h-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
