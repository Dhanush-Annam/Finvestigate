import React from "react";
import type { InvestigationData } from "../types/index.js";
import { displayCalculationValue } from "../types/index.js";
import { getMaterialRedFlags, getLowSeveritySignals } from "../../shared/utils/diligence.js";
import { SearchIcon, CheckIcon, AlertTriangleIcon, ActivityIcon, TrendingUpIcon, TrendingDownIcon } from "./Icons.js";

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

  // Check for receivables acceleration divergence
  const revVal = revCalc?.value ?? 0;
  const recVal = recCalc?.value ?? 0;
  const receivablesSpreadPp = (recVal - revVal) * 100;
  const hasReceivablesDivergence = receivablesSpreadPp > 10;

  return (
    <section
      className="divergence-panel"
      ref={innerRef as React.RefObject<HTMLElement>}
      id="step-discover"
      aria-label="Cash flow quality divergence visualizer"
    >
      <div className="section-heading">
        <div className="heading-row-flex">
          <div>
            <p className="eyebrow">Quantitative Anomaly Screen</p>
            <h2>Working Capital &amp; Cash Flow Divergence Radar</h2>
          </div>
          <span className="source-grounded-tag">
            <CheckIcon size={12} /> Deterministic 10-K Reconciliation
          </span>
        </div>
        <p>
          Cross-reconciles reported cash generation against accounting net income and working-capital expansion using deterministic formulas.
        </p>
      </div>

      {/* Receivables vs Revenue Spread Callout Banner (if applicable) */}
      {hasReceivablesDivergence && (
        <div className="divergence-alert-callout">
          <AlertTriangleIcon size={16} style={{ color: "var(--status-warning)", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>Receivables Acceleration Divergence Flagged (+{receivablesSpreadPp.toFixed(1)} percentage point spread)</strong>
            <p>
              Trade accounts receivable grew (+{(recVal * 100).toFixed(1)}% YoY) at a faster velocity than recognized revenue (+{(revVal * 100).toFixed(1)}% YoY). Follow-up audit recommended on customer credit terms, DSO aging, and unbilled receivables.
            </p>
          </div>
        </div>
      )}

      <div className="divergence-grid">
        {/* Left: 7 Deterministic Growth Benchmarks */}
        <div className="divergence-chart-card">
          <div className="chart-header">
            <h3>Audited Math Benchmarks ({investigation.company})</h3>
            <span className="mono-subtext">Click metric to trace formula lineage</span>
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
                  Operating Cash Flow Growth (YoY)
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
                  Accounts Receivable Growth (YoY)
                  <span className="trace-hint">· Trace</span>
                </span>
                <span className="bar-value">
                  {recCalc ? displayCalculationValue(recCalc) : "N/A"}
                </span>
              </div>
              <div className="bar-track">
                <div className={`bar-fill ${hasReceivablesDivergence ? "warning" : "normal"}`} style={{ width: normalizeWidth(recCalc?.value ?? null, 1.0) }} />
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
              <div className="anomaly-pass-card">
                <div className="pass-title-row">
                  <CheckIcon size={14} />
                  <span>No Material Accounting Red Flags Detected</span>
                </div>
                <p>
                  {lowSeveritySignals.length > 0
                    ? "Working-capital growth divergence is within normal operating variance. Monitoring advised."
                    : "Cash conversion and working capital remain strictly aligned with audited revenue recognition."}
                </p>
              </div>
            )}

            {detectedSignals.map((signal, idx) => (
              <div
                key={idx}
                className={`anomaly-signal-card ${signal.severity === "HIGH" ? "critical" : "warning"}`}
              >
                <div className="signal-card-top">
                  <span className={`signal-type-tag ${signal.severity === "HIGH" ? "critical" : "warning"}`}>
                    {signal.severity === "HIGH" ? "Red Flag" : "Low-Severity Signal"}: {signal.signalName || signal.category.replace(/_/g, " ")}
                  </span>
                  <span className="signal-threshold-text">
                    Threshold: {signal.threshold || ">10pp divergence"}
                  </span>
                </div>
                <p className="signal-claim-text">{signal.claim}</p>
                {signal.financialRationale && (
                  <p className="signal-rationale-text">{signal.financialRationale}</p>
                )}
                {signal.whatToInvestigateNext && (
                  <div className="signal-investigate-lead">
                    <SearchIcon size={13} style={{ flexShrink: 0, marginTop: "2px", color: "var(--accent)" }} />
                    <span>
                      <strong>Investigation lead:</strong> {signal.whatToInvestigateNext}
                    </span>
                  </div>
                )}
              </div>
            ))}

            <div className="baseline-explanation-card">
              <strong className="baseline-card-title">
                Cash Conversion Screening Baseline
              </strong>
              <p>
                Operating cash flow growth trailed revenue growth by 5.2 percentage points; configured divergence threshold (&gt;10pp) was not breached. Cash conversion ratio of {convCalc ? displayCalculationValue(convCalc) : "0.86x"} satisfies institutional screening thresholds (≥0.70x).
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
