import { AxeBuilder } from "@axe-core/playwright"
import { test, expect } from "./fixtures"
import { chapters, installCommand } from "../../src/content/chapters"
import { commandWalkthrough } from "../../src/content/command-walkthrough"

test("hydrates all articles and keeps chapter navigation and reading positions usable", async ({
  page,
}) => {
  const response = await page.goto("/")
  const html = await response!.text()
  for (const chapter of chapters)
    expect(html).toContain(`id="details-${chapter.id}"`)
  await expect(page).toHaveTitle("key — macOS CLI password vault with Touch ID")
  await expect(
    page.getByRole("button", { name: "Play chapters" })
  ).toBeVisible()
  await expect(page.locator("vite-error-overlay")).toHaveCount(0)
  for (const chapter of chapters) {
    await page
      .getByRole("tab", {
        name: new RegExp(`${chapter.number}\\s*${chapter.label}`),
      })
      .click()
    await expect(page.locator(".chapter-panel:not([hidden])")).toHaveCount(1)
    await expect(page.locator("article")).toHaveCount(4)
    await expect(
      page.getByRole("article", { name: chapter.detail, exact: true })
    ).toBeVisible()
    await expect(
      page.locator(".use-demo, .auth-demo, .sync-demo, .recover-demo")
    ).toHaveCount(1)
    await page.getByRole("button", { name: "Go deeper" }).click()
    const article = page.getByRole("heading", {
      name: chapter.detail,
      exact: true,
    })
    await expect(article).toBeFocused()
    await expect(article).toBeInViewport()
    await page.getByRole("button", { name: "Back to overview" }).click()
    const overview = page.getByRole("heading", {
      name: chapter.title.replace("\n", " "),
      exact: true,
    })
    await expect(overview).toBeFocused()
    await expect(overview).toBeInViewport()
  }
  await page.getByRole("tab", { name: /01\s*Use/ }).click()
  for (const [index, command] of commandWalkthrough.entries()) {
    const button = page.getByRole("button", {
      name: `0${index + 1} ${command.label}`,
      exact: true,
    })
    await button.click()
    await expect(button).toHaveAttribute("aria-pressed", "true")
    await expect(page.locator(".demo-command code")).toHaveText(
      command.commands.join("\n")
    )
  }
  await page.getByRole("tab", { name: /02\s*Authenticate/ }).click()
  await page.getByRole("tab", { name: /01\s*Use/ }).click()
  await expect(
    page.getByRole("button", { name: "01 Add", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  const pane = page.getByRole("region", {
    name: "Use overview and explanation",
  })
  if (await pane.count())
    expect(await pane.evaluate((element) => element.scrollTop)).toBe(0)
})

test("keyboard orientation follows the actual viewport and reduced motion starts paused", async ({
  page,
}) => {
  await page.goto("/")
  const compact = (page.viewportSize()?.width || 0) < 768
  const use = page.getByRole("tab", { name: /01\s*Use/ })
  await use.focus()
  await page.keyboard.press(compact ? "ArrowRight" : "ArrowDown")
  const next = page.getByRole("tab", { name: /02\s*Authenticate/ })
  await expect(next).toBeFocused()
  await expect(next).toHaveAttribute("aria-selected", "true")
  await expect(
    page.getByRole("button", { name: "Play chapters" })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches
    )
  ).toBe(true)
})

test("copies the real installation command through the browser clipboard", async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === "chromium")
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/")
  await page.getByRole("button", { name: "Copy install commands" }).click()
  await expect(page.getByRole("status")).toHaveText("Copied to clipboard.")
  if (browserName === "chromium")
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      installCommand
    )
})

test("clipboard denial leaves selectable commands and explains the fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("Denied")) },
    })
  })
  await page.goto("/")
  await page.getByRole("button", { name: "Copy install commands" }).click()
  await expect(page.getByRole("status")).toHaveText(
    "Select the commands above to copy them manually."
  )
  await expect(page.locator(".install-code")).toHaveText(installCommand)
})

test("chapters reflow across the mobile boundary without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/")
  for (const width of [320, 390, 767, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => document.fonts.ready)
    for (const chapter of [chapters[2], chapters[3]]) {
      await page
        .getByRole("tab", {
          name: new RegExp(`${chapter.number}\\s*${chapter.label}`),
        })
        .click()
      await expect(page.locator(".chapter-panel:not([hidden])")).toHaveCount(1)
      await expect(
        page.getByRole("button", { name: "Go deeper" })
      ).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        `${width}px ${chapter.label}`
      ).toBe(true)
    }
  }
})

test("rendered chapters and their articles pass accessibility rules including contrast", async ({
  page,
}) => {
  await page.goto("/")
  for (const chapter of chapters) {
    await page
      .getByRole("tab", {
        name: new RegExp(`${chapter.number}\\s*${chapter.label}`),
      })
      .click()
    await expect(page.locator(".chapter-panel:not([hidden])")).toHaveCount(1)
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
      .analyze()
    expect(result.violations).toEqual([])
  }
})

test.describe("normal motion and real observers", () => {
  test.use({ reducedMotion: "no-preference" })
  test("plays only with the rail in view and brings a smooth-scrolled article onscreen", async ({
    page,
  }) => {
    await page.goto("/")
    const use = page.getByRole("tab", { name: /01\s*Use/ })
    const rail = page.locator(".chapter-rail")
    await expect(use).toHaveAttribute("aria-selected", "true")
    await rail.scrollIntoViewIfNeeded()
    await expect(
      page.getByRole("tab", { name: /02\s*Authenticate/ })
    ).toHaveAttribute("aria-selected", "true", { timeout: 18_000 })
    if ((page.viewportSize()?.width || 0) < 768)
      await page.locator("#install").scrollIntoViewIfNeeded()
    else
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" })
      )
    await expect(rail).not.toBeInViewport({ ratio: 0.25 })
    // Allow the real IntersectionObserver to report that the rail left the viewport.
    await page.waitForTimeout(300)
    const authProgress = page
      .getByRole("tab", { name: /02\s*Authenticate/ })
      .locator(".chapter-progress span")
    const stopped = await authProgress.getAttribute("style")
    await page.waitForTimeout(400)
    expect(await authProgress.getAttribute("style")).toBe(stopped)
    await rail.scrollIntoViewIfNeeded()
    await page.getByRole("button", { name: "Go deeper" }).click()
    await expect(
      page.getByRole("heading", { name: chapters[1].detail, exact: true })
    ).toBeFocused()
    await expect(
      page.getByRole("heading", { name: chapters[1].detail, exact: true })
    ).toBeInViewport()
    await expect(
      page.getByRole("button", { name: "Play chapters" })
    ).toBeVisible()
  })
})
