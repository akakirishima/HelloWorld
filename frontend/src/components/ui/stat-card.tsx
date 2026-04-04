import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  delta: string;
  tone?: "neutral" | "success" | "warning";
};

const toneMap = {
  neutral: "bg-white text-slate-950",
  success: "bg-emerald-50 text-emerald-950",
  warning: "bg-amber-50 text-amber-950",
};

export function StatCard({ label, value, delta, tone = "neutral" }: StatCardProps) {
  return (
    <div className={cn("rounded-[24px] border border-slate-200 p-5 shadow-soft", toneMap[tone])}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{delta}</p>
    </div>
  );
}
