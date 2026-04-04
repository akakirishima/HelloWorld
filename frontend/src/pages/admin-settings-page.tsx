import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/api/client";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { useLabBoard } from "@/features/lab-board/lab-board-context";
import type { LabSettings, RoomItem } from "@/types/app";

export function AdminSettingsPage() {
  const { state, activeRooms, isLoaded, replaceLabSettings } = useLabBoard();
  const [draftLab, setDraftLab] = useState<LabSettings>(state.lab);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sortedRooms = useMemo(
    () => [...draftLab.rooms].sort((left, right) => left.displayOrder - right.displayOrder),
    [draftLab.rooms],
  );
  const isDirty = JSON.stringify(normalizeLabSettings(draftLab)) !== JSON.stringify(normalizeLabSettings(state.lab));

  useEffect(() => {
    setDraftLab(state.lab);
  }, [state.lab]);

  const updateRoomDraft = (roomId: string, patch: Partial<RoomItem>) => {
    setSavedMessage(null);
    setSaveError(null);
    setDraftLab((current) => ({
      ...current,
      rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, ...patch } : room)),
    }));
  };

  const handleAddRoom = () => {
    setSavedMessage(null);
    setSaveError(null);
    setDraftLab((current) => {
      const nextOrder = current.rooms.reduce((max, room) => Math.max(max, room.displayOrder), 0) + 1;
      const nextIndex = current.rooms.length + 1;

      return {
        ...current,
        rooms: [
          ...current.rooms,
          {
            id: `draft-${Date.now()}`,
            name: `部屋${nextIndex}`,
            displayOrder: nextOrder,
            isActive: true,
          },
        ],
      };
    });
  };

  const handleSave = async () => {
    const normalized = normalizeLabSettings(draftLab);
    setIsSaving(true);
    setSaveError(null);

    try {
      await replaceLabSettings(normalized);
      setDraftLab(normalized);
      setSavedMessage("変更を保存しました。");
    } catch (error) {
      if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError("研究室設定の保存に失敗しました。");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDraftLab(state.lab);
    setSavedMessage(null);
    setSaveError(null);
  };

  if (!isLoaded) {
    return (
      <Panel title="研究室設定" description="研究室設定を読み込んでいます。">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          読み込み中...
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Admin Settings"
        title="研究室設定"
        description="研究室名、部屋一覧、表示順を編集し、保存ボタンを押した時点で dashboard の全体タブと部屋タブへ反映します。"
        actions={
          <>
            <ToolbarButton disabled={!isDirty} label="変更を破棄" onClick={handleReset} />
            <ToolbarButton label="部屋を追加" onClick={handleAddRoom} />
            <ToolbarButton
              dataTestId="lab-settings-save-button"
              disabled={!isDirty || isSaving}
              label={isSaving ? "保存中..." : "保存"}
              onClick={() => void handleSave()}
              tone="primary"
            />
          </>
        }
      />

      <Panel title="研究室名" description="fullscreen 表示と dashboard 見出しに反映される基準名です。">
        <div className="space-y-3">
          <label className="flex max-w-[440px] flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              研究室名
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              data-testid="lab-name-input"
              onChange={(event) => {
                setSavedMessage(null);
                setDraftLab((current) => ({ ...current, labName: event.target.value }));
              }}
              value={draftLab.labName}
            />
          </label>
          <p className="text-xs text-slate-500">
            保存ボタンを押すと研究室名と部屋設定を backend API 経由で研究室内のデータベースへ反映します。
          </p>
          {savedMessage ? (
            <p className="text-sm font-medium text-emerald-700" data-testid="settings-saved-message">
              {savedMessage}
            </p>
          ) : null}
          {saveError ? <p className="text-sm font-medium text-rose-700">{saveError}</p> : null}
        </div>
      </Panel>

      <Panel
        title="部屋一覧"
        description={`有効な部屋は現在 ${activeRooms.length} 件です。タブ表示順は表示順の小さい順で決まります。`}
      >
        <div className="space-y-3">
          {sortedRooms.map((room) => (
            <FilterBar key={room.id} className="bg-white">
              <label className="flex min-w-[220px] flex-1 flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  部屋名
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  data-testid={`room-name-input-${room.id}`}
                  onChange={(event) => updateRoomDraft(room.id, { name: event.target.value })}
                  value={room.name}
                />
              </label>
              <label className="flex min-w-[160px] flex-1 flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  表示順
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  data-testid={`room-order-input-${room.id}`}
                  min={1}
                  onChange={(event) =>
                    updateRoomDraft(room.id, { displayOrder: Number(event.target.value) || 1 })
                  }
                  type="number"
                  value={room.displayOrder}
                />
              </label>
              <label className="flex min-w-[160px] flex-1 flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  状態
                </span>
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  data-testid={`room-status-select-${room.id}`}
                  onChange={(event) =>
                    updateRoomDraft(room.id, { isActive: event.target.value === "active" })
                  }
                  value={room.isActive ? "active" : "inactive"}
                >
                  <option value="active">有効</option>
                  <option value="inactive">無効</option>
                </select>
              </label>
            </FilterBar>
          ))}
        </div>
      </Panel>

      <Panel
        title="日誌保存"
        description="日誌はユーザーごとに研究室内 NAS へ Markdown 形式で保存されます。個別の Google 連携設定は不要です。"
      >
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600">
          <p>各ユーザーの日誌は日付ごとに自動で整理され、管理者が個別に保存先を設定する必要はありません。</p>
          <p>運用上は NAS の共有フォルダ、バックアップ世代管理、研究室ネットワーク制限を Container Station 側で管理します。</p>
        </div>
      </Panel>
    </div>
  );
}

function normalizeLabSettings(lab: LabSettings): LabSettings {
  return {
    labName: lab.labName.trim() || "研究室名未設定",
    rooms: [...lab.rooms]
      .map((room, index) => ({
        ...room,
        name: room.name.trim() || `部屋${index + 1}`,
        displayOrder: room.displayOrder > 0 ? room.displayOrder : index + 1,
      }))
      .sort((left, right) => left.displayOrder - right.displayOrder),
  };
}
