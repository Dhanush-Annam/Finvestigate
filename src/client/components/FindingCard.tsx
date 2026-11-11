import React from "react";
import type { Finding } from "../../shared/types/index.js";
import { labelFor } from "../types/index.js";
import { ScaleIcon, TrendingUpIcon, TrendingDownIcon, SearchIcon, AlertTriangleIcon } from "./Icons.js";

interface FindingCardProps {
  findings: Finding[];
  onInspectCalculation: (calcId: string | null) => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  findings,
  onInspectCalculation,
}) => {
  if (!findings || findings.length === 0) return null;

  return (
    <section className="dossier-panel" aria-label="Forensic Anomaly Case Files">
      <div className="section-heading">
        <p className="eyebrow">Stage 02 · Discover · Forensic Case Files</p>
        <h2>Detailed Divergence Evidence & Rationale</h2>
        <p>
          Every anomaly maps directly to deterministic math in the evidence store with verified source facts.
        </p>
      </div>

      <div className="dossier-list">
        {findings.map((finding) => (
          <article className="dossier-case-card" key={finding.findingId}>
            <div className="dossier-topline">
              <span className="dossier-case-num">{finding.findingId}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span className={`finding-status-tag ${finding.severity === "HIGH" ? "critical" : "warning"}`}>
                  <AlertTriangleIcon size={12} />
                  {finding.severity === "HIGH" ? "High Severity" : "Low Severity"}
                </span>
                <span className="signal-pill">
                  {finding.signalName || finding.category.replace(/_/g, " ")}
                </span>
                {finding.threshold && (
                  <span className="threshold-hint">
                    Threshold: {finding.threshold}
                  </span>
                )}
              </div>
            </div>

            <h3 className="dossier-case-title">
              {finding.claim}
            </h3>

            {/* Evidence Metrics */}
            <div className="dossier-metrics-strip">
              {finding.evidence.map((item) => (
                <div className="dossier-metric-pill" key={item.metric}>
                  <span>{labelFor(item.metric)}:</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {/* Financial Rationale Callout */}
            <div className="dossier-rationale-box">
              <div className="rationale-head">
                <ScaleIcon size={14} style={{ color: "var(--accent)" }} />
                <span>Financial Analyst Rationale</span>
              </div>
              <p className="rationale-text">
                {finding.financialRationale ||
                  "The absolute increase warrants monitoring, but current annual filing disclosures do not establish abnormal collection behavior."}
              </p>
            </div>

            {/* Counter-Evidence Note */}
            <p className="contradiction-box">
              <strong>Audited counter-evidence:</strong> {finding.contradictoryEvidence}
            </p>

            {/* Balanced Perspectives: Bull vs Bear Interpretations */}
            <div className="dossier-sides-grid">
              <div className="dossier-side-box bull">
                <h4>
                  <TrendingUpIcon size={14} style={{ color: "var(--status-verified)" }} />
                  <span>Bull Interpretation</span>
                </h4>
                <p>
                  Working-capital investments or inventory builds in high-growth periods frequently depress cash collection temporarily without impairing underlying unit economics.
                </p>
              </div>
              <div className="dossier-side-box bear">
                <h4>
                  <TrendingDownIcon size={14} style={{ color: "var(--status-rejected)" }} />
                  <span>Bear Interpretation</span>
                </h4>
                <p>
                  Surging accounting profit unbacked by cash receipts can signal customer payment extensions, aggressive revenue recognition, or mounting collection friction.
                </p>
              </div>
            </div>

            {/* What to investigate next */}
            <div className="investigation-lead-box">
              <div className="lead-header">
                <SearchIcon size={14} style={{ color: "var(--accent)" }} />
                <span>What to Investigate Next</span>
              </div>
              <p>
                {finding.whatToInvestigateNext ||
                  "Review customer credit terms and Days Sales Outstanding (DSO) aging buckets in the 10-K footnote disclosures."}
              </p>
            </div>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="export-button"
                onClick={() => onInspectCalculation(finding.calculationRefs[0] ?? null)}
              >
                <span>Trace calculation in Lineage</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>→</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
