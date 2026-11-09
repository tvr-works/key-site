import { existsSync, readFileSync, statSync } from "node:fs"
import { resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

// This harness serves the built files, not the React development shell.
// Deployed Pages status codes and edge headers still need a deployment smoke check.
export default defineConfig({
  appType: "mpa",
  preview: { host: "127.0.0.1", cors: false },
  plugins: [
    {
      name: "static-pages-preview",
      configurePreviewServer(server) {
        const directory = new URL("./dist/", import.meta.url)
        const lines = readFileSync(new URL("_headers", directory), "utf8")
          .trim()
          .split("\n")
        if (lines.shift() !== "/*")
          throw new Error("Expected one global _headers block")
        const headers = lines.map((line) => {
          const match = /^  ([\w-]+): (.+)$/.exec(line)
          if (!match)
            throw new Error(
              "Only global header directives are supported by preview"
            )
          return [match[1], match[2]]
        })
        const mode = process.env.SITE_DEPLOYMENT_MODE || "production"
        if (!["preview", "production"].includes(mode))
          throw new Error("SITE_DEPLOYMENT_MODE must be preview or production")
        server.middlewares.use((_request, response, next) => {
          for (const [name, value] of headers) response.setHeader(name, value)
          // Cloudflare supplies this header on previews; it is not baked into public HTML.
          if (mode === "preview") response.setHeader("X-Robots-Tag", "noindex")
          next()
        })
        return () => {
          server.middlewares.use((request, response, next) => {
            let pathname: string
            try {
              pathname = decodeURIComponent(
                new URL(request.url || "/", "http://localhost").pathname
              )
            } catch {
              response.statusCode = 400
              response.end("Invalid URL")
              return
            }
            const root = fileURLToPath(directory)
            const file = resolve(root, `.${pathname}`)
            if (
              file.startsWith(root.endsWith(sep) ? root : root + sep) &&
              existsSync(file) &&
              statSync(file).isFile()
            )
              return next()
            response.statusCode = 404
            response.setHeader("Content-Type", "text/html; charset=utf-8")
            response.end(
              request.method === "HEAD"
                ? undefined
                : readFileSync(fileURLToPath(new URL("404.html", directory)))
            )
          })
        }
      },
    },
  ],
})
