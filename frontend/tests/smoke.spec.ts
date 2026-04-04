import { expect, test } from "@playwright/test";

test("管理者で主要画面と board 専用ページを表示できる", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();

  await page.getByLabel("ユーザーID").fill("admin");
  await page.getByLabel("パスワード").fill("admin1234");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole("heading", { name: "在室ステータスボード", exact: true })).toBeVisible();
  await expect(page.getByText("情報処理研究室", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^E103$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^E710$/ })).toBeVisible();

  await page.getByRole("button", { name: /^E710$/ }).click();
  expect(await page.locator("[data-testid^='matrix-row-']").count()).toBeGreaterThan(0);
  await expect(page.getByText("Shimizu Yuichiro", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("(M2)", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "研究室全体" }).click();
  await page.getByTestId("matrix-cell-nakashima-remon-room").click();
  await expect(page.getByLabel("Nakashima Remon: Room")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nakashima Remon: Room")).toBeVisible();

  const boardPagePromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "掲示板を開く" }).click();
  const boardPage = await boardPagePromise;
  await boardPage.waitForLoadState();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(boardPage).toHaveURL(/\/admin\/dashboard\/board$/);
  await expect(boardPage.getByRole("heading", { name: "情報処理研究室", exact: true })).toBeVisible();
  await expect(boardPage.getByText("研究室業務 UI")).toHaveCount(0);
  await expect(boardPage.getByRole("button", { name: "戻る" })).toHaveCount(0);

  const board = boardPage.getByTestId("fullscreen-board");
  await expect(board).toBeVisible();
  await board.getByTestId("matrix-cell-tunn-cho-lwin-home").click();
  await expect(board.getByLabel("Tunn Cho Lwin: Off Campus")).toBeVisible();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await page.goto("/sessions");
  await expect(page.getByRole("heading", { name: "勤怠履歴", exact: true })).toBeVisible();
  await expect(page.getByText("読み込み中...")).toHaveCount(0);

  await page.goto("/notes");
  await expect(page.getByRole("heading", { name: "日誌", exact: true })).toBeVisible();
});
