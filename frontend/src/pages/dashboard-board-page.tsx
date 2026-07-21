import { Crosshair } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";

import { StatusCardGrid } from "@/components/dashboard/status-card-grid";
import { useAuth } from "@/features/auth/auth-context";
import { useDashboardBoard } from "@/features/lab-board/use-dashboard-board";
import type { DashboardMatrixRow } from "@/types/app";

const NO_DISABLED_SECTIONS: ("lab" | "onCampus" | "class" | "home")[] = [];
const ALL_DISABLED_SECTIONS: ("lab" | "onCampus" | "class" | "home")[] = ["lab", "onCampus", "class", "home"];

const DEV_TARGET_ROW_COUNT = 16;

const DEV_PAD_PATTERNS: number[][] = [
  [9, 8, 10, 7, 8.5, 3, 0],
  [7, 7.5, 6, 8, 4, 0, 0],
  [10.5, 4, 0.2, 0, 0, 0, 0],
  [6, 5, 4, 3, 2, 0, 0],
  [8, 9, 7.2, 6.5, 5, 4, 2],
  [0, 0, 0, 0, 0, 0, 0],
  [12, 10, 9, 8, 7, 6, 4],
  [7.5, 7, 6.8, 7.1, 7, 3, 2],
  [4, 3, 2, 1, 0, 0, 0],
  [11, 9, 8, 7, 6, 5, 3],
  [8, 8, 8, 8, 8, 2, 1],
  [6.5, 7.5, 5, 4, 3, 0, 0],
  [10, 9, 7, 8, 6, 4, 2],
  [7, 7, 7, 7, 7, 0, 0],
  [5, 4, 3, 2, 1, 0, 0],
  [9, 10, 11, 12, 8, 4, 2],
];

const DEV_PAD_STATUSES = ["Room", "On Campus", "Class", "Off Campus"] as const;
const DEV_PAD_COLUMNS = ["room", "onCampus", "class", "home"] as const;

function padRowsForDev(rows: DashboardMatrixRow[]): DashboardMatrixRow[] {
  if (!import.meta.env.DEV) return rows;

  let base: DashboardMatrixRow[];
  if (rows.length >= DEV_TARGET_ROW_COUNT) {
    base = rows.slice(0, DEV_TARGET_ROW_COUNT);
  } else {
    const fillers: DashboardMatrixRow[] = [];
    for (let i = rows.length; i < DEV_TARGET_ROW_COUNT; i += 1) {
      const idx = i - rows.length;
      const pattern = DEV_PAD_PATTERNS[idx % DEV_PAD_PATTERNS.length] ?? [0, 0, 0, 0, 0, 0, 0];
      const dailyDurationsSec = pattern.map((h) => Math.round(h * 3600));
      const weeklyDurationSec = dailyDurationsSec.reduce((sum, sec) => sum + sec, 0);
      fillers.push({
        id: `__dev_pad_${i}`,
        name: `Dev User ${i + 1}`,
        academicGrade: "M1",
        roomId: null,
        activeColumn: DEV_PAD_COLUMNS[idx % DEV_PAD_COLUMNS.length],
        statusLabel: DEV_PAD_STATUSES[idx % DEV_PAD_STATUSES.length],
        currentSessionId: null,
        checkInAt: idx % 3 === 0 ? "未出勤" : "09:00",
        checkOutAt: null,
        todayDurationSec: 0,
        weeklyDurationSec,
        dailyDurationsSec,
        weeklyRank: null,
      });
    }
    base = [...rows, ...fillers];
  }

  // dev モードでは週合計時間ベースで強制的にランクを付与（バックエンドの rank に依存しない）
  const sorted = [...base].sort((a, b) => b.weeklyDurationSec - a.weeklyDurationSec);
  const rankMap = new Map(sorted.map((row, i) => [row.id, i + 1]));
  return base.map((row) => ({ ...row, weeklyRank: rankMap.get(row.id) ?? null }));
}

export function DashboardBoardPage() {
  const { isLoading, user } = useAuth();
  const { handleCellSelect, isLoaded, statusError, visibleRows } = useDashboardBoard();

  const displayRows = useMemo(() => padRowsForDev(visibleRows), [visibleRows]);

  const isAdmin = user?.role === "admin";
  const disabledSections = isAdmin ? NO_DISABLED_SECTIONS : ALL_DISABLED_SECTIONS;
  const onSectionSelect = useCallback(
    (rowId: string, section: "lab" | "onCampus" | "class" | "home") => {
      if (rowId.startsWith("__dev_pad_")) return;
      if (section === "lab") return handleCellSelect(rowId, "room");
      if (section === "onCampus") return handleCellSelect(rowId, "onCampus");
      return handleCellSelect(rowId, section);
    },
    [handleCellSelect],
  );

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
    <div
      className="h-screen w-screen overflow-hidden bg-[#eef2ec] p-2 sm:p-3"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative h-full w-full">
        {statusError ? (
          <div className="absolute left-4 right-4 top-4 z-30 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:left-6 sm:right-6 lg:left-8 lg:right-8">
            {statusError}
          </div>
        ) : null}

        <StatusCardGrid
          className="h-full w-full"
          fillViewport
          showAds
          disabledSections={disabledSections}
          onSectionSelect={isAdmin ? onSectionSelect : undefined}
          rows={displayRows}
        />
        <Link
          aria-label="タッチ位置を調整"
          className="absolute bottom-2 right-2 z-40 rounded-full border border-slate-300/80 bg-white/85 p-2.5 text-slate-700 opacity-35 shadow-md backdrop-blur-sm transition hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-sky-400 active:scale-95 active:opacity-100"
          to="/demo/calibration"
        >
          <Crosshair aria-hidden="true" size={20} strokeWidth={1.7} />
        </Link>
      </div>
    </div>
  );
}
