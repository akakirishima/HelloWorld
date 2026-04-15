import { StatusCardGrid } from "@/components/dashboard/status-card-grid";
import { DashboardTab } from "@/components/dashboard/dashboard-tab";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { useDashboardBoard } from "@/features/lab-board/use-dashboard-board";

export function DashboardPage() {
  const {
    activeRooms,
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
      <Panel title="在室ステータスマトリクス" description="研究室設定とメンバー一覧を読み込んでいます。">
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
          title="在室ステータスマトリクス / 研究室全体"
          description="概要画面はカード一覧で確認します。直接更新と全画面運用は専用の掲示板ページで行います。"
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

        <Panel
          title={`在室ステータスマトリクス / ${scopeLabel}`}
          description="この画面は確認専用です。状態の直接更新は専用の掲示板ページで行います。"
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
          <StatusCardGrid
            onSectionSelect={(rowId, section) => {
              if (section === "lab") {
                return handleCellSelect(rowId, "room");
              }
              return handleCellSelect(rowId, section);
            }}
            rows={visibleRows}
          />
        </Panel>

        <Panel
          title="凡例"
          description="カード下部の3分割は Lab / class / Home を表します。更新操作は専用の掲示板ページで行います。"
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <LegendCard
              title="研究室全体"
              body="2列グリッドでメンバーを一覧表示します。"
            />
            <LegendCard
              title="表示列"
              body="各カード下部を Lab / class / Home の 3 分割で見せます。"
            />
            <LegendCard
              title="current"
              body="現在位置はカードの色分けで読み取れます。"
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
