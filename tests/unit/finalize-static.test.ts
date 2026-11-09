import { spawnSync } from "node:child_process"
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

const directories: string[] = []
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true })
})

function finalize(context: Record<string, string | undefined>) {
  const directory = mkdtempSync(join(tmpdir(), "key-static-"))
  directories.push(directory)
  mkdirSync(join(directory, "scripts"))
  mkdirSync(join(directory, "dist"))
  mkdirSync(join(directory, "empty-path"))
  copyFileSync(
    new URL("../../scripts/finalize-static.mjs", import.meta.url),
    join(directory, "scripts/finalize-static.mjs")
  )
  writeFileSync(
    join(directory, "dist/_headers"),
    "/*\n  X-Content-Type-Options: nosniff\n"
  )
  writeFileSync(
    join(directory, "dist/index.html"),
    '<link rel="canonical" href="https://key.tvr.works/">' +
      ["use", "authenticate", "sync", "recover"]
        .map((id) => `<article id="details-${id}">Content</article>`)
        .join("")
  )
  const env = { ...process.env }
  for (const key of [
    "CF_PAGES_COMMIT_SHA",
    "CF_PAGES_BRANCH",
    "GITHUB_SHA",
    "GITHUB_HEAD_REF",
    "GITHUB_REF_NAME",
  ])
    delete env[key]
  const result = spawnSync(
    process.execPath,
    [join(directory, "scripts/finalize-static.mjs")],
    {
      cwd: directory,
      env: {
        ...env,
        PATH: join(directory, "empty-path"),
        npm_config_user_agent: "npm/11.20.0",
        ...context,
      },
      encoding: "utf8",
    }
  )
  return { result, directory }
}

describe("static source identity", () => {
  it.each([
    {
      CF_PAGES_COMMIT_SHA: "a".repeat(40),
      CF_PAGES_BRANCH: "main",
      GITHUB_SHA: "b".repeat(40),
      GITHUB_REF_NAME: "ignored",
    },
    { GITHUB_SHA: "a".repeat(40), GITHUB_REF_NAME: "codex/ci-pages-gate" },
    {
      GITHUB_SHA: "a".repeat(40),
      GITHUB_HEAD_REF: "codex/pr-branch",
      GITHUB_REF_NAME: "5/merge",
    },
  ])("records platform identity without Git: %j", (context) => {
    const { result, directory } = finalize(context)
    expect(result.stderr).toBe("")
    expect(result.status).toBe(0)
    const info = JSON.parse(
      readFileSync(join(directory, "dist/build-info.json"), "utf8")
    )
    expect(info).toMatchObject({
      repository: "tvr-works/key-site",
      commit: "a".repeat(40),
      branch:
        context.CF_PAGES_BRANCH ||
        context.GITHUB_HEAD_REF ||
        context.GITHUB_REF_NAME,
      dirty: false,
      npm: "npm/11.20.0",
    })
  })

  it("requires Git for local source identity instead of inventing a clean commit", () => {
    const { result } = finalize({})
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("git")
  })
})
