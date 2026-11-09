import assert from "node:assert/strict"
import { setTimeout } from "node:timers/promises"
import { JSDOM } from "jsdom"
import sharp from "sharp"

const repository = "tvr-works/key-site"
const publicOrigin = "https://key.tvr.works"

// Verify one explicitly supplied origin. Never substitute an older healthy alias.
export async function verifyDeployment({
  url,
  mode,
  expectedCommit,
  expectedBranch,
}) {
  const origin = new URL(url)
  assert.ok(
    origin.protocol === "https:" ||
      (origin.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(origin.hostname)),
    "Expected an HTTPS origin"
  )
  assert.ok(
    origin.pathname === "/" &&
      !origin.search &&
      !origin.hash &&
      !origin.username &&
      !origin.password,
    "Expected an origin without credentials or a path"
  )
  assert.match(
    expectedCommit,
    /^[a-f0-9]{40}$/u,
    "Expected the exact deployment commit"
  )
  assert.ok(expectedBranch?.trim(), "Expected the deployment branch")
  assert.ok(
    ["production", "preview"].includes(mode),
    "Expected production or preview mode"
  )
  if (mode === "production")
    assert.equal(expectedBranch, "main", "Production must be main")
  else
    assert.notEqual(
      expectedBranch,
      "main",
      "Preview must use a non-production branch"
    )

  const get = (path) =>
    fetch(new URL(path, origin), {
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
      cache: "no-store",
    })
  // Check identity before making claims about any HTML or asset response.
  const identity = await get("/build-info.json")
  assert.equal(identity.status, 200, "Deployment identity response")
  assert.match(identity.headers.get("content-type") || "", /application\/json/u)
  const info = await identity.json()
  assert.equal(info.repository, repository, "Deployment repository")
  assert.equal(
    info.commit,
    expectedCommit,
    "Deployed commit matches the requested release"
  )
  assert.equal(
    info.branch,
    expectedBranch,
    "Deployed branch matches the requested release"
  )
  assert.equal(info.dirty, false, "Deployment must use committed source")

  const response = await get("/")
  assert.equal(response.status, 200, "Homepage response")
  assert.match(response.headers.get("content-type") || "", /text\/html/u)
  const html = await response.text()
  const document = new JSDOM(html).window.document
  assert.equal(
    document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    `${publicOrigin}/`,
    "Canonical URL"
  )
  assert.ok(
    !/noindex/iu.test(
      document.querySelector('meta[name="robots"]')?.getAttribute("content") ||
        ""
    ),
    "Public HTML indexing is preserved"
  )
  assert.equal(
    /\bnoindex\b/iu.test(response.headers.get("x-robots-tag") || ""),
    mode === "preview" ||
      /^[a-f0-9]{8}\.key-site\.pages\.dev$/u.test(origin.hostname),
    "Cloudflare edge indexing policy"
  )
  for (const id of ["use", "authenticate", "sync", "recover"])
    assert.ok(
      document.getElementById(`details-${id}`)?.textContent.trim(),
      `Prerendered ${id} article`
    )
  for (const selector of [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
  ])
    assert.equal(
      document.querySelector(selector)?.getAttribute("content"),
      `${publicOrigin}/assets/og-card.jpg`,
      "Social image URL"
    )
  const csp = response.headers.get("content-security-policy") || ""
  assert.equal(
    csp
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("script-src ")),
    "script-src 'self'",
    "External same-origin scripts only"
  )
  for (const directive of [
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ])
    assert.ok(csp.includes(directive), `CSP ${directive}`)
  assert.ok(!csp.includes("unsafe-eval"), "No eval permission")
  assert.equal(response.headers.get("x-content-type-options"), "nosniff")
  assert.equal(
    response.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin"
  )
  assert.equal(
    response.headers.get("permissions-policy"),
    "camera=(), microphone=(), geolocation=()"
  )

  const image = await get("/assets/og-card.jpg")
  assert.equal(image.status, 200, "Social image response")
  assert.match(image.headers.get("content-type") || "", /image\/jpeg/u)
  const metadata = await sharp(
    Buffer.from(await image.arrayBuffer())
  ).metadata()
  assert.equal(metadata.width, 1200)
  assert.equal(metadata.height, 630)
  const robots = await get("/robots.txt")
  assert.equal(robots.status, 200)
  assert.equal(
    await robots.text(),
    `User-agent: *\nAllow: /\n\nSitemap: ${publicOrigin}/sitemap.xml\n`,
    "Existing robots policy"
  )
  const sitemap = await get("/sitemap.xml")
  assert.equal(sitemap.status, 200)
  const xml = new JSDOM(await sitemap.text(), {
    contentType: "application/xml",
  }).window.document
  assert.deepEqual(
    [...xml.querySelectorAll("loc")].map((element) => element.textContent),
    [`${publicOrigin}/`]
  )
  const missing = await get("/missing-deployment-check")
  assert.equal(missing.status, 404, "A missing page returns a real 404")
  const errorDocument = new JSDOM(await missing.text()).window.document
  assert.match(
    errorDocument
      .querySelector('meta[name="robots"]')
      ?.getAttribute("content") || "",
    /noindex/iu
  )
  assert.equal(errorDocument.querySelector("main a")?.getAttribute("href"), "/")
}

if (import.meta.main) {
  const {
    DEPLOYMENT_URL: url,
    DEPLOYMENT_MODE: mode,
    EXPECTED_COMMIT_SHA: expectedCommit,
    EXPECTED_BRANCH: expectedBranch,
  } = process.env
  assert.ok(
    url && mode && expectedCommit && expectedBranch,
    "DEPLOYMENT_URL, DEPLOYMENT_MODE, EXPECTED_COMMIT_SHA, and EXPECTED_BRANCH are required"
  )
  for (let attempt = 1; ; attempt++) {
    try {
      await verifyDeployment({ url, mode, expectedCommit, expectedBranch })
      console.log(
        `Verified ${mode} deployment ${expectedBranch}@${expectedCommit} at ${url}`
      )
      break
    } catch (error) {
      if (attempt === 3) throw error
      console.warn(
        `Deployment check ${attempt} failed: ${error.message}; retrying in five seconds`
      )
      await setTimeout(5000)
    }
  }
}
