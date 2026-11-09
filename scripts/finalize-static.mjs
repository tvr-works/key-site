import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"

const directory = new URL("../dist/", import.meta.url)
const headers = await readFile(new URL("_headers", directory), "utf8")
for (const line of headers.split("\n"))
  assert.ok(
    line.length <= 2000,
    "A Cloudflare _headers line exceeds 2,000 characters"
  )
const html = await readFile(new URL("index.html", directory), "utf8")
for (const id of ["use", "authenticate", "sync", "recover"])
  assert.ok(
    html.includes(`id="details-${id}"`),
    `Missing prerendered ${id} article`
  )
assert.ok(
  !html.includes('<div id="root"></div>'),
  "Unrendered application shell"
)
assert.ok(
  html.includes('href="https://key.tvr.works/"'),
  "Missing production canonical"
)
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))
  assert.ok(
    /\bsrc=/.test(match[1]) || !match[2].trim(),
    "Unexpected inline script violates CSP"
  )

const platformCommit = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA
const commit =
  platformCommit ||
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
const branch =
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim()
assert.match(commit, /^[a-f0-9]{40}$/u, "A full source commit is required")
assert.ok(branch, "A source branch is required")
// Platform builds check out an immutable commit; local builds inspect the worktree.
const dirty = platformCommit
  ? false
  : !!execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
    }).trim()
const info = {
  repository: "tvr-works/key-site",
  commit,
  branch,
  dirty,
  node: process.versions.node,
  npm: process.env.npm_config_user_agent?.split(" ")[0],
}
await writeFile(
  new URL("build-info.json", directory),
  `${JSON.stringify(info, null, 2)}\n`
)
console.log(
  `Recorded source ${branch}@${commit}${dirty ? " (local changes)" : ""}`
)
