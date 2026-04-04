import { adminMetrics } from "@/mocks/app-data";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { ToolbarButton } from "@/components/ui/toolbar-button";

const adminItems = [
  { title: "研究室設定", description: "研究室名と部屋一覧を管理し、全体 / 部屋別 dashboard を切り替える土台。" },
  { title: "ユーザー管理", description: "一覧、検索、新規作成、編集、無効化 / 再有効化の業務導線。" },
  { title: "勤怠修正", description: "対象ユーザーと日付からセッションを検索し、理由付きで修正。" },
  { title: "集計 / CSV", description: "期間指定でユーザー別集計を出し、CSV を出力する導線。" },
  { title: "監査ログ", description: "actor, action, target, reason を一覧で追える管理画面。" },
];

export function AdminPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Admin"
        title="管理画面トップ"
        description="KPI サマリと管理メニューを先に配置し、今後の CRUD 画面の入口を固定します。"
        actions={<ToolbarButton label="管理レポート" />}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        {adminMetrics.map((metric) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} delta={metric.helper} />
        ))}
      </div>

      <Panel title="管理メニュー" description="各画面は同じ検索パネルと結果テーブルの構造で揃えます。">
        <div className="grid gap-4 md:grid-cols-2">
          {adminItems.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
              <p className="text-lg font-semibold text-slate-950">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
