import { Navigate } from "react-router-dom";

import { StatusCardGrid } from "@/components/dashboard/status-card-grid";
import { useAuth } from "@/features/auth/auth-context";
import { useDashboardBoard } from "@/features/lab-board/use-dashboard-board";

export function DashboardBoardPage() {
  const { isLoading, user } = useAuth();
  const { handleCellSelect, isLoaded, statusError, visibleRows } = useDashboardBoard();

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

  if (user.role !== "admin") {
    return <Navigate replace to="/notes" />;
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f4f8fb_0%,_#eef3f2_100%)]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-4 text-sm font-medium text-slate-600 shadow-soft">
          研究室設定とメンバー一覧を読み込んでいます...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#eef2ec] p-4 sm:p-6 lg:p-8">
      <div className="relative h-full w-full">
        {statusError ? (
          <div className="absolute left-4 right-4 top-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:left-6 sm:right-6 lg:left-8 lg:right-8">
            {statusError}
          </div>
        ) : null}

        <StatusCardGrid
          className="h-full w-full"
          fillViewport
          onSectionSelect={(rowId, section) => {
            if (section === "lab") {
              return handleCellSelect(rowId, "room");
            }
            return handleCellSelect(rowId, section);
          }}
          rows={visibleRows}
        />
      </div>
    </div>
  );
}
