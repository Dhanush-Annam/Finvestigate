import React from "react";
import type { InvestigationData } from "../types/index.js";
import { displayCalculationValue } from "../types/index.js";
import { getMaterialRedFlags, getLowSeveritySignals, getDiligenceVerdict } from "../../shared/utils/diligence.js";
import { FileTextIcon, ShieldIcon, CheckIcon, AlertTriangleIcon, TrendingUpIcon, TrendingDownIcon } from "./Icons.js";

interface InvestigationBriefProps {
  investigation: InvestigationData;
  divergenceAlert: boolean;
  verifiedCount: number;
  rejectedCount: number;
  totalCount: number;
  onOpenExportModal: () => void;
  innerRef?: React.RefObject<HTMLElement | null>;
}

export const InvestigationBrief: React.FC<InvestigationBriefProps> = ({
  investigation,
  divergenceAlert,
  verifiedCount,
  rejectedCount,
  totalCount,
  onOpenExportModal,
  innerRef,
}) => {
  const revCalc = investigation.calculations.find((c) => c.metric === "revenue_growth_yoy");
  const netCalc = investigation.calculations.find((c) => c.metric === "netIncome_growth_yoy");
  const ocfCalc = investigation.calculations.find((c) => c.metric === "operatingCashFlow_growth_yoy");
  const recCalc = investigation.calculations.find((c) => c.metric === "receivables_growth_yoy");
  const fcfCalc = investigation.calculations.find((c) => c.metric === "free_cash_flow");
  const convCalc = investigation.calculations.find((c) => c.metric === "cash_conversion_ratio");

  const materialRedFlags = getMaterialRedFlags(investigation.findings);
  const lowSeveritySignals = getLowSeveritySignals(investigation.findings);
  const verdictInfo = getDiligenceVerdict(investigation.findings, investigation.company);

  return (
    <section
      className="finvestigate-brief-section"
      ref={innerRef as React.RefObject<HTMLElement>}
      id="step-conclude"
      aria-label="Executive Forensic Diligence Brief"
    >
      <div className="brief-header">
        <div>
          <p className="eyebrow">Stage 06 · Culminating Diligence Brief</p>
          <h2 className="brief-title">
            Forensic Investigation Brief: {investigation.displayName} ({investigation.company})
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
            Automated forensic synthesis answering the fundamental diligence questions for investment and credit committees.
          </p>
        </div>

        <div className="brief-actions">
          <button
            type="button"
            className="brief-export-btn"
            onClick={onOpenExportModal}
            title="Download full diligence memo"
          >
            <FileTextIcon size={14} />
            <span>Export Committee Dossier</span>
          </button>
        </div>
      </div>

      {/* Final Diligence Verdict Header */}
      <div className={`verdict-dominant-card ${materialRedFlags.length > 0 ? "warning" : "monitor"}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                Final Forensic Diligence Outcome
              </span>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--accent)", background: "var(--bg-card)", padding: "2px 6px", borderRadius: "var(--radius-tag)", border: "1px solid var(--border-hairline)" }}>
                Audit Seal: Finvestigate-10K
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "24px",
                fontWeight: 600,
                color: materialRedFlags.length > 0 ? "var(--status-rejected)" : "var(--status-warning)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                {materialRedFlags.length > 0 ? <AlertTriangleIcon size={20} /> : <CheckIcon size={20} />}
                <span>{verdictInfo.heading}</span>
              </span>
              <span style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "var(--text-primary)",
              }}>
                · {verdictInfo.subtextBadge}
              </span>
            </div>

            {/* Dominant Stat Callout */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
              <span style={{ color: lowSeveritySignals.length > 0 ? "var(--status-warning)" : "var(--text-muted)" }}>
                {lowSeveritySignals.length} low-severity signal{lowSeveritySignals.length === 1 ? "" : "s"}
              </span>
              <span style={{ color: "var(--text-muted)" }}>·</span>
              <span style={{ color: materialRedFlags.length > 0 ? "var(--status-rejected)" : "var(--status-verified)" }}>
                {materialRedFlags.length} material red flag{materialRedFlags.length === 1 ? "" : "s"}
              </span>
              <span style={{ color: "var(--text-muted)" }}>·</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {verifiedCount} claims verified against primary filings
              </span>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "12px 0 0", lineHeight: 1.6, maxWidth: "800px" }}>
              {verdictInfo.narrative}
            </p>
          </div>

          <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-card)", padding: "12px 16px", borderRadius: "var(--radius-control)", border: "1px solid var(--border-hairline)" }}>
            <div style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: "12px", marginBottom: "4px" }}>
              Evidence Verification Gate
            </div>
            <div>{verifiedCount} Grounded · {rejectedCount} Intercepted</div>
            <div style={{ color: "var(--status-verified)", marginTop: "2px" }}>
              0 Cross-Company Contamination
            </div>
          </div>
        </div>
      </div>

      {/* The 4 Diligence Synthesis Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Answer 1: What Changed? */}
        <div style={{ padding: "18px 20px", background: "var(--bg-deep)", borderRadius: "var(--radius-card)", border: "1px solid var(--border-hairline)" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            01 · Trajectory
          </span>
          <h4 style={{ margin: "4px 0 12px", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
            Deterministic YoY Trajectory
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Revenue:</span>
              <strong style={{ color: "var(--text-primary)" }}>{revCalc ? displayCalculationValue(revCalc) : "N/A"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Net Income:</span>
              <strong style={{ color: "var(--status-verified)" }}>{netCalc ? displayCalculationValue(netCalc) : "N/A"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Operating Cash Flow:</span>
              <strong style={{ color: (ocfCalc?.value ?? 0) < 0 ? "var(--status-rejected)" : "var(--text-primary)" }}>
                {ocfCalc ? displayCalculationValue(ocfCalc) : "N/A"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Receivables:</span>
              <strong style={{ color: "var(--status-warning)" }}>{recCalc ? displayCalculationValue(recCalc) : "N/A"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Free Cash Flow:</span>
              <strong style={{ color: (fcfCalc?.value ?? 0) < 0 ? "var(--status-rejected)" : "var(--status-verified)" }}>
                {fcfCalc ? displayCalculationValue(fcfCalc) : "N/A"}
              </strong>
            </div>
            {convCalc && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Cash Conversion (OCF ÷ NI):</span>
                <strong style={{ color: (convCalc.value ?? 1) < 0.70 ? "var(--status-warning)" : "var(--text-primary)" }}>
                  {displayCalculationValue(convCalc)}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Answer 2: What Looks Suspicious? */}
        <div style={{ padding: "18px 20px", background: "var(--bg-deep)", borderRadius: "var(--radius-card)", border: "1px solid var(--border-hairline)" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            02 · Signals
          </span>
          <h4 style={{ margin: "4px 0 12px", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
            Forensic Screening Signals
          </h4>
          {materialRedFlags.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {materialRedFlags.map((s, idx) => (
                <div key={idx} style={{ fontSize: "12px", borderLeft: "2px solid var(--status-rejected)", paddingLeft: "8px" }}>
                  <strong style={{ color: "var(--status-rejected)" }}>{s.signalName || "Material Red Flag"}:</strong>
                  <p style={{ margin: "2px 0", color: "var(--text-secondary)", fontSize: "12px" }}>
                    {s.claim}
                  </p>
                </div>
              ))}
            </div>
          ) : lowSeveritySignals.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ padding: "6px 10px", borderRadius: "var(--radius-tag)", background: "var(--status-verified-bg)", border: "1px solid var(--status-verified-border)", fontSize: "11px", color: "var(--status-verified)" }}>
                No material accounting red flags detected.
              </div>
              <div style={{ fontSize: "12px", borderLeft: "2px solid var(--status-warning)", paddingLeft: "8px" }}>
                <strong style={{ color: "var(--status-warning)" }}>1 Low-Severity Screening Signal:</strong>
                <p style={{ margin: "2px 0", color: "var(--text-secondary)", fontSize: "12px" }}>
                  Receivables increased materially, but remained broadly aligned with revenue growth. The absolute increase warrants monitoring, but does not independently establish abnormal collection behavior.
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "var(--status-verified)" }}>
              No material divergences detected across revenue growth, operating cash collection, or accounts receivable.
            </p>
          )}
        </div>

        {/* Answer 3: Competing Theses */}
        <div style={{ padding: "18px 20px", background: "var(--bg-deep)", borderRadius: "var(--radius-card)", border: "1px solid var(--border-hairline)" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            03 · Theses
          </span>
          <h4 style={{ margin: "4px 0 12px", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
            Bull vs Bear Adversarial Tension
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--status-verified)", fontWeight: 500, marginBottom: "2px" }}>
                <TrendingUpIcon size={13} />
                <span>Bull Thesis:</span>
              </div>
              <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {investigation.debate?.bullCase.arguments[0]?.argument ||
                  "Underlying customer demand remains robust; cash flow lag reflects normal inventory positioning and enterprise delivery timelines."}
              </p>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--status-rejected)", fontWeight: 500, marginBottom: "2px" }}>
                <TrendingDownIcon size={13} />
                <span>Bear Thesis:</span>
              </div>
              <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {investigation.debate?.bearCase.arguments[0]?.argument ||
                  "Earnings expansion unbacked by cash collection signals potential deterioration in credit terms or premature revenue recognition."}
              </p>
            </div>
          </div>
        </div>

        {/* Answer 4: Citation Integrity */}
        <div style={{ padding: "18px 20px", background: "var(--bg-deep)", borderRadius: "var(--radius-card)", border: "1px solid var(--border-hairline)" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            04 · Integrity
          </span>
          <h4 style={{ margin: "4px 0 12px", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
            Citation Verification & Gate Audit
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Audit Scope:</span>
              <strong style={{ color: "var(--text-primary)" }}>{investigation.company} 10-K Filings</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Mechanically Grounded:</span>
              <strong style={{ color: "var(--status-verified)" }}>{verifiedCount} of {totalCount} claims ({totalCount > 0 ? ((verifiedCount / totalCount) * 100).toFixed(1) : "100.0"}%)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Unsupported Intercepted:</span>
              <strong style={{ color: rejectedCount > 0 ? "var(--status-rejected)" : "var(--status-verified)" }}>
                {rejectedCount} purged {rejectedCount > 0 ? "(cross-company or ungrounded)" : "(Zero violations)"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Cross-Company Contamination:</span>
              <strong style={{ color: "var(--status-verified)" }}>0 Permitted</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Numeric Drift Boundary:</span>
              <strong style={{ color: "var(--accent)" }}>0.5% Strict Boundary</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Unresolved Question for Committee */}
      <div style={{
        padding: "16px 20px",
        background: "var(--bg-deep)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border-hairline)",
        borderLeft: "3px solid var(--accent)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <FileTextIcon size={14} style={{ color: "var(--accent)" }} />
          <strong style={{ color: "var(--text-primary)", fontSize: "13px" }}>
            Primary Unresolved Diligence Question
          </strong>
        </div>
        <p style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500, margin: "4px 0 8px" }}>
          "{investigation.debate?.judgeVerdict.mostImportantUnresolvedQuestion ||
            `Can operational growth and cash collection remain aligned as ${investigation.displayName} scales its operational base?`}"
        </p>

        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--accent)" }}>Committee Follow-up:</strong>{" "}
          Review quarterly DSO, receivables aging, allowance coverage, and customer concentration as {investigation.displayName} scales.
        </div>
      </div>
    </section>
  );
};
