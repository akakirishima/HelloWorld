import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { ApiError, apiFetch } from "@/api/client";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import type { RoomItem } from "@/types/app";

const DELETED_DATA_ITEMS = [
  "部屋の設定情報",
  "監査ログ（この部屋に関するもの）",
];

export function AdminRoomDeletePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const room: RoomItem | null =
    (location.state as { room?: RoomItem } | null)?.room ?? null;

  const [confirmed, setConfirmed] = useState(false);
  const [inputName, setInputName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!room) {
      navigate("/admin/settings", { replace: true });
    }
  }, [room, navigate]);

  useEffect(() => {
    if (!isDeleting) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDeleting]);

  const canDelete = confirmed && inputName === room?.name && !isDeleting;

  const handleDelete = useCallback(async () => {
    if (!canDelete || !roomId) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiFetch(`/rooms/${roomId}`, { method: "DELETE" });
      setIsDeleting(false);
      navigate("/admin/settings", {
        replace: true,
        state: { deletedRoomName: room?.name ?? roomId },
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "削除に失敗しました。もう一度お試しください。";
      setError(message);
      setIsDeleting(false);
    }
  }, [canDelete, navigate, room?.name, roomId]);

  if (!room) return null;

  return (
    <div className="relative flex flex-col gap-4">
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-3xl border border-white/20 bg-white px-10 py-8 text-center shadow-2xl">
            <div className="mb-3 text-3xl">⏳</div>
            <p className="text-lg font-semibold text-slate-900">削除中...</p>
            <p className="mt-2 text-sm text-slate-500">この画面を閉じないでください</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40"
          disabled={isDeleting}
          onClick={() => navigate("/admin/settings")}
          type="button"
        >
          ← 研究室設定に戻る
        </button>
      </div>

      <PageHeader
        eyebrow="Admin Settings — Delete Room"
        title="部屋削除確認"
        description="この操作は取り消せません。以下の手順をすべて完了するまで削除は実行されません。"
      />

      <Panel title="削除対象部屋" description="">
        <div className="grid gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm">
          <div className="flex gap-6">
            <span className="font-semibold text-slate-700">部屋名</span>
            <span className="text-slate-900">{room.name}</span>
          </div>
          <div className="flex gap-6">
            <span className="font-semibold text-slate-700">表示順</span>
            <span className="text-slate-900">{room.displayOrder}</span>
          </div>
        </div>
      </Panel>

      <Panel
        title="削除されるデータ"
        description="以下のデータはすべて完全削除されます。復元はできません。"
      >
        <ul className="space-y-2">
          {DELETED_DATA_ITEMS.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <span className="text-rose-500">✕</span>
              {item}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="ステップ 2 — 削除内容の確認"
        description="上記の内容を読み、チェックを入れてください。"
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 hover:bg-slate-50">
          <input
            checked={confirmed}
            className="mt-0.5 h-4 w-4 shrink-0 accent-rose-600"
            onChange={(e) => setConfirmed(e.target.checked)}
            type="checkbox"
          />
          <span>
            <strong>「{room.name}」</strong>{" "}
            に関するすべてのデータが完全に削除されることを確認しました。この操作は取り消せません。
          </span>
        </label>
      </Panel>

      <Panel
        title="ステップ 3 — 部屋名入力"
        description={`確認のため、削除する部屋名「${room.name}」を入力してください。`}
      >
        <div className={confirmed ? "" : "pointer-events-none opacity-40"}>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-300 disabled:bg-slate-50"
            disabled={!confirmed || isDeleting}
            onChange={(e) => setInputName(e.target.value)}
            placeholder={room.name}
            type="text"
            value={inputName}
          />
          {confirmed && inputName.length > 0 && inputName !== room.name && (
            <p className="mt-2 text-sm text-rose-600">部屋名が一致しません</p>
          )}
        </div>
      </Panel>

      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4 rounded-[24px] border border-rose-200 bg-rose-50 px-6 py-5">
        <div className="flex-1 text-sm text-rose-700">
          {canDelete
            ? "すべての確認が完了しました。「完全削除」ボタンで削除を実行できます。"
            : "ステップ 2 のチェックとステップ 3 の部屋名入力を完了してください。"}
        </div>
        <ToolbarButton
          disabled={!canDelete}
          label="完全削除"
          onClick={() => void handleDelete()}
          tone="danger"
        />
      </div>
    </div>
  );
}
