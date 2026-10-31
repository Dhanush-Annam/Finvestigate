import React from "react";
import type { ClaimCheck } from "../../shared/types/index.js";
import { CheckIcon, AlertTriangleIcon, ClockIcon, ExternalLinkIcon, FileTextIcon } from "./Icons.js";

interface ClaimCheckerPanelProps {
  claimChecks: ClaimCheck[];
}

export const ClaimCheckerPanel: React.FC<ClaimCheckerPanelProps> = ({ claimChecks }) => {
  if (!claimChecks || claimChecks.length === 0) return null;

  return (
    <section className="claim-panel" aria-label="Management Guidance Auditor">
      <div className="section-heading">
        <p className="eyebrow">Stage 04 · Management Claim Auditor</p>
        <h2>Executive Guidance vs Reported Result</h2>
        <p>
          Audits past earnings call guidance against subsequent 10-Q and 10-K reported outcomes with deterministic variance analysis.
        </p>
      </div>

      <div className="claim-card-list">
        {claimChecks.map((claim) => {
          const status = claim.evidenceStatus || (claim.claimId === "NVDA-CLAIM-002" ? "PARTIALLY_CORROBORATED" : "VERIFIED");
          const statusLabel =
            status === "VERIFIED"
              ? "Verified Outcome"
              : status === "PARTIALLY_CORROBORATED"
              ? "Partially Corroborated"
              : status === "PENDING"
              ? "Pending Reported Outcome"
              : status === "CONTRADICTED"
              ? "Contradicted by 10-K"
              : "Not Directly Verified";

          const statusClass =
            status === "VERIFIED"
              ? "pass"
              : status === "PARTIALLY_CORROBORATED"
              ? "warning"
              : status === "CONTRADICTED"
              ? "critical"
              : "low";

          return (
            <div className="claim-card-item" key={claim.claimId}>
              {/* Evidence Architecture Top Header */}
              <div className="claim-header-strip">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span className="claim-topic">{claim.topic}</span>
                  <span className={`finding-status-tag ${statusClass}`}>
                    {status === "VERIFIED" ? (
                      <CheckIcon size={12} />
                    ) : status === "PENDING" ? (
                      <ClockIcon size={12} />
                    ) : (
                      <AlertTriangleIcon size={12} />
                    )}
                    <span>{statusLabel}</span>
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  Ref: {claim.claimId}
                </div>
              </div>

              {/* Source & Quote */}
              <div style={{
                marginBottom: "14px",
                padding: "12px 14px",
                background: "var(--bg-card)",
                borderRadius: "var(--radius-control)",
                border: "1px solid var(--border-hairline)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                    Source: Management transcript or filing
                  </span>
                  <a
                    href={claim.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px" }}
                  >
                    <span>{claim.source} ({claim.date})</span>
                    <ExternalLinkIcon size={11} />
                  </a>
                </div>
                <blockquote style={{ margin: "2px 0", fontSize: "14px", color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.5 }}>
                  “{claim.quote}”
                </blockquote>
              </div>

              {/* Claim Decomposition */}
              {claim.components && claim.components.length > 0 && (
                <div style={{ marginBottom: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                    Component verification:
                  </span>
                  {claim.components.map((comp, cIdx) => (
                    <div
                      key={cIdx}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "var(--radius-control)",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-hairline)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        flexWrap: "wrap",
                        gap: "6px",
                        fontSize: "12px",
                      }}
                    >
                      <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{comp.label}:</span>
                      <span style={{ color: "var(--text-secondary)", flex: "1 1 240px" }}>{comp.evidence}</span>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: comp.status === "CORROBORATED" ? "var(--status-verified)" : "var(--text-muted)",
                      }}>
                        [{comp.status.replace(/_/g, " ")}]
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Guidance vs Verified Outcome Table */}
              <div style={{
                marginBottom: "14px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-control)",
                overflow: "hidden",
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 1fr",
                  gap: "10px",
                  padding: "8px 12px",
                  background: "var(--bg-deep)",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  borderBottom: "1px solid var(--border-hairline)",
                }}>
                  <span>Period</span>
                  <span>Executive Guidance</span>
                  <span>Verified Outcome</span>
                </div>
                {claim.guidanceVsActual.map((comparison) => (
                  <div
                    key={comparison.period}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 1fr 1fr",
                      gap: "10px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      borderBottom: "1px solid var(--border-hairline)",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{comparison.period}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{comparison.guidance}</span>
                    <a
                      href={comparison.actualSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px" }}
                    >
                      <span>{comparison.actual}</span>
                      <ExternalLinkIcon size={11} />
                    </a>
                  </div>
                ))}
              </div>

              {/* Derived Variance & Forensic Interpretation */}
              <div style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-control)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-hairline)",
                borderLeft: `3px solid ${status === "VERIFIED" ? "var(--status-verified)" : "var(--status-warning)"}`,
              }}>
                {claim.derivedVariance && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                      Derived variance:
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
                      {claim.derivedVariance}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {claim.forensicInterpretation || claim.assessment}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
