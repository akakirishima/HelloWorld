import { cn } from "@/lib/utils";

type ToolbarButtonProps = {
  label: string;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  dataTestId?: string;
};

export function ToolbarButton({
  label,
  tone = "secondary",
  disabled = false,
  onClick,
  type = "button",
  dataTestId,
}: ToolbarButtonProps) {
  return (
    <button
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        tone === "primary"
          ? "bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-100"
          : tone === "danger"
          ? "bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-400"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
      )}
      data-testid={dataTestId}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {label}
    </button>
  );
}
