# evidence-bundle-fleet-summary-action

[![CI](https://github.com/mizcausevic-dev/evidence-bundle-fleet-summary-action/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/evidence-bundle-fleet-summary-action/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](LICENSE)

GitHub Action that walks a directory of **evidence-bundle** `manifest.json` files, counts by purpose, surfaces governance gaps, posts a Markdown summary as a PR comment, and **fails the build** when any high-severity finding is present.

Wraps [`evidence-bundle-fleet-summary`](https://github.com/mizcausevic-dev/evidence-bundle-fleet-summary) — same finding logic, vendored into the action for self-contained execution.

**Fourth in the action family — completes the per-protocol fleet-summary action quartet:**

- [`agent-card-fleet-summary-action`](https://github.com/mizcausevic-dev/agent-card-fleet-summary-action) — A2A AgentCards
- [`mcp-tool-card-fleet-summary-action`](https://github.com/mizcausevic-dev/mcp-tool-card-fleet-summary-action) — MCP Tool Cards
- [`prompt-provenance-fleet-summary-action`](https://github.com/mizcausevic-dev/prompt-provenance-fleet-summary-action) — prompt-provenance docs
- **`evidence-bundle-fleet-summary-action`** — evidence bundles

Part of the [Kinetic Gain Suite](https://suite.kineticgain.com/).

---

## Usage

```yaml
name: Evidence bundle governance
on:
  pull_request:
    paths: ["bundles/**"]

jobs:
  fleet-summary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: mizcausevic-dev/evidence-bundle-fleet-summary-action@v0.1-shipped
        with:
          bundles-dir: bundles/
          oversized-mb: 100   # optional, default 100
          fail-on-high: true
```

## Inputs

| input            | required | default       | description |
|---|---|---|---|
| `bundles-dir`    | ✓        | —             | Directory containing `manifest.json` files (one per bundle). |
| `comment-on-pr`  |          | `auto`        | `auto` posts only on `pull_request` events; `true`/`false` force the behavior. |
| `fail-on-high`   |          | `true`        | Fail the run when any high-severity finding is present. |
| `oversized-mb`   |          | `100`         | Bundles larger than this many MB trigger the `oversized-bundle` finding. |
| `github-token`   |          | `${{ github.token }}` | Token used to post the PR comment. |

## Outputs

| output             | description |
|---|---|
| `total-bundles`    | Number of bundles analyzed. |
| `high-findings`    | Count of high-severity findings. |
| `signed-bundles`   | Number of bundles with a signature block. |
| `expired-bundles`  | Number of bundles past their `expires_at`. |

## What it flags

| Code | Severity | Rule |
|---|---|---|
| `bundle-expired` | 🔴 | `bundle.expires_at` is in the past. |
| `unsigned-regulated-bundle` | 🔴 | `bundle.purpose` ∈ {audit-evidence, compliance-disclosure, regulatory-submission} but no `signature` block. |
| `cross-bundle-hash-collision` | 🔴 | Same `items[].sha256` appears in 2+ different bundles. |
| `no-items` | 🔴 | Bundle declares no `items[]`. |
| `oversized-bundle` | 🟠 | Total `items[].size_bytes` > threshold (default 100 MB). |
| `no-provenance` | 🟠 | No `provenance` block. |
| `no-relationships` | 🟡 | No `relationships[]` declared. |
| `no-labels` | ℹ️ | No `bundle.labels` declared. |

## Composes with

- [**`evidence-bundle-fleet-summary`**](https://github.com/mizcausevic-dev/evidence-bundle-fleet-summary) — the library this wraps.
- [**`evidence-bundle-spec`**](https://github.com/mizcausevic-dev/evidence-bundle-spec) — the schema this reads.
- [**`evidence-bundle-builder`**](https://github.com/mizcausevic-dev/evidence-bundle-builder) · [**`evidence-bundle-diff`**](https://github.com/mizcausevic-dev/evidence-bundle-diff) · [**`evidence-bundle-readme-generator`**](https://github.com/mizcausevic-dev/evidence-bundle-readme-generator) — full evidence-bundle tool family.
- [**`agent-card-fleet-summary-action`**](https://github.com/mizcausevic-dev/agent-card-fleet-summary-action) · [**`mcp-tool-card-fleet-summary-action`**](https://github.com/mizcausevic-dev/mcp-tool-card-fleet-summary-action) · [**`prompt-provenance-fleet-summary-action`**](https://github.com/mizcausevic-dev/prompt-provenance-fleet-summary-action) — sibling Actions across the per-protocol fleet-summary quartet.

## License

[AGPL-3.0-or-later](LICENSE)
