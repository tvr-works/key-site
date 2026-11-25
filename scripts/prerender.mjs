import { readFile, writeFile } from "node:fs/promises"
import { render, renderPrivacy } from "../.cache/prerender/entry-server.js"

const outlet = '<div id="root"></div>'
for (const [name, renderPage] of [
  ["index.html", render],
  ["privacy.html", renderPrivacy],
]) {
  const file = new URL(`../dist/${name}`, import.meta.url)
  const html = await readFile(file, "utf8")
  if (!html.includes(outlet))
    throw new Error(`Missing prerender outlet in ${name}`)
  await writeFile(
    file,
    html.replace(outlet, () => `<div id="root">${renderPage()}</div>`)
  )
  console.log(`Prerendered dist/${name}`)
}
