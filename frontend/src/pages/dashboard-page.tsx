import { StatusMatrixBoard } from "@/components/dashboard/status-matrix-board";
import { DashboardTab } from "@/components/dashboard/dashboard-tab";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { useDashboardBoard } from "@/features/lab-board/use-dashboard-board";

export function DashboardPage() {
  const {
    activeRooms,
    boardSummary,
    effectiveScope,
    handleCellSelect,
    isLoaded,
    labName,
    scopeLabel,
    setSelectedScope,
    statusError,
    visibleRows,
  } = useDashboardBoard();

  if (!isLoaded) {
    return (
      <Panel title="在室ステータスボード" description="研究室設定とメンバー一覧を読み込んでいます。">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          読み込み中...
        </div>
      </Panel>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader
          eyebrow="Dashboard"
          title="在室ステータスボード"
          description="研究室全体と各部屋を切り替えながら、誰が今どこにいるかを 1 枚の掲示板で更新できます。"
        />

        <div className="flex flex-wrap gap-2 rounded-[24px] border border-slate-200 bg-white/82 p-3 shadow-soft">
          <div className="flex min-w-[220px] flex-1 flex-col justify-center rounded-[18px] bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">研究室</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{labName}</p>
          </div>
          <DashboardTab
            active={effectiveScope === "all"}
            label="研究室全体"
            onClick={() => setSelectedScope("all")}
          />
          {activeRooms.map((room) => (
            <DashboardTab
              key={room.id}
              active={effectiveScope === room.id}
              label={room.name}
              onClick={() => setSelectedScope(room.id)}
            />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {boardSummary.map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border border-slate-200 bg-white/82 px-4 py-4 shadow-soft"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>

        <Panel
          title={`在室ステータスマトリクス / ${scopeLabel}`}
          description="概要画面では current 状態を確認できます。直接更新と全画面運用は専用の掲示板ページで行います。"
        >
          {statusError ? (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {statusError}
            </p>
          ) : null}
          <div className="mb-4 flex justify-end">
            <ToolbarButton
              label="掲示板を開く"
              onClick={() => window.open("/admin/dashboard/board", "_blank", "noopener,noreferrer")}
              tone="primary"
            />
          </div>
          <StatusMatrixBoard interactive onCellSelect={handleCellSelect} rows={visibleRows} />
        </Panel>

        <Panel
          title="凡例"
          description="Home は Off Campus、Seminar Meeting は Seminar / Meeting 統合列として扱います。"
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <LegendCard
              title="研究室全体"
              body="全部屋のメンバーを 1 枚の board にまとめて表示します。"
            />
            <LegendCard
              title="部屋タブ"
              body="各部屋に所属するメンバーだけを抽出して表示します。"
            />
            <LegendCard
              title="青いマーカー"
              body="現在位置を表します。各メンバー行には 1 つだけ表示されます。"
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

function LegendCard(props: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-sm font-semibold text-slate-950">{props.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{props.body}</p>
    </div>
  );
}
