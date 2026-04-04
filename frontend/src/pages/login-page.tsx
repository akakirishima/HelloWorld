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
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f4f8fb_0%,_#eef3f2_100%)] px-4 py-8">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[36px] border border-slate-900/5 bg-slate-950 p-8 text-white shadow-panel lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-teal-300">
            Research Lab Operations
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-white lg:text-5xl">
            在室・勤怠・日誌を
            <br />
            業務画面として整える
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300">
            このシステムは 1 研究室専用で、管理者が部屋とメンバーアカウントを整備してから
            配布する運用を前提にしています。ログイン後は管理者フローとメンバーフローを分けます。
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <LoginFeature title="PC 主体" description="一覧と操作パネルを同居させる情報密度。" />
            <LoginFeature title="日本語 UI" description="研究室の運用現場に合わせた文言設計。" />
            <LoginFeature title="Clean Ops" description="装飾より読解速度を優先したトーン。" />
          </div>
          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            <p className="font-semibold text-white">開発用アカウント</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">admin / admin1234</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                shimizu-yuichiro / shimizu1234
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/80 bg-white/88 p-8 shadow-panel backdrop-blur">
          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              Sign In
            </p>
            <h2 className="text-2xl font-semibold">ログイン</h2>
            <p className="text-sm leading-6 text-slate-600">
              管理者が作成した ID とパスワードでログインします。初期パスワードのままでは通常画面へ進めません。
            </p>
          </div>

          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">ユーザーID</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500"
                {...form.register("userId")}
                placeholder="admin"
              />
              <span className="text-sm text-rose-600">{form.formState.errors.userId?.message}</span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">パスワード</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500"
                type="password"
                {...form.register("password")}
                placeholder="********"
              />
              <span className="text-sm text-rose-600">
                {form.formState.errors.password?.message}
              </span>
            </label>

            <button
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
              disabled={form.formState.isSubmitting}
              type="submit"
            >
              {form.formState.isSubmitting ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          {submitError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submitError}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function LoginFeature(props: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
      <p className="font-semibold text-white">{props.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{props.description}</p>
    </div>
  );
}
