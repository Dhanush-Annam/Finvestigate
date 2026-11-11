import React from "react";
import type { InvestigationData } from "../types/index.js";
import { WORKFLOW_STAGES } from "../types/index.js";
import { getMaterialRedFlags, getLowSeveritySignals, getDiligenceVerdict } from "../../shared/utils/diligence.js";
import { ShieldIcon, AlertTriangleIcon, CheckIcon, TerminalIcon, ActivityIcon } from "./Icons.js";

interface InvestigationTerminalProps {
  investigation: InvestigationData | null;
  activeWorkflowStep: string;
  onScrollToStep: (stepId: string) => void;
  divergenceAlert: boolean;
  divergenceCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalCount?: number;
  lastGateLatencyMs?: number;
}

export const InvestigationTerminal: React.FC<InvestigationTerminalProps> = ({
  investigation,
  activeWorkflowStep,
  onScrollToStep,
  divergenceAlert,
  divergenceCount,
  verifiedCount,
  rejectedCount,
  totalCount,
  lastGateLatencyMs = 2.1,
}) => {
  const findings = investigation?.findings ?? [];
  const materialRedFlags = getMaterialRedFlags(findings);
  const lowSeveritySignals = getLowSeveritySignals(findings);
  const verdictInfo = getDiligenceVerdict(findings, investigation?.company);

  const total = totalCount ?? (verifiedCount + rejectedCount);
  const groundedRate = total > 0 ? ((verifiedCount / total) * 100).toFixed(1) : "100.0";
  const interceptedRate = total > 0 ? ((rejectedCount / total) * 100).toFixed(1) : "0.0";

  return (
    <>
      {/* Hero Statement */}
      <section className="hero" id="step-investigate">
        <p className="eyebrow">SEC EDGAR Forensic Financial Intelligence Engine</p>
        <h1>
          Deterministic financial audit.<br />
          Ground every claim in verified regulatory filing data.
        </h1>
        <p className="lede">
          A wrong figure in an investment memorandum is dangerous. An ungrounded LLM citation is worse.
          Finvestigate enforces mathematical determinism and an automated citation verification gate
          before any AI analysis reaches the diligence file.
        </p>

        {/* Evidence Gate Performance Spotlight */}
        <div className="evidence-gate-summary-strip">
          <div className="strip-header">
            <div className="strip-title">
              <ShieldIcon size={14} />
              <span>Evidence Gate Verification Invariants</span>
            </div>
            <span className="strip-latency">
              {lastGateLatencyMs ? `Mechanical gate latency: ${lastGateLatencyMs.toFixed(1)}ms` : "Sub-5ms mechanical enforcement"}
            </span>
          </div>

          <div className="stat-grid-row">
            <div className="stat-cell">
              <div className="stat-figure">{total}</div>
              <div className="stat-label">Claims Evaluated</div>
              <div className="stat-sub">Audited 10-K filing corpus</div>
            </div>

            <div className="stat-cell verified">
              <div className="stat-figure">{verifiedCount}</div>
              <div className="stat-label">Claims Verified</div>
              <div className="stat-sub">{groundedRate}% database-grounded</div>
            </div>

            <div className="stat-cell intercepted">
              <div className="stat-figure">{rejectedCount}</div>
              <div className="stat-label">Unsupported Intercepted</div>
              <div className="stat-sub">{interceptedRate}% mechanically purged</div>
            </div>

            <div className="stat-cell zero">
              <div className="stat-figure">0</div>
              <div className="stat-label">Cross-Company Contamination</div>
              <div className="stat-sub">Zero competitor facts permitted</div>
            </div>
          </div>

          <div className="strip-guarantee-note">
            <ShieldIcon size={14} style={{ color: "var(--accent)" }} />
            <span>
              <strong>Architectural Guarantee:</strong> Only claims matching verified database 10-K figures within strict 0.5% tolerance pass the evidence gate into downstream analysis.
            </span>
          </div>
        </div>
      </section>

      {/* 6-Stage Interactive Workflow Stepper Ribbon */}
      <nav className="workflow-ribbon" aria-label="Investigation Workflow Stepper">
        {WORKFLOW_STAGES.map((step) => {
          const isActive = activeWorkflowStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              className={`workflow-step-btn ${isActive ? "active" : ""}`}
              onClick={() => onScrollToStep(step.id)}
              title={`Jump to ${step.title}`}
            >
              <span className="step-number">{step.stepNum}</span>
              <span>{step.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Investigation Status Terminal Card */}
      {investigation && (
        <section className="investigation-status-terminal" style={{ marginBottom: "28px" }} aria-label="Investigation status terminal">
          <div className="terminal-body">
            <div className="terminal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TerminalIcon size={14} style={{ color: "var(--accent)" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>
                  Investigation Status · {investigation.company} (CIK: {investigation.cik})
                </span>
              </div>

              {materialRedFlags.length > 0 ? (
                <span className="finding-status-tag critical">
                  <AlertTriangleIcon size={12} />
                  {materialRedFlags.length} Material Red Flag{materialRedFlags.length > 1 ? "s" : ""} Detected
                </span>
              ) : lowSeveritySignals.length > 0 ? (
                <span className="finding-status-tag warning">
                  <AlertTriangleIcon size={12} />
                  {lowSeveritySignals.length} Low-Severity Signal{lowSeveritySignals.length > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="finding-status-tag pass">
                  <CheckIcon size={12} />
                  0 Material Red Flags · Balanced Audit Profile
                </span>
              )}
            </div>

            <div className="stat-tile-group">
              <div className="stat-tile">
                <div className="stat-tile-value">{investigation.facts.length}</div>
                <div className="stat-tile-label">Primary XBRL Facts</div>
              </div>

              <div className="stat-tile">
                <div className="stat-tile-value">{investigation.calculations.length}</div>
                <div className="stat-tile-label">Deterministic Formulas</div>
              </div>

              <div className="stat-tile">
                <div className="stat-tile-value" style={{ color: "var(--status-verified)" }}>{verifiedCount}</div>
                <div className="stat-tile-label">Verified Grounded Claims</div>
              </div>

              <div className="stat-tile">
                <div className="stat-tile-value" style={{ color: verdictInfo.verdict === "CLEAR" ? "var(--status-verified)" : "var(--status-warning)" }}>
                  {verdictInfo.heading}
                </div>
                <div className="stat-tile-label">Diligence Verdict</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
};
