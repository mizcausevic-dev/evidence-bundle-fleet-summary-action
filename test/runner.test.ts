import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { run, type RunnerEnv } from "../src/runner.js";
import { summarize } from "../src/summarize.js";
import { toMarkdown, toSummary } from "../src/format.js";
import type { Manifest } from "../src/types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES = `${here}/../fixtures/bundles`;

function envWithInputs(inputs: Record<string, string>): RunnerEnv {
  return {
    inputs,
    readFile: (p) => readFileSync(p, "utf8"),
    readDir: (p) => readdirSync(p),
    isFile: (p) => statSync(p).isFile(),
    write: () => undefined
  };
}

describe("runner.run", () => {
  it("exits 1 when fail-on-high set and high findings exist", async () => {
    const r = await run(envWithInputs({ bundles_dir: FIXTURES, fail_on_high: "true", comment_on_pr: "false" }));
    expect(r.exitCode).toBe(1);
    expect(r.report.bundles).toBe(6);
    expect(r.commentPosted).toBe(false);
  });

  it("exits 0 when fail-on-high is false", async () => {
    const r = await run(envWithInputs({ bundles_dir: FIXTURES, fail_on_high: "false", comment_on_pr: "false" }));
    expect(r.exitCode).toBe(0);
  });

  it("rejects when bundles-dir input is missing", async () => {
    await expect(run({ inputs: {} })).rejects.toThrow(/bundles_dir/);
  });

  it("rejects invalid oversized-mb", async () => {
    await expect(run(envWithInputs({ bundles_dir: FIXTURES, oversized_mb: "-1" }))).rejects.toThrow(/oversized-mb/);
  });

  it("posts a PR comment in pull_request context", async () => {
    const calls: Array<{ body: string }> = [];
    const env: RunnerEnv = {
      inputs: { bundles_dir: FIXTURES, comment_on_pr: "auto", github_token: "ghs_test", fail_on_high: "false" },
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_REPOSITORY: "mizcausevic-dev/test",
      GITHUB_EVENT_PATH: `${here}/event.json`,
      readFile: (p) => (p.endsWith("event.json") ? JSON.stringify({ number: 42 }) : readFileSync(p, "utf8")),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      postComment: async (args) => { calls.push({ body: args.body }); },
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(true);
    expect(calls[0].body).toContain("Evidence Bundle fleet summary");
  });

  it("skips PR comment when token is missing", async () => {
    const env: RunnerEnv = {
      inputs: { bundles_dir: FIXTURES, comment_on_pr: "true", fail_on_high: "false" },
      GITHUB_REPOSITORY: "x/y",
      GITHUB_EVENT_PATH: "/event.json",
      readFile: (p) => (p.endsWith("event.json") ? "{}" : readFileSync(p, "utf8")),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(false);
    expect(r.reason).toBe("no github-token provided");
  });

  it("skips PR comment when GITHUB_EVENT_PATH missing", async () => {
    const env: RunnerEnv = {
      inputs: { bundles_dir: FIXTURES, comment_on_pr: "true", github_token: "ghs", fail_on_high: "false" },
      GITHUB_REPOSITORY: "x/y",
      readFile: (p) => readFileSync(p, "utf8"),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(false);
    expect(r.reason).toBe("no GITHUB_EVENT_PATH");
  });

  it("skips PR comment when event has no PR number", async () => {
    const env: RunnerEnv = {
      inputs: { bundles_dir: FIXTURES, comment_on_pr: "true", github_token: "ghs", fail_on_high: "false" },
      GITHUB_REPOSITORY: "x/y",
      GITHUB_EVENT_PATH: "/event.json",
      readFile: (p) => (p.endsWith("event.json") ? "{}" : readFileSync(p, "utf8")),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(false);
    expect(r.reason).toBe("no PR number in event payload");
  });

  it("does not comment on non-PR events with comment_on_pr=auto", async () => {
    const env: RunnerEnv = {
      inputs: { bundles_dir: FIXTURES, comment_on_pr: "auto", github_token: "ghs", fail_on_high: "false" },
      GITHUB_EVENT_NAME: "push",
      readFile: (p) => readFileSync(p, "utf8"),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(false);
  });

  it("honors oversized-mb input", async () => {
    const r = await run(envWithInputs({ bundles_dir: FIXTURES, fail_on_high: "false", comment_on_pr: "false", oversized_mb: "0.001" }));
    expect(r.report.findings.some((f) => f.code === "oversized-bundle")).toBe(true);
  });
});

describe("summarize + format unit coverage", () => {
  const manifests: Manifest[] = readdirSync(FIXTURES)
    .filter((e) => e.endsWith(".json"))
    .map((e) => JSON.parse(readFileSync(`${FIXTURES}/${e}`, "utf8")) as Manifest);

  it("toSummary formats the line", () => {
    const r = summarize(manifests, { now: "2026-05-27T00:00:00Z" });
    const s = toSummary(r);
    expect(s).toContain("bundle");
  });

  it("toMarkdown emits per-bundle table and findings", () => {
    const md = toMarkdown(summarize(manifests, { now: "2026-05-27T00:00:00Z" }));
    expect(md).toContain("Evidence Bundle fleet summary");
    expect(md).toContain("| bundle | purpose |");
  });
});
