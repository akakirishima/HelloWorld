import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { ApiError, apiFetch } from "@/api/client";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import type { UserItem } from "@/types/app";

const DELETED_DATA_ITEMS = [
  "ユーザーアカウント",
  "在席状態（リアルタイム）",
  "入退室セッション履歴（全期間）",
  "ステータス変更履歴（全期間）",
  "監査ログ（このユーザーが操作者・対象のもの）",
  "ノート（全期間）",
];

export function AdminUserDeletePage() {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const user: UserItem | null =
    (location.state as { user?: UserItem } | null)?.user ?? null;

  const [confirmed, setConfirmed] = useState(false);
  const [inputId, setInputId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // state がなければ一覧に戻す
  useEffect(() => {
    if (!user) {
      navigate("/admin/users", { replace: true });
    }
  }, [user, navigate]);

  // ブラウザのタブ閉じ / リロードブロック（削除中のみ）
  // ※ useBlocker は使わない：削除完了後の navigate() 自身もブロックしてしまうため
  useEffect(() => {
    if (!isDeleting) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDeleting]);

  const canDelete = confirmed && inputId === userId && !isDeleting;

  const handleDelete = useCallback(async () => {
    if (!canDelete || !userId) return;
    setIsDeleting(true);
    setError(null);
    try {
      // context の deleteUser（refreshFromApi を含む）ではなく直接呼ぶ
      // → 削除後のページ遷移で自然に再取得されるため refreshFromApi は不要
      await apiFetch(`/users/${userId}`, { method: "DELETE" });
      // navigate の前に isDeleting を false にしてオーバーレイを解除
      setIsDeleting(false);
      navigate("/admin/users", {
        replace: true,
        state: { deletedName: user?.displayName ?? userId },
      });
    } catch (err) {
      // 実際のAPIエラーメッセージを表示
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "削除に失敗しました。もう一度お試しください。";
      setError(message);
      setIsDeleting(false);
    }
  }, [canDelete, navigate, user?.displayName, userId]);

  if (!user) return null;

  return (
    <div className="relative flex flex-col gap-4">
      {/* 削除中オーバーレイ */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-3xl border border-white/20 bg-white px-10 py-8 text-center shadow-2xl">
            <div className="mb-3 text-3xl">⏳</div>
            <p className="text-lg font-semibold text-slate-900">削除中...</p>
            <p className="mt-2 text-sm text-slate-500">
              この画面を閉じないでください
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40"
          disabled={isDeleting}
          onClick={() => navigate("/admin/users")}
          type="button"
        >
          ← ユーザー管理に戻る
        </button>
      </div>

      <PageHeader
        eyebrow="Admin Users — Delete"
        title="ユーザー削除確認"
        description="この操作は取り消せません。以下の手順をすべて完了するまで削除は実行されません。"
      />

      {/* ユーザー情報カード */}
      <Panel title="削除対象ユーザー" description="">
        <div className="grid gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm">
          <div className="flex gap-6">
            <span className="font-semibold text-slate-700">表示名</span>
            <span className="text-slate-900">{user.displayName}</span>
          </div>
          <div className="flex gap-6">
            <span className="font-semibold text-slate-700">ユーザーID</span>
            <span className="font-mono text-slate-900">{user.userId}</span>
          </div>
          <div className="flex gap-6">
            <span className="font-semibold text-slate-700">ロール</span>
            <span className="text-slate-900">{user.role}</span>
          </div>
          <div className="flex gap-6">
            <span className="font-semibold text-slate-700">学年</span>
            <span className="text-slate-900">{user.academicGrade}</span>
          </div>
        </div>
      </Panel>

      {/* 削除対象データ一覧 */}
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

      {/* Stage 2: チェックボックス確認 */}
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
            <strong>{user.displayName}（{user.userId}）</strong>{" "}
            に関するすべてのデータが完全に削除されることを確認しました。この操作は取り消せません。
          </span>
        </label>
      </Panel>

      {/* Stage 3: ユーザーID入力 */}
      <Panel
        title="ステップ 3 — ユーザーID入力"
        description={`確認のため、削除するユーザーID「${user.userId}」を入力してください。`}
      >
        <div className={confirmed ? "" : "pointer-events-none opacity-40"}>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-700 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-300 disabled:bg-slate-50"
            disabled={!confirmed || isDeleting}
            onChange={(e) => setInputId(e.target.value)}
            placeholder={user.userId}
            type="text"
            value={inputId}
          />
          {confirmed && inputId.length > 0 && inputId !== userId && (
            <p className="mt-2 text-sm text-rose-600">
              ユーザーIDが一致しません
            </p>
          )}
        </div>
      </Panel>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* 完全削除ボタン */}
      <div className="flex items-center gap-4 rounded-[24px] border border-rose-200 bg-rose-50 px-6 py-5">
        <div className="flex-1 text-sm text-rose-700">
          {canDelete
            ? "すべての確認が完了しました。「完全削除」ボタンで削除を実行できます。"
            : "ステップ 2 のチェックとステップ 3 のユーザーID入力を完了してください。"}
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
