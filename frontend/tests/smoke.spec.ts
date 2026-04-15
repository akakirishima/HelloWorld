import { expect, test } from "@playwright/test";

test("管理者で主要画面と board 専用ページを表示できる", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();

  await page.getByLabel("ユーザーID").fill("admin");
  await page.getByLabel("パスワード").fill("admin1234");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "在室ステータスマトリクス / 研究室全体", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("情報処理研究室", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^E103$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^E710$/ })).toBeVisible();

  await page.getByRole("button", { name: /^E710$/ }).click();
  await expect(page.getByTestId("status-card-grid")).toBeVisible();
  expect(await page.locator("[data-testid='status-card-grid'] article").count()).toBeGreaterThan(0);
  await expect(page.getByText("Shimizu Yuichiro", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Lab", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("class", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Home", { exact: true }).first()).toBeVisible();

  const takahashiCard = page
    .locator("[data-testid='status-card-grid'] article", { hasText: "高橋 未来" })
    .first();
  await takahashiCard.getByRole("button", { name: "Home" }).click();

  const boardPagePromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "掲示板を開く" }).click();
  const boardPage = await boardPagePromise;
  await boardPage.waitForLoadState();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(boardPage).toHaveURL(/\/admin\/dashboard\/board$/);
  await expect(boardPage.getByText("Laboratory Board")).toHaveCount(0);
  await expect(boardPage.getByText("情報処理研究室", { exact: true })).toHaveCount(0);
  await expect(boardPage.getByText("研究室全体", { exact: true })).toHaveCount(0);
  await expect(boardPage.getByTestId("status-card-grid")).toBeVisible();
  await expect(boardPage.getByText("高橋 未来", { exact: false }).first()).toBeVisible();
  await expect(boardPage.getByText("長谷川 澪", { exact: false }).first()).toBeVisible();
  await expect(boardPage.getByText("中村 彩", { exact: false }).first()).toBeVisible();
  expect(await boardPage.locator("[data-testid='status-card-grid'] article").count()).toBe(3);
  await expect(boardPage.getByText("山田 智也", { exact: false })).toHaveCount(0);

  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await page.goto("/sessions");
  await expect(page.getByRole("heading", { name: "勤怠履歴", exact: true })).toBeVisible();
  await expect(page.getByText("読み込み中...")).toHaveCount(0);

  await page.goto("/notes");
  await expect(page.getByRole("heading", { name: "日誌", exact: true })).toBeVisible();
});
