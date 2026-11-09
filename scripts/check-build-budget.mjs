import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { extname } from "node:path"
import { gzipSync } from "node:zlib"
import budgets from "../build-budgets.json" with { type: "json" }

const directory = new URL("../dist/assets/", import.meta.url)
const groups = [
  ["javascript", [".js"]],
  ["css", [".css"]],
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
    (asset) => asset && extensions.includes(asset.extension)
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
const html = await readFile(new URL("../dist/index.html", import.meta.url))
assert.ok(
  html.length <= budgets.html.maxRawKiB * 1024,
  "Homepage HTML exceeds budget"
)
