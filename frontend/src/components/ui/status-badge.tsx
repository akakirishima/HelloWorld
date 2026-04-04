type StatusBadgeProps = {
  tone?: "success" | "neutral" | "warning" | "danger" | "info";
  text: string;
};

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  success: "bg-emerald-100 text-emerald-900",
  neutral: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-rose-100 text-rose-900",
  info: "bg-sky-100 text-sky-900",
};

export function StatusBadge({ tone = "neutral", text }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {text}
    </span>
  );
}
