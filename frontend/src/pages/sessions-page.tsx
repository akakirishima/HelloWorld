import { useEffect, useMemo, useState } from "react";

import { ApiError, apiFetch } from "@/api/client";
import { DataRow, DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

const sessionColumns = ["日付", "出勤", "退勤", "滞在時間"];

type SessionApiItem = {
  id: number;
  user_id: string;
  display_name: string;
  check_in_at: string;
  check_out_at: string | null;
  duration_sec: number | null;
  close_reason: string | null;
};

type SessionListResponse = {
  items: SessionApiItem[];
};

type DayRow = {
  date: string;
  checkIn: string;
  checkOut: string;
  duration: string;
};

export function SessionsPage() {
  const [sessions, setSessions] = useState<SessionApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoadError(null);
      setIsLoading(true);
      try {
        const payload = await apiFetch<SessionListResponse>("/sessions/me");
        setSessions(payload.items);
      } catch (error) {
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError("勤怠履歴の取得に失敗しました。");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, []);

  const dayRows = useMemo<DayRow[]>(() => {
    // JST 日付でグループ化
    const byDate = new Map<string, SessionApiItem[]>();
    for (const item of sessions) {
      const date = toJstDate(item.check_in_at);
      const group = byDate.get(date) ?? [];
      group.push(item);
      byDate.set(date, group);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => {
        // check_in_at 昇順でソート
        const sorted = [...items].sort((a, b) =>
          a.check_in_at.localeCompare(b.check_in_at),
        );
        const firstIn = formatTime(sorted[0].check_in_at);
        const lastItem = sorted[sorted.length - 1];
        const lastOut = lastItem.check_out_at ? formatTime(lastItem.check_out_at) : "未退勤";

        const totalSec = items.reduce<number | null>((acc, s) => {
          if (acc === null || s.duration_sec === null) return null;
          return acc + s.duration_sec;
        }, 0);

        return {
          date,
          checkIn: firstIn,
          checkOut: lastOut,
          duration: totalSec === null ? "—" : formatDuration(totalSec),
        };
      });
  }, [sessions]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Sessions"
        title="勤怠履歴"
        description="日付ごとの出退勤をまとめて確認できます。"
      />

      <Panel title="履歴一覧">
        <div className="space-y-4">
          {loadError ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </p>
          ) : null}
          <DataTable columns={sessionColumns}>
            {isLoading ? (
              <DataRow cells={["読み込み中...", "-", "-", "-"]} />
            ) : dayRows.length === 0 ? (
              <DataRow cells={["記録なし", "-", "-", "-"]} />
            ) : (
              dayRows.map((row) => (
                <DataRow
                  key={row.date}
                  cells={[row.date, row.checkIn, row.checkOut, row.duration]}
                />
              ))
            )}
          </DataTable>
        </div>
      </Panel>
    </div>
  );
}

/** UTC ISO 文字列 → JST "YYYY-MM-DD" */
function toJstDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  })
    .format(date)
    .replaceAll("/", "-");
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(date);
}

/** 秒 → "1.5h" 形式（0分台は "0.0h"） */
function formatDuration(sec: number): string {
  const h = sec / 3600;
  return `${Math.round(h * 10) / 10}h`;
}
