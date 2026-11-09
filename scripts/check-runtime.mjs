import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const expectedNode = readFileSync(
  new URL("../.node-version", import.meta.url),
  "utf8"
).trim()
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
)
assert.equal(
  process.versions.node,
  expectedNode,
  "Use the Node version in .node-version"
)
assert.equal(
  process.env.npm_config_user_agent?.split(" ")[0],
  pkg.packageManager.replace("@", "/"),
  "Use the pinned packageManager npm version"
)
