import type { FindingSeverity, FleetReport } from "./types.js";

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  high: "🔴 high",
  medium: "🟠 medium",
  low: "🟡 low",
  info: "ℹ️  info"
};
const SEVERITY_RANK: Record<FindingSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function toMarkdown(report: FleetReport): string {
  const lines: string[] = [];
  lines.push(report.ok ? `# Evidence Bundle fleet summary ✅` : `# Evidence Bundle fleet summary ❌`);
  lines.push(``);
  lines.push(`Generated: \`${report.generatedAt}\``);
  lines.push(``);
  lines.push(`## Fleet`);
  lines.push(``);
  lines.push(`- Bundles: **${report.bundles}** · Items: ${report.totalItems} · Total size: ${humanBytes(report.totalBytes)}`);
  lines.push(`- Signed: ${report.signedBundles} · Expired: ${report.expiredBundles}`);
  const ps = report.byPurpose;
  lines.push(
    `- Purpose: audit-evidence=${ps["audit-evidence"]} · compliance=${ps["compliance-disclosure"]} · incident=${ps["incident-response"]} · regulatory=${ps["regulatory-submission"]} · due-diligence=${ps["due-diligence"]} · rag=${ps["rag-citation-pack"]} · other=${ps.other} · unspecified=${ps.unspecified}`
  );
  lines.push(``);
  lines.push(`## Per bundle`);
  lines.push(``);
  lines.push(`| bundle | purpose | items | size | signed | expired | provenance |`);
  lines.push(`|---|---|---:|---:|:---:|:---:|:---:|`);
  for (const r of report.rows) {
    lines.push(
      `| \`${r.id}\` | ${r.purpose} | ${r.items} | ${humanBytes(r.totalBytes)} | ${r.signed ? "✓" : "—"} | ${r.expired ? "⏰" : "—"} | ${r.hasProvenance ? "✓" : "—"} |`
    );
  }

  const ranked = [...report.findings].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  if (ranked.length > 0) {
    lines.push(``);
    lines.push(`## Findings (${ranked.length})`);
    lines.push(``);
    lines.push(`| severity | code | bundle | message |`);
    lines.push(`|---|---|---|---|`);
    for (const f of ranked) {
      lines.push(`| ${SEVERITY_LABEL[f.severity]} | \`${f.code}\` | ${f.subjectName ?? f.subject} | ${f.message} |`);
    }
  } else {
    lines.push(``);
    lines.push(`No findings.`);
  }
  return lines.join("\n");
}

export function toSummary(report: FleetReport): string {
  const counts: Record<FindingSeverity, number> = { high: 0, medium: 0, low: 0, info: 0 };
  for (const f of report.findings) counts[f.severity] += 1;
  return `${report.bundles} bundle${report.bundles === 1 ? "" : "s"} · ${report.signedBundles} signed · ${report.expiredBundles} expired · ${counts.high} high · ${counts.medium} medium (${report.ok ? "ok" : "fail"})`;
}
