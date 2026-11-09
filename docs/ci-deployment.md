# CI and Cloudflare deployment

The intended branch model keeps Cloudflare Pages' native Git integration:
`main` publishes production and other repository branches publish previews.
GitHub Actions validates source; Cloudflare rebuilds that validated source.
The retained CI artifact is evidence, not the bytes uploaded by Cloudflare.
GitHub needs no Cloudflare API token or deploy-hook secret.

## Transition and hosting settings

**The hosting cutover belongs to the coordinator.** Until it is confirmed,
every migration-branch commit must start with `[CF-Pages-Skip]`. This prevents
the existing ungated Pages command from publishing migration commits while
their push CI still runs. Do not merge the migration branch to start a cutover.

The read-only assessment found project `key-site` connected to
`tvr-works/key-site`, production branch `main`, production deployments enabled,
all preview branches enabled, and `npm run build` publishing `dist/`.
Preserve the project, connection, domains, ownership, and branch settings.

After successful push CI and coordinator approval, the required command for
both production and preview is:

```sh
npm run ci:gate && npm run build
```

Use Node `26.13.0` and npm `11.20.0`, matching `.node-version`,
`packageManager`, and the CI checks. Read back any existing runtime overrides;
if explicit overrides are needed, set `NODE_VERSION=26.13.0` and
`NPM_VERSION=11.20.0` in both environments. Keep output `dist/` and root empty.
Do not add company-site's `VITE_SITE_INDEXING` or change Key's crawler files.

## Validation

`Site checks` runs on every branch push and on pull requests. The workflow uses
read-only repository permissions, disables persisted checkout credentials,
pins actions by commit SHA, and cancels superseded runs per workflow/ref.
The 12-minute job limit leaves queue allowance within the publication gate.
The exact push SHA, rather than the PR merge ref, is the publication authority.

Blacksmith's `blacksmith-4vcpu-ubuntu-2404` runner uses the digest-pinned
Playwright 1.64.1 Noble image. `@playwright/test` and `playwright-core` are pinned
to that version; the workflow checks compatibility before installing packages.
Update package pins, image tag, digest, and compatibility check together.
The image already contains browser binaries and Linux dependencies. Cache npm
downloads using the lockfile; do not add apt installation or browser caching.
Local development can install Chromium and WebKit with `npx playwright install`.

Checks include runtime/formatting, existing Oxlint and TypeScript checks, Vitest,
`npm audit --audit-level=high`, real-browser interaction and accessibility checks,
and public/preview artifact delivery. Vitest and Playwright reject focused tests
in CI. React/Vite SSR and the existing component tests remain in place.

The browser suite covers hydration, all four chapters, keyboard orientation,
article headings in view, pane/demo resets, clipboard success/failure, layout
across the mobile breakpoint, contrast, reduced motion, and real observer-driven
playback with normal motion. It uses desktop Chromium and narrow WebKit.
It is not a complete physical-device or assistive-technology certification.

Both browser commands build first and enforce `build-budgets.json`. Budgets are
calibrated to Key's existing assets: approximately 294 KiB JS, 56 KiB CSS,
29 KiB font data, and 432 KiB images, including the existing large touch icon.
Limits provide bounded headroom rather than company-site's smaller CSS budget.
Failed browser checks retain HTML reports, screenshots, and traces for seven
days. Successful non-PR runs retain the tested `dist/` for seven days.

