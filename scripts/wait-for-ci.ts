import assert from "node:assert/strict"

type Run = {
  id: number
  run_number: number
  run_attempt: number
  head_sha: string
  head_branch: string
  event: string
  status: string
  conclusion: string | null
}

type GateOptions = {
  repository: string
  sha: string | undefined
  branch: string | undefined
  timeoutMs?: number
}

function isRun(value: unknown): value is Run {
  if (!value || typeof value !== "object") return false
  const run: Record<string, unknown> = Object.fromEntries(Object.entries(value))
  return (
    ["id", "run_number", "run_attempt"].every((key) => {
      const number = run[key]
      return (
        typeof number === "number" && Number.isSafeInteger(number) && number > 0
      )
    }) &&
    ["head_sha", "head_branch", "event", "status"].every(
      (key) => typeof run[key] === "string"
    ) &&
    (typeof run.conclusion === "string" || run.conclusion === null)
  )
}

// The protocol lives here so CLI use and contract tests exercise the same boundary.
export async function waitForCI({
  repository,
  sha,
  branch,
  timeoutMs = 16 * 60_000,
}: GateOptions): Promise<void> {
  assert.match(
    repository,
    /^[\w.-]+\/[\w.-]+$/u,
    "Expected a GitHub owner/repository."
  )
  assert.ok(
    sha && branch && branch.trim(),
    "Cloudflare commit and branch context are required; refusing deployment."
  )
  assert.match(sha, /^[a-f0-9]{40}$/u, "Expected a full Cloudflare commit SHA.")
  assert.ok(
    Number.isSafeInteger(timeoutMs) && timeoutMs > 0,
    "Expected a positive gate timeout."
  )
  const query = new URLSearchParams({
    head_sha: sha,
    branch,
    event: "push",
    per_page: "100",
  })
  const endpoint = `https://api.github.com/repos/${repository}/actions/workflows/ci.yml/runs?${query}`
  const deadline = Date.now() + timeoutMs
  const ensureTimeRemaining = () => {
    if (Date.now() >= deadline)
      throw new Error(
        `Timed out waiting for CI for ${branch}@${sha}. Nothing will be published.`
      )
  }

  async function poll(attempt = 0): Promise<void> {
    ensureTimeRemaining()
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "TVR-Works-Pages-CI-Gate",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      signal: AbortSignal.timeout(Math.min(15_000, deadline - Date.now())),
    })
    if (response.status === 403 || response.status === 429)
      throw new Error(
        "GitHub public API access was denied or rate-limited. Retry this Cloudflare build after CI passes; deployment remains blocked."
      )
    assert.equal(
      response.status,
      200,
      `GitHub CI lookup failed (${response.status}); refusing deployment.`
    )
    const payload: unknown = await response.json()
    ensureTimeRemaining()
    assert.ok(
      payload &&
        typeof payload === "object" &&
        "workflow_runs" in payload &&
        Array.isArray(payload.workflow_runs) &&
        payload.workflow_runs.every(isRun),
      "Invalid GitHub workflow response; refusing deployment."
    )
    const runs = payload.workflow_runs
    // Do not rely on API ordering or let an older success mask a newer failed run.
    const run = runs
      .filter(
        (entry) =>
          entry.head_sha === sha &&
          entry.head_branch === branch &&
          entry.event === "push"
      )
      .reduce<Run | undefined>((latest, entry) => {
        if (
          !latest ||
          entry.run_number > latest.run_number ||
          (entry.run_number === latest.run_number &&
            entry.run_attempt > latest.run_attempt)
        )
          return entry
        return latest
      }, undefined)
    if (run?.status === "completed") {
      assert.equal(
        run.conclusion,
        "success",
        `CI run ${run.id} concluded ${run.conclusion}; refusing deployment.`
      )
      console.log(
        `CI passed for exact commit ${sha} on ${branch}: https://github.com/${repository}/actions/runs/${run.id}`
      )
      return
    }
    console.log(
      `Waiting for push CI for ${branch}@${sha}${run ? ` (run ${run.id}: ${run.status})` : " (run not created yet)"}.`
    )
    // Bound public API traffic; short runs remain responsive, queued runs back off.
    const delay = Math.min(
      60_000,
      15_000 * 2 ** Math.min(attempt, 2),
      deadline - Date.now()
    )
    await new Promise<void>((resolve) => setTimeout(resolve, delay))
    return poll(attempt + 1)
  }

  await poll()
}

if (import.meta.main)
  await waitForCI({
    repository: "tvr-works/key-site",
    sha: process.env.CF_PAGES_COMMIT_SHA,
    branch: process.env.CF_PAGES_BRANCH,
  })
