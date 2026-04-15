import { useEffect, useMemo, useState } from "react";

import { ApiError, apiFetch } from "@/api/client";
import { DataRow, DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ToolbarButton } from "@/components/ui/toolbar-button";

const sessionColumns = ["日付", "出勤時刻", "退勤時刻", "滞在時間"];

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

  const sessionRows = useMemo(
    () =>
      sessions.map((item) => ({
        id: item.id,
        date: formatDate(item.check_in_at),
        checkInAt: formatTime(item.check_in_at),
        checkOutAt: item.check_out_at ? formatTime(item.check_out_at) : "未退勤",
        duration: item.duration_sec === null ? "--:--" : formatDuration(item.duration_sec),
      })),
    [sessions],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Sessions"
        title="勤怠履歴"
        description="シンプルな一覧で、自分の出退勤を確認する画面です。"
        actions={<ToolbarButton label="CSV 出力" />}
      />

      <Panel title="履歴一覧" description="出勤・退勤・滞在時間だけを見せます。">
        <div className="space-y-4">
          {loadError ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </p>
          ) : null}
          <DataTable columns={sessionColumns}>
            {isLoading ? (
              <DataRow cells={["読み込み中...", "-", "-", "-"]} />
            ) : (
              sessionRows.map((item) => (
                <DataRow
                  key={item.id}
                  cells={[
                    item.date,
                    item.checkInAt,
                    item.checkOutAt,
                    item.duration,
                  ]}
                />
              ))
            )}
          </DataTable>
        </div>
      </Panel>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
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
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(date);
}

function formatDuration(durationSec: number): string {
  const totalMinutes = Math.floor(durationSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
