/**
 * E2E tests for the Legal AI resources catalog.
 *
 * Test user: e2e@accelerate.local / E2eTestPass1! (session loaded from e2e/.auth/user.json)
 *
 * Key source facts used by these selectors:
 *  - ResourcesView.tsx: PageHeader eyebrow "Knowledge", title "Resources"
 *  - TableToolbar tabs: All / Corpora / Benchmarks / Sources (RESOURCE_TABS)
 *  - PageHeader search action placeholder: "Search resources"
 *  - ResourceFacetFilter triggers: aria-label "Filter by language" / "Filter by jurisdiction"
 *  - Clicking a row opens ResourceDetailPanel, closed by the "Close details" icon button
 *  - The page renders from the bundled dataset when the catalog is unseeded, so
 *    these tests pass with or without `npm run sync:resources` having run.
 *  - Attribution link text: "Awesome-LegalAI-Resources" (required by the licence)
 */
import { test, expect } from "@playwright/test";

test.describe("Resources", () => {
    test("catalog page loads with the seeded or bundled dataset", async ({
        page,
    }) => {
        await page.goto("/resources");

        await expect(page).toHaveURL(/\/resources/, { timeout: 10_000 });
        await expect(
            page.getByRole("heading", { name: "Resources" }),
        ).toBeVisible({ timeout: 10_000 });

        // A known upstream corpus. REGRESSION: fails if the dataset stops
        // shipping, the route breaks, or the bundled fallback is removed.
        await expect(
            page.getByText("MultiLegalPile", { exact: true }),
        ).toBeVisible({ timeout: 10_000 });
    });

    test("attribution back to the upstream list is always present", async ({
        page,
    }) => {
        await page.goto("/resources");

        // The upstream licence requires this link; it is not decorative.
        const attribution = page.getByRole("link", {
            name: "Awesome-LegalAI-Resources",
        });
        await expect(attribution).toBeVisible({ timeout: 10_000 });
        await expect(attribution).toHaveAttribute(
            "href",
            "https://github.com/CSHaitao/Awesome-LegalAI-Resources",
        );
    });

    test("search narrows the catalog", async ({ page }) => {
        await page.goto("/resources");
        await expect(
            page.getByText("MultiLegalPile", { exact: true }),
        ).toBeVisible({ timeout: 10_000 });

        await page.getByPlaceholder("Search resources").fill("LeCaRD");

        await expect(page.getByText("LeCaRD", { exact: true })).toBeVisible({
            timeout: 10_000,
        });
        await expect(
            page.getByText("MultiLegalPile", { exact: true }),
        ).toHaveCount(0, { timeout: 10_000 });
    });

    test("the kind tabs filter to one kind at a time", async ({ page }) => {
        await page.goto("/resources");
        await expect(
            page.getByText("MultiLegalPile", { exact: true }),
        ).toBeVisible({ timeout: 10_000 });

        await page.getByRole("button", { name: "Sources" }).click();

        // A research website, which is a `website` and not a corpus.
        await expect(
            page.getByText("courtlistener.com", { exact: true }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
            page.getByText("MultiLegalPile", { exact: true }),
        ).toHaveCount(0, { timeout: 10_000 });
    });

    test("a row opens a detail panel with its outbound links", async ({
        page,
    }) => {
        await page.goto("/resources");

        const row = page.getByText("MultiLegalPile", { exact: true });
        await expect(row).toBeVisible({ timeout: 10_000 });
        await row.click();

        const panel = page.getByLabel("MultiLegalPile details");
        await expect(panel).toBeVisible({ timeout: 10_000 });
        await expect(panel.getByRole("link", { name: /Dataset/ })).toBeVisible();
        await expect(panel.getByRole("link", { name: /Paper/ })).toBeVisible();

        await panel.getByRole("button", { name: "Close details" }).click();
        await expect(panel).toHaveCount(0, { timeout: 10_000 });
    });

    test("the command palette reaches the catalog", async ({ page }) => {
        await page.goto("/assistant");
        await page.waitForLoadState("networkidle");

        await page.keyboard.press("ControlOrMeta+k");
        const palette = page.getByRole("dialog", { name: "Command palette" });
        await expect(palette).toBeVisible({ timeout: 10_000 });

        await palette.getByLabel("Search").fill("Resources");
        await palette.getByRole("button", { name: "Resources" }).first().click();

        await expect(page).toHaveURL(/\/resources/, { timeout: 10_000 });
    });
});
