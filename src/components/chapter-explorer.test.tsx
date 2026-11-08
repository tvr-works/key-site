// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import { renderToString } from "react-dom/server"
import App from "@/App"
import { ChapterExplorer } from "./chapter-explorer"
import { InstallSection } from "./install-section"
import { commandWalkthrough } from "@/content/command-walkthrough"
import { chapters, installCommand } from "@/content/chapters"
import { chapterDetails } from "@/content/chapter-details"
import { installBrowserEnvironment } from "@/test/browser-environment"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("chapter interactions", () => {
  it("includes every chapter's overview and article in the initial HTML", () => {
    const page = new DOMParser().parseFromString(
      renderToString(<App />),
      "text/html"
    )
    for (const chapter of chapters) {
      const article = page.getElementById(`details-${chapter.id}`)
      expect(article?.textContent).toContain(chapter.detail)
      expect(article?.textContent).toContain(chapterDetails[chapter.id].intro)
      expect(page.body.textContent).toContain(chapter.description)
    }
    expect(page.querySelectorAll('[role="tabpanel"]')).toHaveLength(4)
    expect(
      page.querySelectorAll('[role="tabpanel"]:not([hidden])')
    ).toHaveLength(1)
  })

  it("retains every article while exposing only the selected chapter", async () => {
    installBrowserEnvironment({ reducedMotion: true })
    const user = userEvent.setup()
    render(<ChapterExplorer />)
    for (const chapter of chapters) {
      await user.click(
        screen.getByRole("tab", {
          name: new RegExp(`${chapter.number}\\s*${chapter.label}`),
        })
      )
      expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(4)
      await waitFor(() =>
        expect(screen.getAllByRole("article")).toHaveLength(1)
      )
      expect(screen.getByRole("article", { name: chapter.detail })).toBeTruthy()
    }
  })

  it.each([
    { compact: false, orientation: "vertical", key: "{ArrowDown}" },
    { compact: true, orientation: "horizontal", key: "{ArrowRight}" },
  ])(
    "uses $orientation keyboard navigation and pauses on selection",
    async ({ compact, orientation, key }) => {
      installBrowserEnvironment({ compact })
      const user = userEvent.setup()
      render(<ChapterExplorer />)
      expect(
        screen.getByRole("tablist").getAttribute("aria-orientation") ??
          "horizontal"
      ).toBe(orientation)
      await user.click(screen.getByRole("tab", { name: /01\s*Use/ }))
      await user.keyboard(key)
      expect(
        screen
          .getByRole("tab", { name: /02\s*Authenticate/ })
          .getAttribute("aria-selected")
      ).toBe("true")
      await waitFor(() =>
        expect(
          screen.getByRole("tabpanel").getAttribute("aria-labelledby")
        ).toBe(screen.getByRole("tab", { name: /02\s*Authenticate/ }).id)
      )
      expect(screen.getByRole("button", { name: "Play chapters" })).toBeTruthy()
    }
  )

  it.each([false, true])(
    "jumps into the inline article and returns to the overview (mobile: %s)",
    async (compact) => {
      installBrowserEnvironment({ compact, reducedMotion: true })
      const scrollTo = vi.fn()
      vi.spyOn(window, "scrollTo").mockImplementation(scrollTo)
      vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(scrollTo)
      const user = userEvent.setup()
      render(<ChapterExplorer />)
      expect(
        screen.getByRole("article", {
          name: "Use Key in pipes and scripts",
        })
      ).toBeTruthy()
      await user.click(screen.getByRole("button", { name: /Go deeper/ }))
      expect(document.activeElement).toBe(
        screen.getByRole("heading", {
          name: "Use Key in pipes and scripts",
        })
      )
      expect(scrollTo).toHaveBeenLastCalledWith(
        expect.objectContaining({ behavior: "instant" })
      )
      expect(screen.queryByRole("dialog")).toBeNull()
      await user.click(screen.getByRole("button", { name: "Back to overview" }))
      expect(document.activeElement).toBe(
        screen.getByRole("heading", {
          name: "Secrets in your terminal.",
        })
      )
      expect(screen.getByRole("button", { name: "Play chapters" })).toBeTruthy()
    }
  )

  it("pauses on direct pane scrolling and resets the reading surface when switching chapters", async () => {
    installBrowserEnvironment()
    const user = userEvent.setup()
    render(<ChapterExplorer />)
    const viewport = screen.getByRole("region", {
      name: "Use overview and explanation",
    })
    fireEvent.scroll(viewport, { target: { scrollTop: 240 } })
    expect(screen.getByRole("button", { name: "Play chapters" })).toBeTruthy()
    await user.click(screen.getByRole("tab", { name: /02\s*Authenticate/ }))
    expect(
      screen.getByRole("region", {
        name: "Authenticate overview and explanation",
      }).scrollTop
    ).toBe(0)
    await user.click(screen.getByRole("tab", { name: /01\s*Use/ }))
    expect(
      screen.getByRole("region", { name: "Use overview and explanation" })
        .scrollTop
    ).toBe(0)
  })

  it("starts paused for reduced motion and allows an explicit Play", async () => {
    installBrowserEnvironment({ reducedMotion: true })
    const user = userEvent.setup()
    render(<ChapterExplorer />)
    await user.click(screen.getByRole("button", { name: "Play chapters" }))
    expect(screen.getByRole("button", { name: "Pause chapters" })).toBeTruthy()
  })

  it("has no automated accessibility violations in any chapter and its inline article", async () => {
    installBrowserEnvironment({ reducedMotion: true })
    const user = userEvent.setup()
    const { container } = render(<App />)
    // Color/geometry checks require a rendering browser, reviewed separately.
    const options = { rules: { "color-contrast": { enabled: false } } }
    expect((await axe.run(container, options)).violations).toEqual([])
    for (const [index, { label }] of commandWalkthrough.entries()) {
      await user.click(
        screen.getByRole("button", {
          name: `0${index + 1} ${label}`,
        })
      )
      expect(screen.getByRole("button", { name: "Play chapters" })).toBeTruthy()
      expect((await axe.run(container, options)).violations).toEqual([])
    }
    for (const chapter of chapters) {
      await user.click(
        screen.getByRole("tab", {
          name: new RegExp(`${chapter.number}\\s*${chapter.label}`),
        })
      )
      expect(screen.getByRole("article", { name: chapter.detail })).toBeTruthy()
      expect((await axe.run(document.body, options)).violations).toEqual([])
    }
  })
})

describe("installation", () => {
  it("copies the exact commands and announces success", async () => {
    const user = userEvent.setup()
    const clipboard = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue()
    render(<InstallSection />)
    await user.click(
      screen.getByRole("button", { name: "Copy install commands" })
    )
    expect(clipboard).toHaveBeenCalledWith(installCommand)
    expect(screen.getByRole("status").textContent).toBe("Copied to clipboard.")
  })

  it("leaves selectable commands and explains how to copy when clipboard access fails", async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("Denied")
    )
    render(<InstallSection />)
    await user.click(
      screen.getByRole("button", { name: "Copy install commands" })
    )
    expect(screen.getByRole("status").textContent).toContain(
      "copy them manually"
    )
    expect(screen.getByRole("code").textContent).toBe(installCommand)
  })
})
