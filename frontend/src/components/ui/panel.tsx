import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PanelProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, description, children, className }: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-panel backdrop-blur",
        className,
      )}
    >
      {title ? (
        <div className="mb-4 space-y-1">
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
