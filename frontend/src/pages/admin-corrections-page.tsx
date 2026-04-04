import { correctionItems } from "@/mocks/app-data";
import { DataRow, DataTable } from "@/components/ui/data-table";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ToolbarButton } from "@/components/ui/toolbar-button";

export function AdminCorrectionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Admin Corrections"
        title="勤怠修正"
        description="対象ユーザー、日付、修正理由をセットで扱う画面の骨格です。"
        actions={<ToolbarButton label="修正を作成" tone="primary" />}
      />

      <Panel title="検索条件" description="修正対象を素早く絞り込める横並びの検索行です。">
        <FilterBar>
          <FilterField label="ユーザー検索" placeholder="表示名またはユーザーID" wide />
          <FilterField label="対象日" value="2026-03-05" />
          <FilterField label="修正理由" value="すべて" />
        </FilterBar>
      </Panel>

      <Panel title="修正履歴" description="修正前後と理由が一画面で追えるようにします。">
        <DataTable columns={["対象者", "日付", "修正前", "修正後", "理由", "修正者"]}>
          {correctionItems.map((item) => (
            <DataRow
              key={item.id}
              cells={[
                item.memberName,
                item.date,
                item.before,
                item.after,
                item.reason,
                item.actor,
              ]}
            />
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
