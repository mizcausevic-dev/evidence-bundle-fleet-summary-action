// Fleet-analyze a directory of evidence-bundle manifest.json files.
// Subset of evidence-bundle-spec v0.1 used for analysis.

export type BundlePurpose =
  | "rag-citation-pack"
  | "audit-evidence"
  | "compliance-disclosure"
  | "incident-response"
  | "due-diligence"
  | "regulatory-submission"
  | "other";

export type SignatureAlgorithm = "ed25519" | "bls12-381-aggregate";

export interface ManifestItem {
  id: string;
  path: string;
  media_type: string;
  sha256: string;
  size_bytes: number;
}

export interface Manifest {
  evidence_bundle_version: string;
  bundle: {
    id: string;
    subject: string;
    purpose?: BundlePurpose;
    created_at?: string;
    creator: string;
    expires_at?: string;
    labels?: Record<string, string>;
  };
  items: ManifestItem[];
  relationships?: Array<{ subject: string; predicate: string; object: string; note?: string }>;
  provenance?: Record<string, unknown>;
  signature?: { algorithm: SignatureAlgorithm; signer: string; value: string; signed_at?: string };
}

export type FindingSeverity = "high" | "medium" | "low" | "info";

export type FindingCode =
  | "bundle-expired"
  | "unsigned-regulated-bundle"
  | "cross-bundle-hash-collision"
  | "oversized-bundle"
  | "no-provenance"
  | "no-items"
  | "no-relationships"
  | "no-labels";

export interface Finding {
  code: FindingCode;
  severity: FindingSeverity;
  message: string;
  subject: string;
  subjectName?: string;
}

export interface FleetSummaryRow {
  id: string;
  subject: string;
  purpose: BundlePurpose | "unspecified";
  items: number;
  totalBytes: number;
  signed: boolean;
  expired: boolean;
  hasProvenance: boolean;
}

export interface FleetReport {
  generatedAt: string;
  bundles: number;
  byPurpose: Record<BundlePurpose | "unspecified", number>;
  totalItems: number;
  totalBytes: number;
  signedBundles: number;
  expiredBundles: number;
  rows: FleetSummaryRow[];
  findings: Finding[];
  ok: boolean;
}

export interface SummarizeOptions {
  /** Bundles larger than this byte count are flagged with `oversized-bundle`. Default 100 MB. */
  oversizedThresholdBytes?: number;
  /** Optional clock override for `bundle-expired` detection. Default `new Date()`. */
  now?: string;
}

/** Purposes for which an unsigned bundle is a high finding (audit / regulatory). */
export const REGULATED_PURPOSES: ReadonlySet<BundlePurpose> = new Set([
  "audit-evidence",
  "compliance-disclosure",
  "regulatory-submission"
]);
