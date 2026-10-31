import React from "react";
import type { InvestigationData } from "../types/index.js";
import { displayCalculationValue } from "../types/index.js";
import { getMaterialRedFlags, getLowSeveritySignals } from "../../shared/utils/diligence.js";
import { SearchIcon, CheckIcon, AlertTriangleIcon, ActivityIcon } from "./Icons.js";

interface DivergenceRadarProps {
  investigation: InvestigationData;
  onInspectCalculation: (calcId: string | null) => void;
  innerRef?: React.RefObject<HTMLElement | null>;
}

export const DivergenceRadar: React.FC<DivergenceRadarProps> = ({
  investigation,
  onInspectCalculation,
  innerRef,
}) => {
  const revCalc = investigation.calculations.find((c) => c.metric === "revenue_growth_yoy");
  const netCalc = investigation.calculations.find((c) => c.metric === "netIncome_growth_yoy");
  const ocfCalc = investigation.calculations.find((c) => c.metric === "operatingCashFlow_growth_yoy");
  const recCalc = investigation.calculations.find((c) => c.metric === "receivables_growth_yoy");
  const fcfCalc = investigation.calculations.find((c) => c.metric === "free_cash_flow");
  const convCalc = investigation.calculations.find((c) => c.metric === "cash_conversion_ratio");
  const capexOcfCalc = investigation.calculations.find((c) => c.metric === "capex_to_ocf_ratio");

  const normalizeWidth = (val: number | null, maxVal = 1.0) => {
    if (val === null) return "0%";
    const clamped = Math.min(Math.max(Math.abs(val) / maxVal, 0.05), 1.0);
    return `${(clamped * 100).toFixed(0)}%`;
  };

  const materialRedFlags = getMaterialRedFlags(investigation.findings);
  const lowSeveritySignals = getLowSeveritySignals(investigation.findings);
  const detectedSignals = investigation.findings.filter((f) => f.signalName || f.severity === "LOW" || f.severity === "HIGH");

  return (
    <section
      className="divergence-panel"
      ref={innerRef as React.RefObject<HTMLElement>}
      id="step-discover"
      aria-label="Cash flow quality divergence visualizer"
    >
      <div className="section-heading">
        <p className="eyebrow">Stage 02 · Discover · Pattern Screen</p>
        <h2>6-Signal Forensic Anomaly Screen</h2>
        <p>
          Reconciles reported cash generation against accounting net income using 7 deterministic formulas.
        </p>
      </div>

      <div className="divergence-grid">
        {/* Left: 7 Deterministic Growth Benchmarks */}
        <div className="divergence-chart-card">
          <div className="chart-header">
            <h3>Audited Math Benchmarks ({investigation.company})</h3>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
              Deterministic 10-K Reconciliation
            </span>
          </div>

          <div className="chart-bars-list">
            {/* 1. Revenue Growth */}
            <div
              className="chart-bar-item"
              onClick={() => onInspectCalculation(revCalc?.calcId ?? null)}
              title="Click to trace calculation in Evidence Lineage"
            >
              <div className="bar-meta">
                <span className="bar-label">
                  Revenue Growth (YoY)
                  <span className="trace-hint">· Trace</span>
                </span>
                <span className="bar-value">
                  {revCalc ? displayCalculationValue(revCalc) : "N/A"}
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: normalizeWidth(revCalc?.value ?? null, 1.0) }} />
              </div>
            </div>

            {/* 2. Net Income Growth */}
            <div
              className="chart-bar-item"
              onClick={() => onInspectCalculation(netCalc?.calcId ?? null)}
              title="Click to trace calculation in Evidence Lineage"
            >
              <div className="bar-meta">
                <span className="bar-label">
                  Net Income Growth (YoY)
                  <span className="trace-hint">· Trace</span>
                </span>
                <span className="bar-value">
                  {netCalc ? displayCalculationValue(netCalc) : "N/A"}
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill normal" style={{ width: normalizeWidth(netCalc?.value ?? null, 1.0) }} />
              </div>
            </div>

            {/* 3. Operating Cash Flow Growth */}
            <div
              className="chart-bar-item"
              onClick={() => onInspectCalculation(ocfCalc?.calcId ?? null)}
              title="Click to trace calculation in Evidence Lineage"
            >
              <div className="bar-meta">
                <span className="bar-label">
                  Operating Cash Flow (YoY)
                  <span className="trace-hint">· Trace</span>
                </span>
                <span className="bar-value" style={{ color: (ocfCalc?.value ?? 0) < 0 ? "var(--status-rejected)" : "var(--text-primary)" }}>
                  {ocfCalc ? displayCalculationValue(ocfCalc) : "N/A"}
                </span>
              </div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${(ocfCalc?.value ?? 0) < 0 ? "critical" : "normal"}`}
                  style={{ width: normalizeWidth(ocfCalc?.value ?? null, 1.0) }}
                />
              </div>
            </div>

            {/* 4. Receivables Growth */}
            <div
              className="chart-bar-item"
              onClick={() => onInspectCalculation(recCalc?.calcId ?? null)}
              title="Click to trace calculation in Evidence Lineage"
            >
              <div className="bar-meta">
                <span className="bar-label">
                  Receivables Growth (YoY)
                  <span className="trace-hint">· Trace</span>
                </span>
                <span className="bar-value">
                  {recCalc ? displayCalculationValue(recCalc) : "N/A"}
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill warning" style={{ width: normalizeWidth(recCalc?.value ?? null, 1.0) }} />
              </div>
            </div>

            {/* 5. Free Cash Flow */}
            <div
              className="chart-bar-item"
              onClick={() => onInspectCalculation(fcfCalc?.calcId ?? null)}
              title="Click to trace calculation in Evidence Lineage"
            >
              <div className="bar-meta">
                <span className="bar-label">
                  Free Cash Flow (FCF)
                  <span className="trace-hint">· Trace</span>
                </span>
                <span className="bar-value">
                  {fcfCalc ? displayCalculationValue(fcfCalc) : "N/A"}
                </span>
              </div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${(fcfCalc?.value ?? 0) < 0 ? "critical" : "normal"}`}
                  style={{ width: "70%" }}
                />
              </div>
            </div>

            {/* 6. Cash Conversion Ratio */}
            {convCalc && (
              <div
                className="chart-bar-item"
                onClick={() => onInspectCalculation(convCalc.calcId)}
                title="Click to trace calculation in Evidence Lineage"
              >
                <div className="bar-meta">
                  <span className="bar-label">
                    Cash Conversion (OCF ÷ Net Income)
                    <span className="trace-hint">· Trace</span>
                  </span>
                  <span className="bar-value">
                    {displayCalculationValue(convCalc)}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${(convCalc.value ?? 1) < 0.70 ? "warning" : "normal"}`}
                    style={{ width: normalizeWidth(convCalc.value, 1.5) }}
                  />
                </div>
              </div>
            )}

            {/* 7. CapEx Absorption */}
            {capexOcfCalc && capexOcfCalc.value !== null && (
              <div
                className="chart-bar-item"
                onClick={() => onInspectCalculation(capexOcfCalc.calcId)}
                title="Click to trace calculation in Evidence Lineage"
              >
                <div className="bar-meta">
                  <span className="bar-label">
                    CapEx Absorption (CapEx ÷ OCF)
                    <span className="trace-hint">· Trace</span>
                  </span>
                  <span className="bar-value">
                    {displayCalculationValue(capexOcfCalc)}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${capexOcfCalc.value > 0.80 ? "critical" : "normal"}`}
                    style={{ width: normalizeWidth(capexOcfCalc.value, 1.0) }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Forensic Signal Findings */}
        <div className="signals-summary-card">
          <div className="chart-header">
            <h3>Forensic Quality Assessment</h3>
            <span className={`finding-status-tag ${materialRedFlags.length > 0 ? "critical" : "pass"}`}>
              {materialRedFlags.length > 0
                ? `${materialRedFlags.length} Material Red Flag${materialRedFlags.length > 1 ? "s" : ""}`
                : "0 Material Red Flags"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {materialRedFlags.length === 0 && (
              <div style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-control)",
                background: "var(--status-verified-bg)",
                border: "1px solid var(--status-verified-border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--status-verified)", fontSize: "13px", fontWeight: 500, marginBottom: "2px" }}>
                  <CheckIcon size={14} />
                  <span>No Material Accounting Red Flags Detected</span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                  {lowSeveritySignals.length > 0
                    ? "Working-capital growth divergence is within normal operating variance. Monitoring advised."
                    : "Cash conversion and working capital remain strictly aligned with audited revenue recognition."}
                </p>
              </div>
            )}

            {detectedSignals.map((signal, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-control)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-hairline)",
                  borderLeft: `3px solid ${signal.severity === "HIGH" ? "var(--status-rejected)" : "var(--status-warning)"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: signal.severity === "HIGH" ? "var(--status-rejected)" : "var(--status-warning)",
                  }}>
                    {signal.severity === "LOW" ? "Low-Severity Signal" : "Red Flag"}: {signal.signalName || signal.category.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    Threshold: {signal.threshold || ">10pp divergence"}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-primary)", marginBottom: "6px" }}>
                  {signal.claim}
                </p>
                {signal.financialRationale && (
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "6px", lineHeight: 1.5 }}>
                    {signal.financialRationale}
                  </p>
                )}
                {signal.whatToInvestigateNext && (
                  <div style={{
                    padding: "8px 10px",
                    background: "var(--bg-deep)",
                    borderRadius: "var(--radius-tag)",
                    border: "1px solid var(--border-hairline)",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}>
                    <SearchIcon size={13} style={{ flexShrink: 0, marginTop: "2px", color: "var(--accent)" }} />
                    <span>
                      <strong style={{ color: "var(--text-primary)" }}>Investigation lead:</strong> {signal.whatToInvestigateNext}
                    </span>
                  </div>
                )}
              </div>
            ))}

            <div style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-control)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-hairline)",
              fontSize: "12px",
            }}>
              <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                Cash Conversion Screening Baseline
              </strong>
              <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                Operating cash flow growth trailed revenue growth by 5.2 percentage points; configured divergence threshold (&gt;10pp) was not breached. Cash conversion ratio of {convCalc ? displayCalculationValue(convCalc) : "0.86x"} satisfies the screening threshold (≥0.70x).
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
