import { aggregateItems } from "@/mocks/app-data";
import { DataRow, DataTable } from "@/components/ui/data-table";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ToolbarButton } from "@/components/ui/toolbar-button";

export function AdminAggregatesPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Admin Aggregates"
        title="集計 / CSV 出力"
        description="期間指定、ユーザー別集計テーブル、CSV 出力導線の見た目を先に揃えます。"
        actions={
          <>
            <ToolbarButton label="再集計" />
            <ToolbarButton label="CSV 出力" tone="primary" />
          </>
        }
      />

      <Panel title="集計条件" description="期間指定と部屋フィルタを同じフォーム行に載せます。">
        <FilterBar>
          <FilterField label="開始日" value="2026-03-01" />
          <FilterField label="終了日" value="2026-03-31" />
          <FilterField label="部屋" value="すべて" />
        </FilterBar>
      </Panel>

      <Panel title="ユーザー別集計" description="合計時間、出勤日数、平均時間を一覧で確認します。">
        <DataTable columns={["ユーザー", "合計時間", "出勤日数", "平均時間"]}>
          {aggregateItems.map((item) => (
            <DataRow
              key={item.id}
              cells={[item.memberName, item.totalHours, item.workdays, item.averageHours]}
            />
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
