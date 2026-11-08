// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { UseDemo } from "./use-demo"

afterEach(cleanup)

it("keeps command references reader-controlled and pairs commands with explanations", async () => {
  const onInteract = vi.fn()
  const user = userEvent.setup()
  const { rerender } = render(<UseDemo onInteract={onInteract} />)
  expect(screen.getByRole("code").textContent).toBe(
    "key add services/api\nkey add --totp github/mfa"
  )
  expect(screen.getByText(/Base32 setup secret/)).toBeTruthy()
  expect(screen.queryByRole("button", { name: /TOTP/i })).toBeNull()
  await user.click(screen.getByRole("button", { name: "03 Get" }))
  expect(onInteract).toHaveBeenCalledOnce()
  expect(screen.getByText(/current one-time code/)).toBeTruthy()
  rerender(<UseDemo onInteract={onInteract} />)
  expect(
    screen
      .getByRole("button", { name: "03 Get" })
      .getAttribute("aria-pressed")
  ).toBe("true")
  await user.click(screen.getByRole("button", { name: "06 Delete" }))
  expect(screen.getByRole("code").textContent).toBe("key remove services/api")
  expect(screen.getByText(/asks for confirmation/)).toBeTruthy()
})
