import type { ChangeEventHandler, ReactNode } from "react";

import { cn } from "@/lib/utils";

type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 lg:flex-row lg:flex-wrap lg:items-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

type FilterFieldProps = {
  label: string;
  placeholder?: string;
  value?: string;
  type?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  readOnly?: boolean;
  wide?: boolean;
};

export function FilterField({
  label,
  placeholder,
  value,
  type = "text",
  onChange,
  readOnly,
  wide = false,
}: FilterFieldProps) {
  const isReadOnly = readOnly ?? onChange === undefined;
  return (
    <label className={cn("flex min-w-[180px] flex-1 flex-col gap-2", wide && "lg:min-w-[280px]")}>
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <input
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={isReadOnly}
      />
    </label>
  );
}
