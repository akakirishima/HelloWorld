import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { ApiError } from "@/api/client";
import { DataRow, DataTable } from "@/components/ui/data-table";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { useLabBoard } from "@/features/lab-board/lab-board-context";
import { academicGradeOrder } from "@/mocks/app-data";

const createUserSchema = z.object({
  userId: z.string().min(1, "ユーザーIDを入力してください"),
  fullName: z.string().min(1, "氏名を入力してください"),
  displayName: z.string().min(1, "表示名を入力してください"),
  password: z.string().min(8, "初期パスワードは 8 文字以上です"),
  role: z.enum(["admin", "member"]),
  academicGrade: z.enum(["Researcher", "B4", "M1", "M2", "D1", "D2", "D3"]),
  roomId: z.string(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export function AdminUsersPage() {
  const {
    activeRooms,
    createUser,
    isLoaded,
    state,
    updateUserGrade,
    updateUserRole,
    updateUserRoom,
  } = useLabBoard();

  const navigate = useNavigate();
  const location = useLocation();

  // Stage 1: どのユーザーの削除警告を展開中か
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // 削除成功後に戻ってきたときのバナー
  const deletedName =
    (location.state as { deletedName?: string } | null)?.deletedName ?? null;

  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      userId: "",
      fullName: "",
      displayName: "",
      password: "",
      role: "member",
      academicGrade: "M1",
      roomId: "",
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    setCreateMessage(null);
    setCreateError(null);

    try {
      await createUser({
        userId: values.userId,
        fullName: values.fullName,
        displayName: values.displayName,
        password: values.password,
        role: values.role,
        academicGrade: values.academicGrade,
        roomId: values.roomId.length > 0 ? values.roomId : null,
        isActive: true,
      });
      setCreateMessage("メンバーアカウントを作成しました。初期 ID / 初期パスワードを配布してください。");
      form.reset({
        userId: "",
        fullName: "",
        displayName: "",
        password: "",
        role: "member",
        academicGrade: "M1",
        roomId: "",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setCreateError(error.message);
        return;
      }

      setCreateError("ユーザー作成に失敗しました。");
    }
  };

  if (!isLoaded) {
    return (
      <Panel title="ユーザー管理" description="メンバー一覧を読み込んでいます。">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          読み込み中...
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Admin Users"
        title="ユーザー管理"
        description="管理者がメンバーアカウントを作成し、初期パスワードを配布する 1 研究室専用フローで運用します。"
      />

      {/* 削除完了バナー */}
      {deletedName && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span className="text-emerald-600">✓</span>
          {deletedName} を削除しました
        </div>
      )}

      <Panel
        title="新規メンバー登録"
        description="自己登録は使わず、ここで管理者がアカウントを作成します。初回ログイン後はパスワード変更が必須です。"
      >
        <form className="grid gap-4 xl:grid-cols-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            error={form.formState.errors.userId?.message}
            label="ユーザーID"
            placeholder="tanaka"
            registration={form.register("userId")}
          />
          <FormField
            error={form.formState.errors.fullName?.message}
            label="氏名"
            placeholder="田中 太郎"
            registration={form.register("fullName")}
          />
          <FormField
            error={form.formState.errors.displayName?.message}
            label="表示名"
            placeholder="田中 太郎"
            registration={form.register("displayName")}
          />
          <FormField
            error={form.formState.errors.password?.message}
            label="初期パスワード"
            placeholder="password123"
            registration={form.register("password")}
            type="password"
          />
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              ロール
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              {...form.register("role")}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              学年
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              {...form.register("academicGrade")}
            >
              {academicGradeOrder.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              所属部屋
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              {...form.register("roomId")}
            >
              <option value="">未所属</option>
              {activeRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>

          <div className="xl:col-span-4 flex flex-wrap items-center gap-3">
            <ToolbarButton
              label={form.formState.isSubmitting ? "登録中..." : "アカウントを作成"}
              tone="primary"
              type="submit"
            />
            {createMessage ? <p className="text-sm font-medium text-emerald-700">{createMessage}</p> : null}
            {createError ? <p className="text-sm font-medium text-rose-700">{createError}</p> : null}
          </div>
        </form>
      </Panel>

      <Panel title="検索と一覧" description="ロール、所属部屋、学年をこの場で更新できます。削除は各行の「削除」ボタンから行います。">
        <div className="space-y-4">
          <FilterBar>
            <FilterField label="検索" placeholder="ユーザーID、表示名" wide />
            <FilterField label="ロール" value="すべて" />
          </FilterBar>
          <DataTable
            columns={["ユーザーID", "表示名", "学年", "ロール", "部屋", "操作"]}
          >
            {state.users.map((item) => (
              <div key={item.id}>
                <DataRow
                  cells={[
                    item.userId,
                    item.displayName,
                    <select
                      key="grade"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                      data-testid={`user-grade-select-${item.id}`}
                      onChange={(event) =>
                        void updateUserGrade(
                          item.id,
                          event.target.value as (typeof academicGradeOrder)[number],
                        )
                      }
                      value={item.academicGrade}
                    >
                      {academicGradeOrder.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>,
                    <select
                      key="role"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                      data-testid={`user-role-select-${item.id}`}
                      onChange={(event) =>
                        void updateUserRole(item.id, event.target.value as "admin" | "member")
                      }
                      value={item.role}
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>,
                    <select
                      key="room"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                      data-testid={`user-room-select-${item.id}`}
                      onChange={(event) =>
                        void updateUserRoom(item.id, event.target.value.length > 0 ? event.target.value : null)
                      }
                      value={item.roomId ?? ""}
                    >
                      <option value="">未所属</option>
                      {activeRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>,
                    <ToolbarButton
                      key="delete"
                      label={pendingDeleteId === item.id ? "キャンセル" : "削除"}
                      tone={pendingDeleteId === item.id ? "secondary" : "danger"}
                      onClick={() =>
                        setPendingDeleteId(
                          pendingDeleteId === item.id ? null : item.id,
                        )
                      }
                    />,
                  ]}
                />

                {/* Stage 1: インライン警告バナー */}
                {pendingDeleteId === item.id && (
                  <div className="border-t border-rose-200 bg-rose-50 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-rose-800">
                        <span className="mr-2 font-bold">⚠️</span>
                        <strong>{item.displayName}（{item.userId}）</strong>{" "}
                        のアカウントとすべての関連データを削除しようとしています。
                        この操作は取り消せません。
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <ToolbarButton
                          label="キャンセル"
                          onClick={() => setPendingDeleteId(null)}
                        />
                        <ToolbarButton
                          label="削除確認ページへ進む →"
                          tone="danger"
                          onClick={() => {
                            navigate(
                              `/admin/users/delete/${item.id}`,
                              { state: { user: item } },
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </DataTable>
        </div>
      </Panel>
    </div>
  );
}

function FormField(props: {
  label: string;
  placeholder?: string;
  type?: string;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {props.label}
      </span>
      <input
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        {...props.registration}
      />
      <span className="text-sm text-rose-600">{props.error}</span>
    </label>
  );
}
