import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { extname } from "node:path"
import { gzipSync } from "node:zlib"
import { JSDOM } from "jsdom"
import budgets from "../build-budgets.json" with { type: "json" }

const directory = new URL("../dist/assets/", import.meta.url)
const homepage = await readFile(new URL("../dist/index.html", import.meta.url))
const privacy = await readFile(new URL("../dist/privacy.html", import.meta.url))

function stylesheets(html) {
  const { document } = new JSDOM(html).window
  return [
    ...document.querySelectorAll('link[rel="stylesheet"][href^="/assets/"]'),
  ].map((link) => link.getAttribute("href").slice("/assets/".length))
}

// Only styles linked exclusively by the privacy route receive its separate budget.
const homepageStylesheets = new Set(stylesheets(homepage))
const privacyOnlyStylesheets = new Set(
  stylesheets(privacy).filter((file) => !homepageStylesheets.has(file))
)
const groups = [
  ["javascript", [".js"]],
  ["css", [".css"]],
  ["privacyCss", [".css"]],
  ["fonts", [".woff2", ".woff", ".ttf", ".otf"]],
  ["images", [".png", ".jpg", ".jpeg", ".webp", ".svg"]],
]
const assets = await Promise.all(
  (await readdir(directory, { recursive: true })).map(async (file) => {
    const extension = extname(file)
    if (!groups.some(([, extensions]) => extensions.includes(extension)))
      return null
    const buffer = await readFile(new URL(file, directory))
    return {
      file,
      extension,
      raw: buffer.length,
      gzip: gzipSync(buffer).length,
    }
  })
)
for (const [name, extensions] of groups) {
  const files = assets.filter(
    (asset) =>
      asset &&
      extensions.includes(asset.extension) &&
      (asset.extension !== ".css" ||
        privacyOnlyStylesheets.has(asset.file) === (name === "privacyCss"))
  )
  assert.ok(files.length, `No ${name} assets found`)
  const limits = budgets[name]
  const raw = files.reduce((sum, file) => sum + file.raw, 0)
  const gzip = files.reduce((sum, file) => sum + file.gzip, 0)
  assert.ok(
    raw <= limits.maxRawKiB * 1024,
    `${name}: ${raw} bytes exceeds budget`
  )
  if (limits.maxGzipKiB)
    assert.ok(
      gzip <= limits.maxGzipKiB * 1024,
      `${name}: ${gzip} gzip bytes exceeds budget`
    )
  if (limits.maxFileKiB)
    for (const file of files)
      assert.ok(
        file.raw <= limits.maxFileKiB * 1024,
        `${file.file} exceeds the individual image budget`
      )
  console.log(
    `${name}: ${(raw / 1024).toFixed(2)} KiB raw; ${(gzip / 1024).toFixed(2)} KiB gzip`
  )
}
assert.ok(
  homepage.length <= budgets.html.maxRawKiB * 1024,
  "Homepage HTML exceeds budget"
)
