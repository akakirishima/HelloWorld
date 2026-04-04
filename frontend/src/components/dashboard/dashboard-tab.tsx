import { cn } from "@/lib/utils";

export function DashboardTab(props: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: "default" | "fullscreen";
}) {
  const variant = props.variant ?? "default";

  return (
    <button
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        variant === "fullscreen"
          ? "border-white/18 bg-white/10 text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur hover:bg-white/16"
          : "border-slate-200",
        props.label === "研究室全体" && (variant === "fullscreen" ? "px-5" : "px-5"),
        props.active
          ? variant === "fullscreen"
            ? "border-white/40 bg-white text-[#4d6540] shadow-[0_10px_24px_rgba(32,48,21,0.22)]"
            : "bg-slate-950 text-white"
          : variant === "fullscreen"
            ? "text-white/88"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
      onClick={props.onClick}
      type="button"
    >
      {props.label}
    </button>
  );
}
