import {
  REGULATED_PURPOSES,
  type BundlePurpose,
  type Finding,
  type FleetReport,
  type FleetSummaryRow,
  type Manifest,
  type SummarizeOptions
} from "./types.js";

const DEFAULT_OVERSIZE = 100 * 1024 * 1024; // 100 MB

function emptyPurposeCounts(): Record<BundlePurpose | "unspecified", number> {
  return {
    "rag-citation-pack": 0,
    "audit-evidence": 0,
    "compliance-disclosure": 0,
    "incident-response": 0,
    "due-diligence": 0,
    "regulatory-submission": 0,
    other: 0,
    unspecified: 0
  };
}

function isExpired(expiresAt: string | undefined, nowMs: number): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return !Number.isNaN(t) && t < nowMs;
}

export function summarize(manifests: Manifest[], opts: SummarizeOptions = {}): FleetReport {
  const oversize = opts.oversizedThresholdBytes ?? DEFAULT_OVERSIZE;
  const generatedAt = opts.now ?? new Date().toISOString();
  const nowMs = opts.now ? Date.parse(opts.now) : Date.now();
  const rows: FleetSummaryRow[] = [];
  const findings: Finding[] = [];
  const byPurpose = emptyPurposeCounts();
  let totalItems = 0;
  let totalBytes = 0;
  let signedBundles = 0;
  let expiredBundles = 0;

  // hash → set of bundle ids carrying that hash (for cross-bundle collision detection)
  const hashIndex = new Map<string, Set<string>>();

  for (const m of manifests) {
    if (!m.bundle || !Array.isArray(m.items)) continue;
    const id = m.bundle.id;
    const purpose: BundlePurpose | "unspecified" = m.bundle.purpose ?? "unspecified";
    const items = m.items.length;
    let bytes = 0;
    for (const i of m.items) bytes += i.size_bytes;
    const signed = !!m.signature;
    const expired = isExpired(m.bundle.expires_at, nowMs);
    const hasProvenance = !!m.provenance && Object.keys(m.provenance).length > 0;

    if (purpose in byPurpose) byPurpose[purpose] += 1;
    totalItems += items;
    totalBytes += bytes;
    if (signed) signedBundles += 1;
    if (expired) expiredBundles += 1;

    rows.push({ id, subject: m.bundle.subject, purpose, items, totalBytes: bytes, signed, expired, hasProvenance });

    // ─── findings ──
    if (expired) {
      findings.push({
        code: "bundle-expired",
        severity: "high",
        message: `Bundle expired at ${m.bundle.expires_at}.`,
        subject: id,
        subjectName: m.bundle.subject
      });
    }
    if (m.bundle.purpose && REGULATED_PURPOSES.has(m.bundle.purpose) && !signed) {
      findings.push({
        code: "unsigned-regulated-bundle",
        severity: "high",
        message: `${m.bundle.purpose} bundle has no signature.`,
        subject: id,
        subjectName: m.bundle.subject
      });
    }
    if (items === 0) {
      findings.push({
        code: "no-items",
        severity: "high",
        message: `Bundle has no items[].`,
        subject: id,
        subjectName: m.bundle.subject
      });
    }
    if (bytes > oversize) {
      findings.push({
        code: "oversized-bundle",
        severity: "medium",
        message: `Bundle is ${(bytes / (1024 * 1024)).toFixed(1)} MB — exceeds threshold (${(oversize / (1024 * 1024)).toFixed(0)} MB).`,
        subject: id,
        subjectName: m.bundle.subject
      });
    }
    if (!hasProvenance) {
      findings.push({
        code: "no-provenance",
        severity: "medium",
        message: `Bundle has no provenance block.`,
        subject: id,
        subjectName: m.bundle.subject
      });
    }
    if (!m.relationships || m.relationships.length === 0) {
      findings.push({
        code: "no-relationships",
        severity: "low",
        message: `Bundle declares no relationships[].`,
        subject: id,
        subjectName: m.bundle.subject
      });
    }
    if (!m.bundle.labels || Object.keys(m.bundle.labels).length === 0) {
      findings.push({
        code: "no-labels",
        severity: "info",
        message: `Bundle has no labels.`,
        subject: id,
        subjectName: m.bundle.subject
      });
    }

    // ─── index for cross-bundle hash collision check ──
    for (const i of m.items) {
      const set = hashIndex.get(i.sha256);
      if (set) set.add(id);
      else hashIndex.set(i.sha256, new Set([id]));
    }
  }

  // cross-bundle hash collisions (same item content claimed by ≥ 2 bundles)
  for (const [sha, set] of hashIndex) {
    if (set.size > 1) {
      const ids = [...set].sort();
      findings.push({
        code: "cross-bundle-hash-collision",
        severity: "high",
        message: `sha256 ${sha.slice(0, 19)}… appears in bundles ${ids.join(", ")}.`,
        subject: ids[0]
      });
    }
  }

  rows.sort((a, b) => a.id.localeCompare(b.id));
  const ok = !findings.some((f) => f.severity === "high");

  return {
    generatedAt,
    bundles: rows.length,
    byPurpose,
    totalItems,
    totalBytes,
    signedBundles,
    expiredBundles,
    rows,
    findings,
    ok
  };
}
