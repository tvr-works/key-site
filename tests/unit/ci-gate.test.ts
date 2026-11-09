import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { waitForCI } from "../../scripts/wait-for-ci"

const sha = "a".repeat(40)
const options = { repository: "tvr-works/key-site", sha, branch: "main" }
const run = (overrides = {}) => ({
  id: 100,
  run_number: 10,
  run_attempt: 1,
  head_sha: sha,
  head_branch: "main",
  event: "push",
  status: "completed",
  conclusion: "success",
  ...overrides,
})
const response = (runs: unknown[]) => Response.json({ workflow_runs: runs })
const request = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("fetch", request)
  vi.spyOn(console, "log").mockImplementation(() => {})
  request.mockReset()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("Cloudflare exact-commit CI publication gate", () => {
  it("accepts matching push success without credentials and scopes the API query", async () => {
    request.mockResolvedValue(response([run()]))
    await expect(waitForCI(options)).resolves.toBeUndefined()
    const [url, init] = request.mock.calls[0]!
    if (typeof url !== "string") throw new Error("Expected a string API URL.")
    const endpoint = new URL(url)
    expect(endpoint.pathname).toBe(
      "/repos/tvr-works/key-site/actions/workflows/ci.yml/runs"
    )
    expect(Object.fromEntries(endpoint.searchParams)).toMatchObject({
      head_sha: sha,
      branch: "main",
      event: "push",
    })
    expect(new Headers(init?.headers).has("authorization")).toBe(false)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it.each([
    { sha: undefined },
    { sha: "abc" },
    { branch: undefined },
    { branch: " " },
    { repository: "https://example.com" },
    { timeoutMs: 0 },
  ])("rejects invalid context before any API call: %j", async (invalid) => {
    await expect(waitForCI({ ...options, ...invalid })).rejects.toThrow(
      /required|Expected/u
    )
    expect(request).not.toHaveBeenCalled()
  })

  it.each([
    "failure",
    "cancelled",
    "skipped",
    "timed_out",
    "neutral",
    "action_required",
    null,
  ])("rejects completed CI with conclusion %s", async (conclusion) => {
    request.mockResolvedValue(response([run({ conclusion })]))
    await expect(waitForCI(options)).rejects.toThrow("refusing deployment")
  })

  it.each([
    { head_sha: "b".repeat(40) },
    { head_branch: "feature/example" },
    { event: "pull_request" },
    { event: "workflow_dispatch" },
  ])(
    "cannot substitute a different SHA, branch, or event: %j",
    async (mismatch) => {
      request.mockResolvedValue(response([run(mismatch)]))
      await Promise.all([
        expect(waitForCI({ ...options, timeoutMs: 100 })).rejects.toThrow(
          "Timed out"
        ),
        vi.advanceTimersByTimeAsync(100),
      ])
    }
  )

  it("does not let an older success hide a newer failure, regardless of response order", async () => {
    request.mockResolvedValue(
      response([run(), run({ id: 101, run_number: 11, conclusion: "failure" })])
    )
    await expect(waitForCI(options)).rejects.toThrow(
      "CI run 101 concluded failure"
    )
  })

  it("uses the latest rerun attempt rather than an earlier success", async () => {
    request.mockResolvedValue(
      response([run(), run({ run_attempt: 2, conclusion: "cancelled" })])
    )
    await expect(waitForCI(options)).rejects.toThrow("concluded cancelled")
  })

  it("waits for a queued matching run to succeed", async () => {
    request
      .mockResolvedValueOnce(
        response([run({ status: "queued", conclusion: null })])
      )
      .mockResolvedValueOnce(response([run()]))
    await Promise.all([
      expect(waitForCI(options)).resolves.toBeUndefined(),
      vi.advanceTimersByTimeAsync(15_000),
    ])
    expect(request).toHaveBeenCalledTimes(2)
  })

  it("waits when no run exists yet and does not accept an older success while a newer run is active", async () => {
    request
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(
        response([
          run(),
          run({
            id: 101,
            run_number: 11,
            status: "in_progress",
            conclusion: null,
          }),
        ])
      )
      .mockResolvedValueOnce(response([run({ id: 101, run_number: 11 })]))
    await Promise.all([
      expect(waitForCI(options)).resolves.toBeUndefined(),
      vi.advanceTimersByTimeAsync(45_000),
    ])
    expect(request).toHaveBeenCalledTimes(3)
  })

  it("backs off and stops at the deadline without issuing another request", async () => {
    request.mockImplementation(() => Promise.resolve(response([])))
    await Promise.all([
      expect(waitForCI({ ...options, timeoutMs: 106_000 })).rejects.toThrow(
        "Timed out"
      ),
      vi.advanceTimersByTimeAsync(106_000),
    ])
    expect(request).toHaveBeenCalledTimes(4)
  })

  it("cannot accept a successful response that arrives after the deadline", async () => {
    request.mockImplementation(() => {
      vi.setSystemTime(Date.now() + 101)
      return Promise.resolve(response([run()]))
    })
    await expect(waitForCI({ ...options, timeoutMs: 100 })).rejects.toThrow(
      "Timed out"
    )
  })

  it.each([403, 429, 404, 500])("fails closed on HTTP %i", async (status) => {
    request.mockResolvedValue(new Response(null, { status }))
    await expect(waitForCI(options)).rejects.toThrow(
      /denied|rate-limited|lookup failed|JSON/u
    )
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("fails closed on network errors", async () => {
    request.mockRejectedValue(new TypeError("Network unavailable"))
    await expect(waitForCI(options)).rejects.toThrow("Network unavailable")
  })

  it.each([{}, { workflow_runs: null }, { workflow_runs: [{}] }])(
    "rejects malformed API responses: %j",
    async (payload) => {
      request.mockResolvedValue(Response.json(payload))
      await expect(waitForCI(options)).rejects.toThrow(
        "Invalid GitHub workflow response"
      )
    }
  )

  it("rejects invalid JSON", async () => {
    request.mockResolvedValue(new Response("not JSON"))
    await expect(waitForCI(options)).rejects.toThrow(
      /denied|rate-limited|lookup failed|JSON/u
    )
  })
})