On 2026-11-09, [push run 42661717895](https://github.com/tvr-works/key-site/actions/runs/42661717895)
passed on the actual Blacksmith runner for commit
`714d6c946499e97aeb122910b182904253d6c305`: 70 unit/contract tests, 18 preview
browser tests, four public-artifact tests, and the high/critical audit threshold.
The job completed in 1m28s and retained the static artifact. An anonymous local
gate probe accepted that exact SHA and branch. This establishes CI and public
API access from the probe environment, not Cloudflare egress availability or
hosted deployment behavior.

The first run failed when the manifest queried local Git dirty state inside the
container. Platform identity now avoids Git entirely; four subprocess cases
exercise Cloudflare/GitHub context and local fallback with Git absent from
`PATH`. No global ownership exception or persisted checkout credential was
added.

## Publication gate

`scripts/wait-for-ci.ts` reads `CF_PAGES_COMMIT_SHA` and `CF_PAGES_BRANCH` and
queries the public GitHub Actions API without credentials. Only completed,
successful `ci.yml` push CI for that exact SHA and branch is accepted. It selects
the greatest run number and then rerun attempt, so an older success cannot hide
a newer failed or active run. Contract tests cover context, mismatches, failures,
reruns, malformed responses, network errors, and deadlines.

The gate has a 16-minute overall deadline, requests bounded to 15 seconds or
the remaining time, and polling intervals of 15, 30, then at most 60 seconds.
Failure, cancellation, skipped CI, unreadable status, rate limits, or timeout
stop publication. Public API access assumes this repository stays public;
unauthenticated limits are shared by originating IP. A successful CI rerun does
not automatically retry a Pages build that already failed: retry it in Pages.
During this migration the coordinator observed a company-site main build fail
closed on anonymous GitHub API 403/rate limiting after its preview succeeded.
The previous production deployment stayed live. Treat this as a real quota
availability constraint, retain the diagnostic, and retry after the quota
recovers. Do not add credentials or bypass the gate.

## Static delivery and indexing

The public HTML, canonical URL, robots.txt, and sitemap retain the current
production indexing policy. Cloudflare supplies preview `X-Robots-Tag: noindex`.
The local static-preview harness models that edge header only when
`SITE_DEPLOYMENT_MODE=preview`; it does not bake noindex into the artifact.
`production` artifact checks confirm the public response does not add noindex.
This harness is intentionally limited to a single global `_headers` block and
does not establish Cloudflare routing or edge behavior on its own.

`public/_headers` restricts scripts to same-origin external scripts and disables
embedding, objects, forms, camera, microphone, and geolocation. Inline styles are
deliberately allowed for existing React progress styles, Base UI, and the static
404 page. No inline script or eval permission is added. Build checks reject
unexpected inline scripts and `_headers` lines over Cloudflare's 2,000-character
limit. Browser tests exercise the application with these headers active.

## Deployment smoke check and recovery

The build records repository, commit, branch, dirty state, and runtime in
`build-info.json`. Platform builds use `CF_PAGES_COMMIT_SHA` before `GITHUB_SHA`
and the platform branch context, recording the immutable checkout as clean
without invoking Git. Local builds fall back to Git and inspect dirty state.
This avoids container ownership exceptions; contract tests run with Git absent
from `PATH` to check the platform boundary.
Verification requires the exact expected identity before
checking content. It checks only the supplied origin and never silently accepts
an older healthy production alias:

```sh
DEPLOYMENT_URL=https://DEPLOYMENT_ID.key-site.pages.dev \
DEPLOYMENT_MODE=preview \
EXPECTED_COMMIT_SHA=FULL_COMMIT_SHA \
EXPECTED_BRANCH=codex/your-branch \
npm run verify:deployment
```

Use `DEPLOYMENT_MODE=production` and `EXPECTED_BRANCH=main` for production.
Verify the immutable deployment first, then run the same command separately
with `DEPLOYMENT_URL=https://key.tvr.works` and the same expected identity.
The checker validates edge indexing, canonical/social metadata, all articles,
security headers, the actual OG image, existing crawler files, and a real 404.
An immutable hash URL must have edge noindex even for a production build; the
custom production alias must remain indexable. This hostname distinction does
not change the public HTML, source identity, robots.txt, or sitemap expectations.
Three bounded attempts allow brief edge propagation. Missing build identity is
a failure, so older deployments intentionally do not pass this new checker.

After cutover, use a disposable preview branch with an intentionally failing
test to confirm that CI failure blocks Pages before build/publication. Confirm
successful preview and main publication with exact identities. These cutover
tests and hosted behavior remain unverified until the coordinator runs them.

A CI failure leaves the last successful production deployment in place after
the gate is enabled. Prefer a revert commit through the gate for recovery.
An emergency native Pages rollback must be recorded and reconciled with main.
Do not weaken the gate or add stored deployment credentials to recover.

## Dependency audit

The initial audit found 10 high and one critical finding. Compatible transitive
refreshes plus targeted Vite 8.2.4 and Sharp 0.35.5 patches and shadcn CLI 4.22.1
remove those blockers. React, Base UI, Tailwind, TypeScript, and Vitest versions
are unchanged. The remaining eight findings are low/moderate in development
tooling; the high/critical threshold passes without exclusions or `--force`.
Review the current registry audit during every CI run rather than treating this
record as an ongoing clean bill of health.

## shadcn lint assessment

The existing Oxlint 1.81 JS-plugin bridge can run `@shadcn/lint` 0.2.3, but a
probe with all six standard rules produced 32 diagnostics against the current
design and a class-grammar compatibility warning. The plugin needs `cn` 0.4 or
later; Key uses `cn` 0.2.5, so the probe fell back to the plugin's own grammar.
This is not a reliable basis for silently enforcing the app's merge semantics.

Concrete debt includes existing Button overrides (`rounded-none`, spacing,
typography and `playback-toggle`/`detail-trigger` classes), custom Tabs/ScrollArea
classes, `text-link` being treated as a color utility, unstyled marker classes
`recover-replacement` and `chapter-reader-mobile`, and the deliberate dynamic
progress transform. A follow-up can define narrow component contracts, resolve
the class-name ambiguity, and validate a `cn` upgrade against the visual design.
The probe dependency and broad trial configuration were removed. This CI change
retains existing React/hooks/accessibility Oxlint rules; it does not claim
shadcn lint enforcement or hide that debt with file-wide rule disables.

## References

- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/configuration/branch-build-controls/
- https://docs.github.com/en/rest/actions/workflow-runs
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://playwright.dev/docs/docker
