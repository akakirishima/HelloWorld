import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

import { ApiError } from "@/api/client";
import { useAuth } from "@/features/auth/auth-context";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
    newPassword: z.string().min(8, "新しいパスワードは 8 文字以上で入力してください"),
    confirmPassword: z.string().min(8, "確認用パスワードを入力してください"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "確認用パスワードが一致しません",
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, isLoading, user } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  if (!isLoading && user === null) {
    return <Navigate replace to="/login" />;
  }

  if (user && !user.mustChangePassword) {
    return <Navigate replace to={user.role === "admin" ? "/admin/dashboard" : "/notes"} />;
  }

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitError(null);

    try {
      const nextUser = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      navigate(nextUser.role === "admin" ? "/admin/dashboard" : "/notes", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }

      setSubmitError("パスワード変更に失敗しました。");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f4f8fb_0%,_#eef3f2_100%)] px-4 py-8">
      <div className="w-full max-w-[640px] rounded-[36px] border border-white/80 bg-white/88 p-8 shadow-panel backdrop-blur">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">
            First Sign In
          </p>
          <h1 className="text-3xl font-semibold text-slate-950">初回パスワード変更</h1>
          <p className="text-sm leading-6 text-slate-600">
            初期パスワードのまま通常画面へ進めない運用にしています。最初に新しいパスワードへ変更してください。
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <Field
            error={form.formState.errors.currentPassword?.message}
            label="現在のパスワード"
            registration={form.register("currentPassword")}
            type="password"
          />
          <Field
            error={form.formState.errors.newPassword?.message}
            label="新しいパスワード"
            registration={form.register("newPassword")}
            type="password"
          />
          <Field
            error={form.formState.errors.confirmPassword?.message}
            label="新しいパスワード（確認）"
            registration={form.register("confirmPassword")}
            type="password"
          />

          {submitError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submitError}
            </div>
          ) : null}

          <button
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
            disabled={form.formState.isSubmitting}
            type="submit"
          >
            {form.formState.isSubmitting ? "変更中..." : "パスワードを変更"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  type: string;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      <input
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500"
        type={props.type}
        {...props.registration}
      />
      <span className="text-sm text-rose-600">{props.error}</span>
    </label>
  );
}
