import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, apiFetch } from "@/api/client";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ToolbarButton } from "@/components/ui/toolbar-button";

type NoteRecord = {
  id: string;
  note_date: string;
  title: string;
  did_today: string;
  future_tasks: string;
  created_at: string;
  updated_at: string;
};

type NotesResponse = {
  items: NoteRecord[];
};

type NoteFormState = {
  id: string | null;
  noteDate: string;
  title: string;
  didToday: string;
  futureTasks: string;
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: NoteFormState = {
  id: null,
  noteDate: todayString(),
  title: "",
  didToday: "",
  futureTasks: "",
};

export function NotesPage() {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchNotes = useCallback(
    async (selectedId?: string | null) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        const { startDate, endDate } = recentDateWindow();
        params.set("date_from", startDate);
        params.set("date_to", endDate);
        const suffix = params.toString();
        const payload = await apiFetch<NotesResponse>(`/notes${suffix ? `?${suffix}` : ""}`);
        setNotes(payload.items);
        setForm((current) => {
          const targetId = selectedId ?? current.id;
          if (targetId !== null) {
            const selected = payload.items.find((item) => item.id === targetId);
            if (selected) return noteToForm(selected);
          }
          if (payload.items.length > 0 && current.title === "" && current.didToday === "") {
            return noteToForm(payload.items[0]);
          }
          if (payload.items.length === 0 && targetId !== null) {
            return { ...EMPTY_FORM, noteDate: todayString() };
          }
          return current;
        });
      } catch (error) {
        setLoadError(error instanceof ApiError ? error.message : "日誌一覧の取得に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        if (a.note_date === b.note_date) return b.updated_at.localeCompare(a.updated_at);
        return b.note_date.localeCompare(a.note_date);
      }),
    [notes],
  );
  const canEditCurrentForm = canEditNoteDate(form.noteDate);

  const openCreateForm = () => {
    setForm({ ...EMPTY_FORM, noteDate: todayString() });
    setSaveError(null);
    setSaveMessage(null);
  };

  const exportNotes = async () => {
    setIsExporting(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const params = new URLSearchParams();
      const { startDate, endDate } = recentDateWindow();
      params.set("date_from", startDate);
      params.set("date_to", endDate);
      const suffix = params.toString();
      const response = await fetch(`/api/notes/export${suffix ? `?${suffix}` : ""}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message);
      }
      const blob = await response.blob();
      const filename = filenameFromContentDisposition(response.headers.get("content-disposition")) ?? "notes-export.xlsx";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setSaveMessage("日誌をExcelに出力しました。");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "日誌のExcel出力に失敗しました。");
    } finally {
      setIsExporting(false);
    }
  };

  const selectNote = (note: NoteRecord) => {
    setForm(noteToForm(note));
    setSaveError(null);
    setSaveMessage(null);
  };

  const saveNote = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const body = JSON.stringify({
        note_date: form.noteDate,
        title: form.title,
        did_today: form.didToday,
        future_tasks: form.futureTasks,
      });
      if (form.id === null) {
        const created = await apiFetch<NoteRecord>("/notes", { method: "POST", body });
        setForm(noteToForm(created));
        setSaveMessage("日誌を保存しました。");
        await fetchNotes(created.id);
      } else {
        const updated = await apiFetch<NoteRecord>(`/notes/${form.id}`, { method: "PUT", body });
        setForm(noteToForm(updated));
        setSaveMessage("日誌を更新しました。");
        await fetchNotes(updated.id);
      }
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : "日誌の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async () => {
    if (form.id === null) return;
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      await apiFetch(`/notes/${form.id}`, { method: "DELETE" });
      setSaveMessage("日誌を削除しました。");
      openCreateForm();
      await fetchNotes(null);
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : "日誌の削除に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const patch = (field: Partial<NoteFormState>) => {
    setSaveMessage(null);
    setSaveError(null);
    setForm((current) => ({ ...current, ...field }));
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Notes"
        title="日誌"
        description="過去2週間分の日誌だけを表示し、その範囲だけ編集できます。"
        actions={
          <div className="flex flex-wrap gap-2">
            <ToolbarButton
              label={isExporting ? "出力中..." : "Excel出力"}
              onClick={() => void exportNotes()}
              disabled={isExporting}
            />
            <ToolbarButton label="新規作成" onClick={openCreateForm} tone="primary" />
          </div>
        }
      />

      {loadError ? (
        <Panel title="接続エラー" description="">
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {/* 左: 一覧 */}
        <Panel title="日誌一覧" description="過去2週間分のみ表示し、古い日誌はここには出ません。">
          <div className="space-y-4">
            <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              日誌一覧は過去2週間分のみ表示します。編集できるのもこの範囲だけです。
            </p>
            {isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
                読み込み中...
              </div>
            ) : sortedNotes.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
                日誌がありません
              </div>
            ) : (
              <div className="grid gap-3">
                {sortedNotes.map((item) => {
                  const isSelected = form.id === item.id;
                  return (
                    <button
                      key={item.id}
                      className={[
                        "w-full rounded-3xl border px-5 py-4 text-left transition",
                        isSelected
                          ? "border-sky-400 bg-sky-50 shadow-sm ring-2 ring-sky-200"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                      onClick={() => selectNote(item)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {item.note_date}
                            </p>
                            {isSelected ? (
                              <span className="rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                                選択中
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-base font-semibold text-slate-950">
                            {item.title || "(無題)"}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                            {excerpt(item.did_today)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-slate-500">
                          <p>更新</p>
                          <p className="mt-1 font-medium text-slate-700">{toTime(item.updated_at)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* 右: 入力フォーム */}
        <Panel
          title={form.id === null ? "新規作成" : "編集"}
          description="記録日、タイトル、今日やったこと、今後の課題を入力して保存します。"
        >
          <div className="space-y-4">
            {!canEditCurrentForm ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                過去2週間より古い日誌は読み取り専用です。編集するには新しい日付の記録を作成してください。
              </p>
            ) : null}
            {saveMessage ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {saveMessage}
              </p>
            ) : null}
            {saveError ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {saveError}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  記録日
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  onChange={(event) => patch({ noteDate: event.target.value })}
                  type="date"
                  value={form.noteDate}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  タイトル
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  onChange={(event) => patch({ title: event.target.value })}
                  placeholder="例：論文執筆・実験など"
                  value={form.title}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                今日やったこと
              </span>
              <textarea
                className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-slate-400"
                onChange={(event) => patch({ didToday: event.target.value })}
                placeholder="今日取り組んだこと、進捗など"
                value={form.didToday}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                今後の課題等
              </span>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-slate-400"
                onChange={(event) => patch({ futureTasks: event.target.value })}
                placeholder="次回やること、懸念事項など"
                value={form.futureTasks}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <ToolbarButton
                label={isSaving ? "保存中..." : "保存"}
                disabled={!canEditCurrentForm || isSaving}
                onClick={() => void saveNote()}
                tone="primary"
              />
              <ToolbarButton
                disabled={form.id === null || isSaving || !canEditCurrentForm}
                label="削除"
                onClick={() => void deleteNote()}
                tone="danger"
              />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function noteToForm(note: NoteRecord): NoteFormState {
  return {
    id: note.id,
    noteDate: note.note_date,
    title: note.title,
    didToday: note.did_today,
    futureTasks: note.future_tasks,
  };
}

function excerpt(value: string): string {
  if (!value) return "(未記入)";
  return value.length > 56 ? `${value.slice(0, 56)}...` : value;
}

function toTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--:--";
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(d);
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return "Request failed.";
  try {
    const payload = JSON.parse(text) as unknown;
    if (
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof (payload as { detail?: unknown }).detail === "string"
    ) {
      return (payload as { detail: string }).detail;
    }
  } catch {
    // fall through
  }
  return "Request failed.";
}

function filenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null;
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = value.match(/filename=\"?([^\";]+)\"?/i);
  return plainMatch?.[1] ?? null;
}

function canEditNoteDate(noteDate: string): boolean {
  if (!noteDate) return true;
  const selected = new Date(`${noteDate}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return true;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 13);
  return selected >= cutoff;
}

function recentDateWindow(): { startDate: string; endDate: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 13);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
