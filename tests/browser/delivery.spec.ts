import sharp from "sharp"
import { test, expect } from "./fixtures"

const production = process.env.SITE_DEPLOYMENT_MODE !== "preview"

test(
  "static delivery preserves metadata, indexing, security, images, and source identity",
  { tag: "@artifact" },
  async ({ page, request }) => {
    const response = await request.get("/")
    expect(response.status()).toBe(200)
    const html = await response.text()
    for (const id of ["use", "authenticate", "sync", "recover"])
      expect(html).toContain(`id="details-${id}"`)
    await page.goto("/")
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://key.tvr.works/"
    )
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://key.tvr.works/assets/og-card.jpg"
    )
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      "https://key.tvr.works/assets/og-card.jpg"
    )
    expect(await page.locator('meta[name="robots"]').count()).toBe(0)
    if (production) expect(response.headers()["x-robots-tag"]).toBeUndefined()
    else expect(response.headers()["x-robots-tag"]).toBe("noindex")
    const csp = response.headers()["content-security-policy"]
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toMatch(/unsafe-eval/)
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(response.headers()["x-content-type-options"]).toBe("nosniff")
    expect(response.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin"
    )
    expect(response.headers()["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=()"
    )
    const image = await request.get("/assets/og-card.jpg")
    expect(image.status()).toBe(200)
    expect(image.headers()["content-type"]).toContain("image/jpeg")
    expect(await sharp(await image.body()).metadata()).toMatchObject({
      width: 1200,
      height: 630,
      format: "jpeg",
    })
    const robots = await request.get("/robots.txt")
    expect(robots.status()).toBe(200)
    expect(await robots.text()).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://key.tvr.works/sitemap.xml\n"
    )
    const sitemap = await request.get("/sitemap.xml")
    expect(sitemap.status()).toBe(200)
    expect((await sitemap.text()).match(/<loc>.*?<\/loc>/g)).toEqual([
      "<loc>https://key.tvr.works/</loc>",
    ])
    const manifest = await request.get("/build-info.json")
    expect(manifest.status()).toBe(200)
    const info = await manifest.json()
    expect(info.repository).toBe("tvr-works/key-site")
    expect(info.commit).toMatch(/^[a-f0-9]{40}$/)
    expect(info.branch).toBeTruthy()
    expect(info.node).toBe("26.13.0")
    expect(info.npm).toBe("npm/11.20.0")
    if (process.env.CI) {
      expect(info.commit).toBe(process.env.GITHUB_SHA)
      expect(info.dirty).toBe(false)
    }
  }
)

test.describe("without application JavaScript", () => {
  test.use({ javaScriptEnabled: false })
  test(
    "serves meaningful HTML and a real static 404 with a working home link",
    { tag: "@artifact" },
    async ({ page }) => {
      const response = await page.goto("/")
      expect(response?.status()).toBe(200)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expect(
        page.getByRole("article", { name: "Use Key in pipes and scripts" })
      ).toBeVisible()
      const missing = await page.goto("/missing-ci-check")
      expect(missing?.status()).toBe(404)
      await expect(
        page.getByRole("heading", { name: "Page not found." })
      ).toBeVisible()
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex"
      )
      await page.getByRole("link", { name: "Back to key" }).click()
      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    }
  )
})
