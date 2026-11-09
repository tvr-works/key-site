import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { verifyDeployment } from "../../scripts/verify-deployment.mjs"

const commit = "a".repeat(40)
const options = {
  url: "https://abcd1234.key-site.pages.dev",
  mode: "preview",
  expectedCommit: commit,
  expectedBranch: "codex/ci-pages-gate",
}
const image = readFileSync(
  new URL("../../public/assets/og-card.jpg", import.meta.url)
)
const html = `<html><head>
<meta content="https://key.tvr.works/assets/og-card.jpg" property="og:image">
<meta name="twitter:image" content="https://key.tvr.works/assets/og-card.jpg">
<link href="https://key.tvr.works/" rel="canonical"></head><body>
${["use", "authenticate", "sync", "recover"].map((id) => `<article id="details-${id}">Content</article>`).join("")}</body></html>`
const headers = {
  "content-type": "text/html",
  "x-robots-tag": "noindex",
  "content-security-policy":
    "script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
}

function responses({
  info = {},
  homepage = html,
  publicBuild = false,
  origin = options.url,
} = {}) {
  const request = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input))
    expect(url.origin).toBe(origin)
    if (url.pathname === "/build-info.json")
      return Response.json({
        repository: "tvr-works/key-site",
        commit,
        branch: options.expectedBranch,
        dirty: false,
        ...info,
      })
    if (url.pathname === "/") {
      const policy = new Headers(headers)
      if (publicBuild) policy.delete("x-robots-tag")
      return new Response(homepage, { headers: policy })
    }
    if (url.pathname === "/assets/og-card.jpg")
      return new Response(new Uint8Array(image), {
        headers: { "content-type": "image/jpeg" },
      })
    if (url.pathname === "/robots.txt")
      return new Response(
        "User-agent: *\nAllow: /\n\nSitemap: https://key.tvr.works/sitemap.xml\n"
      )
    if (url.pathname === "/sitemap.xml")
      return new Response(
        '<?xml version="1.0"?><urlset><url><loc>https://key.tvr.works/</loc></url></urlset>'
      )
    return new Response(
      '<main><a href="/">Home</a></main><meta name="robots" content="noindex">',
      { status: 404 }
    )
  })
  vi.stubGlobal("fetch", request)
  return request
}
afterEach(() => vi.unstubAllGlobals())

describe("deployment verification", () => {
  it("checks the supplied preview and preserves edge-only noindex", async () => {
    const request = responses()
    await expect(verifyDeployment(options)).resolves.toBeUndefined()
    expect(request).toHaveBeenCalledTimes(6)
  })
  it("rejects a stale commit before inspecting other content", async () => {
    const request = responses({ info: { commit: "b".repeat(40) } })
    await expect(verifyDeployment(options)).rejects.toThrow("Deployed commit")
    expect(request).toHaveBeenCalledTimes(1)
  })
  it.each([
    { branch: "main" },
    { repository: "tvr-works/company-site" },
    { dirty: true },
  ])("rejects the wrong source identity: %j", async (info) => {
    responses({ info })
    await expect(verifyDeployment(options)).rejects.toThrow()
  })
  it("checks public delivery without silently using the public alias", async () => {
    responses({
      info: { branch: "main" },
      publicBuild: true,
      origin: "https://key.tvr.works",
    })
    await expect(
      verifyDeployment({
        ...options,
        url: "https://key.tvr.works",
        mode: "production",
        expectedBranch: "main",
      })
    ).resolves.toBeUndefined()
  })

  it("expects edge noindex on an immutable production URL without treating its HTML as preview", async () => {
    responses({ info: { branch: "main" } })
    await expect(
      verifyDeployment({
        ...options,
        mode: "production",
        expectedBranch: "main",
      })
    ).resolves.toBeUndefined()
  })
  it("rejects preview/public edge-policy mismatches", async () => {
    responses({ publicBuild: true })
    await expect(verifyDeployment(options)).rejects.toThrow("edge indexing")
  })
  it("rejects an unrelated matching link in place of the canonical", async () => {
    responses({ homepage: html.replace('rel="canonical"', 'rel="alternate"') })
    await expect(verifyDeployment(options)).rejects.toThrow("Canonical URL")
  })
  it.each([
    { expectedCommit: "short" },
    { expectedBranch: "" },
    { mode: "public" },
    { url: "https://user:password@example.com" },
    { mode: "production" },
  ])("rejects invalid verification context: %j", async (invalid) => {
    const request = responses()
    await expect(verifyDeployment({ ...options, ...invalid })).rejects.toThrow()
    expect(request).not.toHaveBeenCalled()
  })
})
