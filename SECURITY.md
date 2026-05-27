# Security Policy

`evidence-bundle-fleet-summary-action` reads JSON files from the workflow's checkout, posts a single PR comment via the GitHub API (when run on a pull_request event with a valid token), and writes structured outputs. No remote fetch beyond the GitHub API comment call, no execution of user-supplied code, no signature verification.

The action uses `${{ github.token }}` by default — scoped to the repository where the workflow runs and never persisted. If you provide your own token via the `github-token` input, ensure it has only `pull-requests: write` permissions.

## Supported versions

Only the latest tagged release is supported.

## Reporting a vulnerability

Please use GitHub Security Advisories for private disclosure:

- [Open a security advisory](https://github.com/mizcausevic-dev/evidence-bundle-fleet-summary-action/security/advisories/new)

Do not file public issues for security reports.
