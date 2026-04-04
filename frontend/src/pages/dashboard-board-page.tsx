import { Navigate } from "react-router-dom";

import { StatusMatrixBoard } from "@/components/dashboard/status-matrix-board";
import { DashboardTab } from "@/components/dashboard/dashboard-tab";
import { useAuth } from "@/features/auth/auth-context";
import { useDashboardBoard } from "@/features/lab-board/use-dashboard-board";

export function DashboardBoardPage() {
  const { isLoading, user } = useAuth();
  const {
    activeRooms,
    effectiveScope,
    handleCellSelect,
    isLoaded,
    labName,
    scopeLabel,
    setSelectedScope,
    statusError,
    visibleRows,
  } = useDashboardBoard();

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
    <div className="min-h-screen w-screen overflow-x-hidden bg-[#eef2ec]">
      <div className="relative flex min-h-screen w-screen flex-col">
        <div className="border-b border-[#7f9467] bg-[#6f8b5b] px-6 py-4 text-white sm:px-8 sm:py-5">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/70">
              Laboratory Board
            </p>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-3">
                <h1 className="text-[2rem] font-semibold leading-none text-white sm:text-[2.5rem]">
                  {labName}
                </h1>
                <span className="hidden h-2 w-2 rounded-full bg-white/40 xl:inline-block" />
                <div className="flex flex-wrap items-center gap-2" data-testid="fullscreen-scope-selector">
                  <DashboardTab
                    active={effectiveScope === "all"}
                    label="研究室全体"
                    onClick={() => setSelectedScope("all")}
                    variant="fullscreen"
                  />
                  {activeRooms.map((room) => (
                    <DashboardTab
                      key={room.id}
                      active={effectiveScope === room.id}
                      label={room.name}
                      onClick={() => setSelectedScope(room.id)}
                      variant="fullscreen"
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm font-medium tracking-[0.08em] text-white/72 xl:text-right">
                {scopeLabel}
              </p>
            </div>
          </div>
        </div>

        {statusError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700 sm:px-8">
            {statusError}
          </div>
        ) : null}

        <StatusMatrixBoard
          className="min-h-0 flex-1 w-screen"
          fullscreen
          interactive
          onCellSelect={handleCellSelect}
          rows={visibleRows}
        />
      </div>
    </div>
  );
}
