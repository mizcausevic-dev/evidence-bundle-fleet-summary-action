# Changelog

## v0.1.0 — 2026-05-27

- Initial release: GitHub Action wrapping `evidence-bundle-fleet-summary` for PR gating.
- Inputs: `bundles-dir` (required), `comment-on-pr` (auto/true/false), `fail-on-high` (default true), `oversized-mb` (default 100), `github-token`.
- Outputs: `total-bundles`, `high-findings`, `signed-bundles`, `expired-bundles`.
- Vendored 8-code fleet-summary logic — same findings as the standalone library.
- Posts per-PR Markdown comment when run on `pull_request` events with a valid token.
- Fails the run (exit 1) on any high-severity finding by default.
- Composite Node 20 action with `dist/index.js` committed for SHA/tag pinning.
- 6-bundle fixture corpus from the standalone library (clean audit + expired incident + unsigned regulatory + RAG citation + duplicate-soc2 cross-bundle + empty placeholder).
- **Fourth in the action family — completes the per-protocol fleet-summary action quartet** across A2A / MCP / prompts / evidence.
- Node 20/22 CI (lint, typecheck, coverage, build, `npm audit`), AGPL-3.0-or-later, Dependabot.
