import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError } from "@/api/client";
import { useLabBoard } from "@/features/lab-board/lab-board-context";
import { buildDashboardBoardSummary, sortDashboardRows } from "@/mocks/app-data";
import type { DashboardScope } from "@/types/app";

const selectedScopeStorageKey = "hello-world.dashboard.selected-scope";

function readStoredScope(): DashboardScope {
  if (typeof window === "undefined") {
    return "all";
  }

  const value = window.localStorage.getItem(selectedScopeStorageKey);
  return value === null || value === "" ? "all" : value;
}

export function useDashboardBoard() {
  const [selectedScope, setSelectedScope] = useState<DashboardScope>(() => readStoredScope());
  const [statusError, setStatusError] = useState<string | null>(null);
  const { activeRooms, isLoaded, state, updateStatus } = useLabBoard();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(selectedScopeStorageKey, selectedScope);
  }, [selectedScope]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== selectedScopeStorageKey) {
        return;
      }

      setSelectedScope(event.newValue === null || event.newValue === "" ? "all" : event.newValue);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const effectiveScope =
    selectedScope === "all" || activeRooms.some((room) => room.id === selectedScope)
      ? selectedScope
      : "all";

  const visibleRows = useMemo(() => {
    if (effectiveScope === "all") {
      return sortDashboardRows(state.rows);
    }

    return sortDashboardRows(state.rows.filter((row) => row.roomId === effectiveScope));
  }, [effectiveScope, state.rows]);

  const boardSummary = useMemo(() => buildDashboardBoardSummary(visibleRows), [visibleRows]);
  const scopeLabel =
    effectiveScope === "all"
      ? "研究室全体"
      : activeRooms.find((room) => room.id === effectiveScope)?.name ?? "部屋未設定";

  const handleCellSelect = useCallback(
    async (rowId: string, column: "room" | "onCampus" | "class" | "seminarMeeting" | "home") => {
      setStatusError(null);
      try {
        await updateStatus(rowId, column);
      } catch (error) {
        if (error instanceof ApiError) {
          setStatusError(error.message);
          return;
        }
        setStatusError("状態更新に失敗しました。");
      }
    },
    [updateStatus],
  );

  return {
    activeRooms,
    boardSummary,
    effectiveScope,
    handleCellSelect,
    isLoaded,
    labName: state.lab.labName,
    scopeLabel,
    selectedScope,
    setSelectedScope,
    statusError,
    visibleRows,
  };
}
