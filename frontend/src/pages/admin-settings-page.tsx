import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/api/client";
import { apiFetch } from "@/api/client";
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
  const [noteBindings, setNoteBindings] = useState<Record<string, NoteSheetBindingDraft>>({});
  const [bindingMessage, setBindingMessage] = useState<string | null>(null);
  const [bindingError, setBindingError] = useState<string | null>(null);
  const [savingBindingFor, setSavingBindingFor] = useState<string | null>(null);

  const sortedRooms = useMemo(
    () => [...draftLab.rooms].sort((left, right) => left.displayOrder - right.displayOrder),
    [draftLab.rooms],
  );
  const isDirty = JSON.stringify(normalizeLabSettings(draftLab)) !== JSON.stringify(normalizeLabSettings(state.lab));

  useEffect(() => {
    setDraftLab(state.lab);
  }, [state.lab]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadNoteBindings();
  }, [isLoaded, state.users]);

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

  const handleBindingDraftChange = (userId: string, patch: Partial<NoteSheetBindingDraft>) => {
    setBindingMessage(null);
    setBindingError(null);
    setNoteBindings((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        userId,
        displayName: current[userId]?.displayName ?? userId,
        spreadsheetId: current[userId]?.spreadsheetId ?? "",
        sheetName: current[userId]?.sheetName ?? "notes",
        isActive: current[userId]?.isActive ?? false,
        ...patch,
      },
    }));
  };

  const saveBinding = async (userId: string) => {
    const draft = noteBindings[userId];
    if (!draft) {
      return;
    }
    setSavingBindingFor(userId);
    setBindingMessage(null);
    setBindingError(null);
    try {
      const updated = await apiFetch<NoteSheetBindingResponse>(`/settings/note-sheet-bindings/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          spreadsheet_id: draft.spreadsheetId,
          sheet_name: draft.sheetName,
          is_active: draft.isActive,
        }),
      });
      setNoteBindings((current) => ({
        ...current,
        [userId]: toBindingDraft(updated),
      }));
      setBindingMessage(`${draft.displayName} の日誌保存先を保存しました。`);
    } catch (error) {
      if (error instanceof ApiError) {
        setBindingError(error.message);
      } else {
        setBindingError("日誌保存先の保存に失敗しました。");
      }
    } finally {
      setSavingBindingFor(null);
    }
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
            保存ボタンを押すと研究室名と部屋設定を backend API 経由で SQLite に反映します。
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
        title="日誌保存先設定"
        description="各ユーザーの日誌保存先 Spreadsheet ID と sheet_name を設定します。Google OAuth 連携済みユーザーのみ日誌 API を利用できます。"
      >
        <div className="space-y-3">
          {bindingMessage ? <p className="text-sm font-medium text-emerald-700">{bindingMessage}</p> : null}
          {bindingError ? <p className="text-sm font-medium text-rose-700">{bindingError}</p> : null}
          {state.users.map((user) => {
            const draft = noteBindings[user.userId] ?? {
              userId: user.userId,
              displayName: user.displayName,
              spreadsheetId: "",
              sheetName: "notes",
              isActive: false,
            };
            return (
              <FilterBar key={user.userId} className="bg-white">
                <div className="flex min-w-[200px] flex-1 flex-col gap-1 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">{user.displayName}</p>
                  <p className="text-xs text-slate-500">{user.userId}</p>
                </div>
                <label className="flex min-w-[280px] flex-[2] flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Spreadsheet ID
                  </span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                    onChange={(event) =>
                      handleBindingDraftChange(user.userId, { spreadsheetId: event.target.value })
                    }
                    placeholder="1AbCdEf..."
                    value={draft.spreadsheetId}
                  />
                </label>
                <label className="flex min-w-[160px] flex-1 flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    sheet_name
                  </span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                    onChange={(event) =>
                      handleBindingDraftChange(user.userId, { sheetName: event.target.value || "notes" })
                    }
                    value={draft.sheetName}
                  />
                </label>
                <label className="flex min-w-[140px] flex-1 flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    状態
                  </span>
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                    onChange={(event) =>
                      handleBindingDraftChange(user.userId, { isActive: event.target.value === "active" })
                    }
                    value={draft.isActive ? "active" : "inactive"}
                  >
                    <option value="active">有効</option>
                    <option value="inactive">無効</option>
                  </select>
                </label>
                <div className="flex min-w-[120px] items-end">
                  <ToolbarButton
                    label={savingBindingFor === user.userId ? "保存中..." : "保存"}
                    onClick={() => void saveBinding(user.userId)}
                    tone="primary"
                  />
                </div>
              </FilterBar>
            );
          })}
        </div>
      </Panel>
    </div>
  );

  async function loadNoteBindings() {
    try {
      const response = await apiFetch<NoteSheetBindingListResponse>("/settings/note-sheet-bindings");
      setNoteBindings(
        response.items.reduce<Record<string, NoteSheetBindingDraft>>((acc, item) => {
          acc[item.user_id] = toBindingDraft(item);
          return acc;
        }, {}),
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setBindingError(error.message);
      } else {
        setBindingError("日誌保存先設定の読み込みに失敗しました。");
      }
    }
  }
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

type NoteSheetBindingResponse = {
  user_id: string;
  display_name: string;
  spreadsheet_id: string;
  sheet_name: string;
  is_active: boolean;
};

type NoteSheetBindingListResponse = {
  items: NoteSheetBindingResponse[];
};

type NoteSheetBindingDraft = {
  userId: string;
  displayName: string;
  spreadsheetId: string;
  sheetName: string;
  isActive: boolean;
};

function toBindingDraft(item: NoteSheetBindingResponse): NoteSheetBindingDraft {
  return {
    userId: item.user_id,
    displayName: item.display_name,
    spreadsheetId: item.spreadsheet_id,
    sheetName: item.sheet_name || "notes",
    isActive: item.is_active,
  };
}
