// Fleet-analyze a directory of evidence-bundle manifest.json files.
// Subset of evidence-bundle-spec v0.1 used for analysis.
/** Purposes for which an unsigned bundle is a high finding (audit / regulatory). */
export const REGULATED_PURPOSES = new Set([
    "audit-evidence",
    "compliance-disclosure",
    "regulatory-submission"
]);
