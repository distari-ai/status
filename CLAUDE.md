# CLAUDE.md

`distari-ai/status` is **public**: the Upptime source of status.distari.com. Distari's rules live in `distari-ai/project` (`CLAUDE.md` and `docs/engineering/outage-communication.md`); this file holds only what is specific to this repo.

- **The only repo in the org with GitHub Actions on** (since 4 November 2026, #1183). The org policy allows this repo alone, GitHub-owned actions and `upptime/*`, all pinned to full commit SHAs. Public-repo minutes and Pages cost nothing; never make this repo private.
- **Workflows are hand-maintained.** Upptime's `update-template` and `updates` workflows are deliberately absent: they rewrite `.github/workflows` from unpinned `@master` code. Never run `update-template`. To upgrade, bump the pinned SHAs and the `@upptime/status-page` version in `site.yml` by hand, after reading the release.
- **Workflows use `github.token`**; no PAT. Site deploys go through `actions/deploy-pages` (Pages source: GitHub Actions); the custom domain is set in the repo's Pages settings and DNS in `distari-ai/project` `infra/dns.tf`.
- **The checks are started from Cloudflare, not GitHub's cron.** GitHub never fired this repo's `schedule` triggers (4 November 2026), so `trigger/` is a Cloudflare Worker (`distari-status-trigger`, Distari's Cloudflare account, cron every five minutes) that dispatches `uptime.yml` as the org-owned GitHub App **Distari status trigger** (installed on this repo only, Actions: write). The workflows keep their own cron as a backup. The App key is in Bitwarden ("GitHub App key - Distari status trigger", Distari collection), the Mac Keychain (`distari-status-trigger-key`, base64 PKCS#8) and the Worker secret `GH_APP_PRIVATE_KEY`. Deploy with `npx wrangler@4.151.2 deploy` from `trigger/` and `CLOUDFLARE_API_TOKEN` from Keychain `distari-cloudflare-workers`; `node --test` there runs its tests.
- **Checks probe only database-free, unauthenticated endpoints.** Never add `/health` (no scheduled Neon wakes) or protected `/docs`.
- **Incidents are issues labelled `status`** (`rehearsal` marks a practice). Only people with triage access can apply labels, so the public can open issues but cannot put anything on the page. Never delete incident issues; they are the public record.
- **Git:** the Upptime bot commits check results (`history/`, `api/`, `graphs/`, README summary) straight to `main`; human changes still go through a branch, rebase and `git merge --ff-only`, with lower-case commit titles. Never force-push `main`.
- **Everything here is public.** No secrets, customer data, logs or internal host names, in files or issues.

## Traps

- **Cron schedules register only on a push that touches the workflow file while Actions is enabled.** Files pushed while the org policy had Actions off never got schedules until they were touched again (4 November 2026).
- **Manual dispatches of several Upptime workflows at once can race on `git push`** (they all commit to `main`); the concurrency group queues one pending run and cancels older pending ones. Dispatch one at a time and wait.
- **The page caches GitHub API reads for two minutes** in the browser and is subject to GitHub's 60 requests an hour per IP for anonymous visitors.
- **Svelte's scoped styles outrank plain selectors** in `assets/distari.css`; add an attribute or element to win, or `!important` where a scoped rule sets the property directly.
