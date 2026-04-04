import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, apiFetch } from "@/api/client";
import { DataRow, DataTable } from "@/components/ui/data-table";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ToolbarButton } from "@/components/ui/toolbar-button";

type NoteRecord = {
  id: string;
  note_date: string;
  title: string;
  body_markdown: string;
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
  bodyMarkdown: string;
};

const EMPTY_FORM: NoteFormState = {
  id: null,
  noteDate: new Date().toISOString().slice(0, 10),
  title: "",
  bodyMarkdown: "",
};

export function NotesPage() {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [query, setQuery] = useState({ q: "", dateFrom: "", dateTo: "" });
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchNotes = useCallback(
    async (selectedId?: string | null) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (query.q.trim().length > 0) params.set("q", query.q.trim());
        if (query.dateFrom) params.set("date_from", query.dateFrom);
        if (query.dateTo) params.set("date_to", query.dateTo);
        const suffix = params.toString();
        const payload = await apiFetch<NotesResponse>(`/notes${suffix ? `?${suffix}` : ""}`);
        setNotes(payload.items);
        setForm((current) => {
          const targetId = selectedId ?? current.id;
          if (targetId !== null) {
            const selected = payload.items.find((item) => item.id === targetId);
            if (selected) {
              return noteToForm(selected);
            }
          }

          if (payload.items.length > 0 && current.title === "" && current.bodyMarkdown === "") {
            return noteToForm(payload.items[0]);
          }

          if (payload.items.length === 0 && targetId !== null) {
            return { ...EMPTY_FORM, noteDate: new Date().toISOString().slice(0, 10) };
          }

          return current;
        });
      } catch (error) {
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError("日誌一覧の取得に失敗しました。");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [query.dateFrom, query.dateTo, query.q],
  );

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((left, right) => {
        if (left.note_date === right.note_date) {
          return right.updated_at.localeCompare(left.updated_at);
        }
        return right.note_date.localeCompare(left.note_date);
      }),
    [notes],
  );

  const openCreateForm = () => {
    setForm({ ...EMPTY_FORM, noteDate: new Date().toISOString().slice(0, 10) });
    setSaveError(null);
    setSaveMessage(null);
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
      if (form.id === null) {
        const created = await apiFetch<NoteRecord>("/notes", {
          method: "POST",
          body: JSON.stringify({
            note_date: form.noteDate,
            title: form.title,
            body_markdown: form.bodyMarkdown,
          }),
        });
        setForm(noteToForm(created));
        setSaveMessage("日誌を NAS に保存しました。");
        await fetchNotes(created.id);
      } else {
        const updated = await apiFetch<NoteRecord>(`/notes/${form.id}`, {
          method: "PUT",
          body: JSON.stringify({
            note_date: form.noteDate,
            title: form.title,
            body_markdown: form.bodyMarkdown,
          }),
        });
        setForm(noteToForm(updated));
        setSaveMessage("日誌を NAS 上で更新しました。");
        await fetchNotes(updated.id);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError("日誌の保存に失敗しました。");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async () => {
    if (form.id === null) {
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      await apiFetch(`/notes/${form.id}`, { method: "DELETE" });
      setSaveMessage("日誌を削除しました。");
      openCreateForm();
      await fetchNotes(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError("日誌の削除に失敗しました。");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const applyFilters = async () => {
    await fetchNotes(form.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Notes"
        title="日誌"
        description="研究室内 NAS に Markdown 形式で保存し、1日1件の日誌を作成・再編集できます。"
        actions={<ToolbarButton label="新規作成" onClick={openCreateForm} tone="primary" />}
      />

      {loadError ? (
        <Panel title="接続状態" description="日誌機能の初期化でエラーが発生しました。">
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </p>
        </Panel>
      ) : null}

      <Panel
        title="保存先"
        description="日誌は backend 経由で研究室内 NAS に保存されます。研究室ネットワーク外からは利用できません。"
      >
        <div className="flex flex-wrap items-center gap-3">
          <ToolbarButton label="再読み込み" onClick={() => void fetchNotes(form.id)} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="日誌一覧" description="検索と日付フィルタで一覧を絞り込みます。">
          <div className="space-y-4">
            <FilterBar>
              <FilterField
                label="検索"
                placeholder="タイトル、本文"
                value={query.q}
                onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value }))}
                wide
              />
              <FilterField
                label="開始日"
                type="date"
                value={query.dateFrom}
                onChange={(event) => setQuery((current) => ({ ...current, dateFrom: event.target.value }))}
              />
              <FilterField
                label="終了日"
                type="date"
                value={query.dateTo}
                onChange={(event) => setQuery((current) => ({ ...current, dateTo: event.target.value }))}
              />
              <div className="ml-auto flex items-end">
                <ToolbarButton label="検索" onClick={() => void applyFilters()} />
              </div>
            </FilterBar>
            <DataTable columns={["日付", "タイトル", "更新", "状態"]}>
              {isLoading ? (
                <DataRow cells={["読み込み中...", "-", "-", "-"]} />
              ) : sortedNotes.length === 0 ? (
                <DataRow cells={["-", "日誌がありません", "-", "-"]} />
              ) : (
                sortedNotes.map((item) => (
                  <DataRow
                    key={item.id}
                    cells={[
                      item.note_date,
                      <button key="title" className="text-left" onClick={() => selectNote(item)} type="button">
                        <p className="font-semibold text-slate-950">{item.title || "(無題)"}</p>
                        <p className="mt-1 text-xs text-slate-500">{excerpt(item.body_markdown)}</p>
                      </button>,
                      toTime(item.updated_at),
                      form.id === item.id ? "編集中" : "保存済み",
                    ]}
                  />
                ))
              )}
            </DataTable>
          </div>
        </Panel>

        <Panel title="編集エリア" description="記録日と本文を編集し、プレビューで確認できます。">
          <div className="space-y-4">
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
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">記録日</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  onChange={(event) => setForm((current) => ({ ...current, noteDate: event.target.value }))}
                  type="date"
                  value={form.noteDate}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">タイトル</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  value={form.title}
                />
              </label>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-950">Markdown 本文</p>
                <textarea
                  className="min-h-72 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700"
                  onChange={(event) => setForm((current) => ({ ...current, bodyMarkdown: event.target.value }))}
                  value={form.bodyMarkdown}
                />
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-950">プレビュー</p>
                  <ToolbarButton
                    label={isPreview ? "編集へ戻る" : "プレビュー切替"}
                    onClick={() => setIsPreview((current) => !current)}
                  />
                </div>
                {isPreview ? (
                  <div className="min-h-72 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                    <pre className="whitespace-pre-wrap">{form.bodyMarkdown || "(本文なし)"}</pre>
                  </div>
                ) : (
                  <div className="min-h-72 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-500">
                    プレビュー切替で表示します。
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ToolbarButton
                label={isSaving ? "保存中..." : "保存"}
                onClick={() => void saveNote()}
                tone="primary"
              />
              <ToolbarButton disabled={form.id === null || isSaving} label="削除" onClick={() => void deleteNote()} />
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
    bodyMarkdown: note.body_markdown,
  };
}

function excerpt(value: string): string {
  if (!value) {
    return "(本文なし)";
  }
  return value.length > 56 ? `${value.slice(0, 56)}...` : value;
}

function toTime(value: string): string {
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
