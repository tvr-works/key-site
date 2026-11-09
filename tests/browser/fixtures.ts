import { test as base, expect } from "@playwright/test"

export const test = base.extend({
  page: async ({ page }, provide, info) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (!["error", "warning"].includes(message.type())) return
      // Navigating to the intentional 404 can produce a browser resource error.
      if (
        new URL(message.location().url || page.url()).pathname ===
        "/missing-ci-check"
      )
        return
      errors.push(message.text())
    })
    await provide(page)
    if (info.status === info.expectedStatus) expect(errors).toEqual([])
  },
})
export { expect }
