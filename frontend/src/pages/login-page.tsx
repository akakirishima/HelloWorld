import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

import { ApiError } from "@/api/client";
import { useAuth } from "@/features/auth/auth-context";

const loginSchema = z.object({
  userId: z.string().min(1, "ユーザーIDを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { isLoading, login, user } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: "",
      password: "",
    },
  });

  if (!isLoading && user !== null) {
    return (
      <Navigate
        replace
        to={user.mustChangePassword ? "/change-password" : user.role === "admin" ? "/admin/dashboard" : "/notes"}
      />
    );
  }

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);

    try {
      const nextUser = await login(values);
      navigate(
        nextUser.mustChangePassword ? "/change-password" : nextUser.role === "admin" ? "/admin/dashboard" : "/notes",
        { replace: true },
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }

      setSubmitError("ログインに失敗しました。");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="grid w-full max-w-3xl gap-4 lg:grid-cols-[1fr_360px]">

        {/* 説明パネル */}
        <section className="rounded-2xl bg-slate-800 p-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Lab Management</p>
          <h1 className="mt-4 text-2xl font-semibold leading-snug">
            研究室の在室・勤怠・<br />日誌をひとつにまとめる
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            メンバーの今の場所（ラボ・授業・帰宅）をひと目で確認でき、
            日誌の記録や勤怠の集計もこの画面から操作できます。
            アカウントは管理者が発行します。
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-500">—</span>在室ボードでメンバーの状況をリアルタイム把握</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-500">—</span>日誌・ノートを日付ごとに記録・閲覧</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-500">—</span>管理者は勤怠集計・メンバー設定を一元管理</li>
          </ul>
        </section>

        {/* ログインフォーム */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-800">ログイン</h2>

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">ユーザーID</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                {...form.register("userId")}
                autoComplete="username"
              />
              {form.formState.errors.userId && (
                <span className="text-xs text-rose-600">{form.formState.errors.userId.message}</span>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">パスワード</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                type="password"
                {...form.register("password")}
                autoComplete="current-password"
              />
              {form.formState.errors.password && (
                <span className="text-xs text-rose-600">{form.formState.errors.password.message}</span>
              )}
            </label>

            <button
              className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              disabled={form.formState.isSubmitting}
              type="submit"
            >
              {form.formState.isSubmitting ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          {submitError && (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              {submitError}
            </p>
          )}
        </section>

      </div>
    </div>
  );
}
