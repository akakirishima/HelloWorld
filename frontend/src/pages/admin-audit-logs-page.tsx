import { auditLogItems } from "@/mocks/app-data";
import { DataRow, DataTable } from "@/components/ui/data-table";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

export function AdminAuditLogsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Admin Audit"
        title="監査ログ"
        description="actor, action, target, reason を検索付きの業務テーブルで確認する画面です。"
      />

      <Panel title="検索条件" description="最低限のキーだけを上段に置き、素早く絞り込める構成にしています。">
        <FilterBar>
          <FilterField label="actor" value="すべて" />
          <FilterField label="action" value="すべて" />
          <FilterField label="target" placeholder="users/..., sessions/..." wide />
        </FilterBar>
      </Panel>

      <Panel title="監査ログ一覧" description="変更操作の事実関係を即座に追えるよう、時刻と理由を強めに見せます。">
        <DataTable columns={["時刻", "actor", "action", "target", "reason"]}>
          {auditLogItems.map((item) => (
            <DataRow
              key={item.id}
              cells={[item.createdAt, item.actor, item.action, item.target, item.reason]}
            />
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
