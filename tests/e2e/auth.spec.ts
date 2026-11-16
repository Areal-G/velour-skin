import { expect, test } from "./fixtures";

test.describe("demo customer", () => {
  test("every visitor is already signed in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("account-link")).toHaveAccessibleName("My account");

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Welcome, Adaeze" })).toBeVisible();
    await expect(page.getByText("adaeze@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  });

  test("order history and order details work straight away", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Order #/ })).toHaveCount(6);

    await page.getByRole("link", { name: /^Order #/ }).first().click();
    await expect(page.getByText("245 W 17th St")).toBeVisible();
  });

  test("sign-in and sign-up pages lead to the account", async ({ page }) => {
    await page.goto("/account/login");
    await expect(page).toHaveURL(/\/account$/);
    await page.goto("/account/register");
    await expect(page).toHaveURL(/\/account$/);
  });
});
