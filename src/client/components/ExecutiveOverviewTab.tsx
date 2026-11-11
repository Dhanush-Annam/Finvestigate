import React, { useState } from "react";
import type { InvestigationData } from "../types/index.js";
import { getDiligenceVerdict } from "../../shared/utils/diligence.js";
import {
  ShieldIcon,
  AlertTriangleIcon,
  CheckIcon,
  ActivityIcon,
  FileTextIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  SearchIcon,
  ScaleIcon,
} from "./Icons.js";

interface ExecutiveOverviewTabProps {
  investigation: InvestigationData;
  activeStats?: any;
  scoreboardScope?: "company" | "all";
  onScopeChange?: (scope: "company" | "all") => void;
  onInspectCalculation?: (calcId: string | null) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const ExecutiveOverviewTab: React.FC<ExecutiveOverviewTabProps> = ({
  investigation,
  onInspectCalculation,
  onNavigateToTab,
}) => {
  const { company, displayName, cik, facts, calculations, findings, forensics } = investigation;
  const verdictInfo = getDiligenceVerdict(findings, company);

  const isIndian =
    company === "RELIANCE" ||
    company === "TCS" ||
    company === "TATAMOTORS" ||
    company === "INFY" ||
    company === "HDFCBANK" ||
    company === "ICICIBANK" ||
    company === "ITC" ||
    company === "LT" ||
    company === "WIPRO" ||
    company === "BHARTIARTL" ||
    company === "SBIN";
  const currencySymbol = isIndian ? "₹" : "$";

  // Financial Fact Extractor Helper
  const getFactVal = (metric: string, periodLabel: string): number | null => {
    const f = facts.find((fact) => fact.metric === metric && fact.period.label === periodLabel && fact.value !== null);
    return f && f.value !== null ? f.value : null;
  };

  const periods = [...new Map(facts.map((f) => [f.period.label, f.period])).values()].sort((a, b) =>
    b.endDate.localeCompare(a.endDate)
  );

  const currP = periods[0]?.label || "FY2025";
  const priorP = periods[1]?.label || "FY2024";

  const formatMoney = (val: number | null): string => {
    if (val === null) return "N/A";
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    if (isIndian) {
      const cr = abs / 10_000_000;
      return `${sign}₹${cr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
    }
    const b = abs / 1_000_000_000;
    return `${sign}$${b.toFixed(2)}B`;
  };

  const getCalc = (metric: string) => calculations.find((c) => c.metric === metric);

  const revGrowth = getCalc("revenue_growth_yoy");
  const niGrowth = getCalc("netIncome_growth_yoy");
  const ocfGrowth = getCalc("operatingCashFlow_growth_yoy");
  const fcf = getCalc("free_cash_flow");
  const cashConv = getCalc("cash_conversion_ratio");
  const recGrowth = getCalc("receivables_growth_yoy");

  const revCurr = getFactVal("revenue", currP);
  const revPrior = getFactVal("revenue", priorP);
  const niCurr = getFactVal("netIncome", currP);
  const niPrior = getFactVal("netIncome", priorP);
  const ocfCurr = getFactVal("operatingCashFlow", currP);
  const ocfPrior = getFactVal("operatingCashFlow", priorP);
  const fcfVal = fcf?.value ?? null;

  // Max value for charting scales
  const maxBarVal = Math.max(
    Math.abs(revCurr ?? 0),
    Math.abs(revPrior ?? 0),
    Math.abs(niCurr ?? 0),
    Math.abs(ocfCurr ?? 0),
    1
  );

  const getBarHeightPct = (val: number | null): number => {
    if (val === null || maxBarVal === 0) return 4;
    return Math.max(6, Math.min(100, Math.round((Math.abs(val) / maxBarVal) * 100)));
  };

  // Altman Z calculation gauge values
  const altmanScore = forensics?.altman?.score ?? null;
  const altmanClass = forensics?.altman?.classification ?? "NEUTRAL";
  // Clamp Altman gauge pointer: 0 to 6 range (0% to 100%)
  const altmanGaugePct =
    altmanScore !== null ? Math.min(100, Math.max(5, (altmanScore / 6) * 100)) : 50;

  // Beneish M-Score gauge values: normal is <-1.78, flag is >-1.78
  // Range: -4.0 (safest, 0%) to 0.0 (high risk, 100%), threshold -1.78 at ~55%
  const beneishScore = forensics?.beneish?.score ?? null;
  const beneishGaugePct =
    beneishScore !== null
      ? Math.min(100, Math.max(5, ((beneishScore - -4.0) / 4.0) * 100))
      : 30;

  // Piotroski score: 0 to 9
  const piotroskiScore = forensics?.piotroski?.score ?? null;

  // Sloan Accrual: -25% to +25%
  const sloanRatio = forensics?.sloan?.ratio ?? null;
  const sloanPct = sloanRatio !== null ? sloanRatio * 100 : null;
  // Center is 50% (0.00), -20% is 10%, +20% is 90%
  const sloanGaugePct =
    sloanPct !== null ? Math.min(95, Math.max(5, 50 + (sloanPct / 25) * 40)) : 50;

  return (
    <div className="tab-pane executive-overview-tab">
      {/* 1. Executive Banner & Diligence Verdict */}
      <section className="executive-banner-card">
        <div className="executive-banner-header">
          <div>
            <div className="company-badge-row">
              <span className="exchange-pill">{isIndian ? "BSE / Ind AS Statutory" : "SEC EDGAR / US-GAAP"}</span>
              <span className="cik-pill">Identifier: {cik}</span>
              <span className={`verdict-pill ${verdictInfo.verdict.toLowerCase().replace(/_/g, "-")}`}>
                {verdictInfo.verdict === "CLEAR" ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                {verdictInfo.heading}
              </span>
            </div>
            <h2 className="company-title">
              {displayName} ({company})
            </h2>
            <p className="executive-narrative">{verdictInfo.narrative}</p>
          </div>

          <div className="quick-action-strip">
            <button
              type="button"
              className="action-pill-button"
              onClick={() => onNavigateToTab?.("radar")}
              title="Inspect accounting anomaly models & divergence radar"
            >
              <ActivityIcon size={14} />
              <span>Anomaly Radar ({findings.length})</span>
            </button>
            <button
              type="button"
              className="action-pill-button"
              onClick={() => onNavigateToTab?.("debate")}
              title="Inspect dialectic bull vs bear arguments"
            >
              <ScaleIcon size={14} />
              <span>Courtroom Debate</span>
            </button>
            <button
              type="button"
              className="action-pill-button secondary"
              onClick={() => onNavigateToTab?.("lineage")}
              title="Inspect calculation provenance & formulas"
            >
              <FileTextIcon size={14} />
              <span>Filing Lineage</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Interactive Multi-Year Financial Performance & Cash Conversion Visualizer */}
      <section className="institutional-visual-card">
        <div className="visual-card-header">
          <div>
            <span className="visual-eyebrow">Financial Trajectory &amp; Cash Quality</span>
            <h3>Audited Performance &amp; Cash Generation Trajectory</h3>
          </div>
          <div className="visual-legend">
            <span className="legend-item"><span className="legend-dot prior" /> {priorP}</span>
            <span className="legend-item"><span className="legend-dot current" /> {currP} (Audited)</span>
          </div>
        </div>

        <div className="financial-visual-grid">
          {/* Multi-Bar Trajectory Chart */}
          <div className="visual-chart-pane">
            <div className="chart-bars-container">
              {/* Revenue Cluster */}
              <div className="metric-bar-group">
                <div className="bars-pair">
                  <div className="bar-wrapper" title={`${priorP} Revenue: ${formatMoney(revPrior)}`}>
                    <div
                      className="metric-bar prior"
                      style={{ height: `${getBarHeightPct(revPrior)}%` }}
                    />
                    <span className="bar-val-label">{formatMoney(revPrior)}</span>
                  </div>
                  <div className="bar-wrapper" title={`${currP} Revenue: ${formatMoney(revCurr)}`}>
                    <div
                      className="metric-bar current"
                      style={{ height: `${getBarHeightPct(revCurr)}%` }}
                    />
                    <span className="bar-val-label">{formatMoney(revCurr)}</span>
                  </div>
                </div>
                <div className="group-label">
                  <strong>Revenue</strong>
                  <span className="delta-badge positive">
                    {revGrowth?.value !== null && revGrowth?.value !== undefined
                      ? `+${(revGrowth.value * 100).toFixed(1)}%`
                      : "YoY"}
                  </span>
                </div>
              </div>

              {/* Net Income Cluster */}
              <div className="metric-bar-group">
                <div className="bars-pair">
                  <div className="bar-wrapper" title={`${priorP} Net Income: ${formatMoney(niPrior)}`}>
                    <div
                      className="metric-bar prior"
                      style={{ height: `${getBarHeightPct(niPrior)}%` }}
                    />
                    <span className="bar-val-label">{formatMoney(niPrior)}</span>
                  </div>
                  <div className="bar-wrapper" title={`${currP} Net Income: ${formatMoney(niCurr)}`}>
                    <div
                      className="metric-bar current"
                      style={{ height: `${getBarHeightPct(niCurr)}%` }}
                    />
                    <span className="bar-val-label">{formatMoney(niCurr)}</span>
                  </div>
                </div>
                <div className="group-label">
                  <strong>Net Income</strong>
                  <span className={`delta-badge ${(niGrowth?.value ?? 0) >= 0 ? "positive" : "negative"}`}>
                    {niGrowth?.value !== null && niGrowth?.value !== undefined
                      ? `${(niGrowth.value * 100).toFixed(1)}%`
                      : "YoY"}
                  </span>
                </div>
              </div>

              {/* Operating Cash Flow Cluster */}
              <div className="metric-bar-group">
                <div className="bars-pair">
                  <div className="bar-wrapper" title={`${priorP} Operating Cash Flow: ${formatMoney(ocfPrior)}`}>
                    <div
                      className="metric-bar prior"
                      style={{ height: `${getBarHeightPct(ocfPrior)}%` }}
                    />
                    <span className="bar-val-label">{formatMoney(ocfPrior)}</span>
                  </div>
                  <div className="bar-wrapper" title={`${currP} Operating Cash Flow: ${formatMoney(ocfCurr)}`}>
                    <div
                      className="metric-bar current cash-flow"
                      style={{ height: `${getBarHeightPct(ocfCurr)}%` }}
                    />
                    <span className="bar-val-label">{formatMoney(ocfCurr)}</span>
                  </div>
                </div>
                <div className="group-label">
                  <strong>Operating Cash Flow</strong>
                  <span className={`delta-badge ${(ocfGrowth?.value ?? 0) >= 0 ? "positive" : "negative"}`}>
                    {ocfGrowth?.value !== null && ocfGrowth?.value !== undefined
                      ? `${(ocfGrowth.value * 100).toFixed(1)}%`
                      : "YoY"}
                  </span>
                </div>
              </div>

              {/* Free Cash Flow Cluster */}
              <div className="metric-bar-group">
                <div className="bars-pair single">
                  <div className="bar-wrapper" title={`${currP} Free Cash Flow: ${formatMoney(fcfVal)}`}>
                    <div
                      className={`metric-bar current ${fcfVal && fcfVal > 0 ? "fcf-positive" : "fcf-deficit"}`}
                      style={{ height: `${getBarHeightPct(fcfVal)}%` }}
                    />
                    <span className="bar-val-label">{formatMoney(fcfVal)}</span>
                  </div>
                </div>
                <div className="group-label">
                  <strong>Free Cash Flow</strong>
                  <span className="delta-badge neutral">
                    {fcfVal && fcfVal > 0 ? "Cash Accretive" : "Deficit"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Cash Quality & Conversion Scorecard */}
          <div className="cash-quality-card">
            <div className="quality-header">
              <span className="quality-title">Earnings Cash Conversion Diagnostic</span>
              <span className={`quality-badge ${(cashConv?.value ?? 0) >= 0.7 ? "verified" : "warning"}`}>
                {cashConv?.value !== null && cashConv?.value !== undefined
                  ? `${(cashConv.value * 100).toFixed(1)}% Conversion`
                  : "N/A"}
              </span>
            </div>

            <p className="quality-desc">
              Measures what percentage of reported accounting net income was realized as hard operational cash receipts (OCF ÷ Net Income).
            </p>

            <div className="conversion-progress-track">
              <div
                className="conversion-progress-fill"
                style={{
                  width: `${Math.min(100, Math.max(5, (cashConv?.value ?? 0) * 100))}%`,
                  backgroundColor:
                    (cashConv?.value ?? 0) >= 1.0
                      ? "var(--status-verified)"
                      : (cashConv?.value ?? 0) >= 0.7
                      ? "var(--accent)"
                      : "var(--status-rejected)",
                }}
              />
              <div className="conversion-threshold-line" title="Threshold: 70% minimum cash backing" />
            </div>

            <div className="quality-metrics-mini-grid">
              <div className="quality-stat-tile">
                <span className="stat-sub">Reported Net Income</span>
                <span className="stat-val">{formatMoney(niCurr)}</span>
              </div>
              <div className="quality-stat-tile">
                <span className="stat-sub">Actual Cash Collected</span>
                <span className="stat-val text-verified">{formatMoney(ocfCurr)}</span>
              </div>
              <div className="quality-stat-tile">
                <span className="stat-sub">Cash Surplus / Gap</span>
                <span
                  className={`stat-val ${(ocfCurr ?? 0) >= (niCurr ?? 0) ? "text-verified" : "text-warning"}`}
                >
                  {formatMoney((ocfCurr ?? 0) - (niCurr ?? 0))}
                </span>
              </div>
              <div className="quality-stat-tile">
                <span className="stat-sub">Receivables Growth</span>
                <span className="stat-val">
                  {recGrowth?.value !== null && recGrowth?.value !== undefined
                    ? `${(recGrowth.value * 100).toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
            </div>

            <div className="quality-footer-note">
              {(cashConv?.value ?? 0) >= 1.0 ? (
                <span>
                  <CheckIcon size={13} style={{ color: "var(--status-verified)" }} /> Operating cash collection exceeds reported net profit. Zero non-cash accrual inflation.
                </span>
              ) : (cashConv?.value ?? 0) >= 0.7 ? (
                <span>
                  <CheckIcon size={13} style={{ color: "var(--accent)" }} /> Satisfies institutional 70% threshold. Cash collections align with operational delivery.
                </span>
              ) : (
                <span>
                  <AlertTriangleIcon size={13} style={{ color: "var(--status-rejected)" }} /> Operating cash flow trails reported profit significantly. Working capital expansion requires monitoring.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Four Quantitative Institutional Forensic Pillars with Interactive Visual Gauges */}
      <section className="pillar-cards-grid">
        {/* Altman Z-Score Card */}
        <div className={`pillar-card ${altmanClass.toLowerCase().replace(/_/g, "-")}`}>
          <div className="pillar-header">
            <span className="pillar-title">Altman Z-Score</span>
            <span className={`pillar-badge ${altmanClass.toLowerCase().replace(/_/g, "-")}`}>
              {altmanClass.replace(/_/g, " ")}
            </span>
          </div>

          <div className="pillar-value-row">
            <span className="pillar-score">
              {altmanScore !== null ? altmanScore.toFixed(2) : "N/A"}
            </span>
            <span className="pillar-threshold">Safe: &gt; 2.99 | Distress: &lt; 1.81</span>
          </div>

          {/* Visual Z-Score Tripartite Range Gauge */}
          <div className="gauge-meter-wrapper" title={`Altman Z-Score: ${altmanScore?.toFixed(2)}`}>
            <div className="gauge-track tripartite">
              <div className="gauge-zone distress" title="Distress Zone (<1.81)" />
              <div className="gauge-zone grey" title="Grey Zone (1.81-2.99)" />
              <div className="gauge-zone safe" title="Safe Zone (>2.99)" />
              <div
                className="gauge-pointer"
                style={{ left: `${altmanGaugePct}%` }}
                title={`Current Score: ${altmanScore?.toFixed(2)}`}
              />
            </div>
            <div className="gauge-labels">
              <span>0.0</span>
              <span style={{ left: "30%" }}>1.81</span>
              <span style={{ left: "50%" }}>2.99</span>
              <span>6.0+</span>
            </div>
          </div>

          <p className="pillar-summary">
            {forensics?.altman?.summary || "Assesses credit solvency and probabilistic financial distress risk."}
          </p>
          <div className="pillar-footer">
            <button type="button" className="text-link-btn" onClick={() => onNavigateToTab?.("radar")}>
              Inspect 5-factor breakdown →
            </button>
          </div>
        </div>

        {/* Beneish M-Score Card */}
        <div className={`pillar-card ${forensics?.beneish?.interpretation?.toLowerCase().replace(/_/g, "-") || "neutral"}`}>
          <div className="pillar-header">
            <span className="pillar-title">Beneish M-Score</span>
            <span className={`pillar-badge ${forensics?.beneish?.interpretation?.toLowerCase().replace(/_/g, "-") || "neutral"}`}>
              {forensics?.beneish?.interpretation === "HIGH_MANIPULATION_RISK" ? "ELEVATED RISK" : "LOW RISK"}
            </span>
          </div>

          <div className="pillar-value-row">
            <span className="pillar-score">
              {beneishScore !== null ? beneishScore.toFixed(2) : "N/A"}
            </span>
            <span className="pillar-threshold">Flag Cutoff: &gt; -1.78</span>
          </div>

          {/* Visual Beneish Risk Scale Gauge */}
          <div className="gauge-meter-wrapper" title={`Beneish M-Score: ${beneishScore?.toFixed(2)}`}>
            <div className="gauge-track bipart">
              <div className="gauge-zone safe" title="Low Risk (< -1.78)" />
              <div className="gauge-zone flag" title="Manipulation Risk (> -1.78)" />
              <div
                className="gauge-pointer"
                style={{ left: `${beneishGaugePct}%` }}
                title={`Current Score: ${beneishScore?.toFixed(2)}`}
              />
            </div>
            <div className="gauge-labels">
              <span>-4.0 (Safe)</span>
              <span style={{ left: "55%" }}>-1.78 (Flag)</span>
              <span>0.0 (High Risk)</span>
            </div>
          </div>

          <p className="pillar-summary">
            {forensics?.beneish?.summary || "Detects mathematical anomalies in earnings accruals and receivables."}
          </p>
          <div className="pillar-footer">
            <button type="button" className="text-link-btn" onClick={() => onNavigateToTab?.("radar")}>
              Inspect 8-variable model →
            </button>
          </div>
        </div>

        {/* Piotroski F-Score Card */}
        <div className={`pillar-card ${forensics?.piotroski?.classification?.toLowerCase() || "neutral"}`}>
          <div className="pillar-header">
            <span className="pillar-title">Piotroski F-Score</span>
            <span className={`pillar-badge ${forensics?.piotroski?.classification?.toLowerCase() || "neutral"}`}>
              {forensics?.piotroski?.classification || "COMPUTING"}
            </span>
          </div>

          <div className="pillar-value-row">
            <span className="pillar-score">
              {piotroskiScore !== null ? `${piotroskiScore}/9` : "N/A"}
            </span>
            <span className="pillar-threshold">Strong: 8-9 | Weak: &le; 4</span>
          </div>

          {/* Visual 9-Segment Scorebar */}
          <div className="piotroski-segments-row" title={`Piotroski Score: ${piotroskiScore}/9`}>
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className={`piotroski-seg ${piotroskiScore !== null && idx < piotroskiScore ? "filled" : "empty"}`}
                title={`Signal ${idx + 1}`}
              />
            ))}
          </div>

          <p className="pillar-summary">
            {forensics?.piotroski?.summary || "Tests 9 binary accounting health metrics across profitability and leverage."}
          </p>
          <div className="pillar-footer">
            <button type="button" className="text-link-btn" onClick={() => onNavigateToTab?.("radar")}>
              View 9-point checklist →
            </button>
          </div>
        </div>

        {/* Sloan Accruals Card */}
        <div className={`pillar-card ${forensics?.sloan?.interpretation?.toLowerCase().replace(/_/g, "-") || "neutral"}`}>
          <div className="pillar-header">
            <span className="pillar-title">Sloan Accrual Ratio</span>
            <span className={`pillar-badge ${forensics?.sloan?.interpretation?.toLowerCase().replace(/_/g, "-") || "neutral"}`}>
              {forensics?.sloan?.interpretation?.replace(/_/g, " ") || "COMPUTING"}
            </span>
          </div>

          <div className="pillar-value-row">
            <span className="pillar-score">
              {sloanRatio !== null ? `${(sloanRatio * 100).toFixed(1)}%` : "N/A"}
            </span>
            <span className="pillar-threshold">Balanced: |Ratio| &le; 10%</span>
          </div>

          {/* Visual Accruals Balance Gauge */}
          <div className="gauge-meter-wrapper" title={`Sloan Accrual: ${(sloanRatio ? sloanRatio * 100 : 0).toFixed(1)}%`}>
            <div className="gauge-track accrual-track">
              <div className="gauge-zone safe-band" style={{ left: "20%", width: "60%" }} title="Safe Accrual Band (-10% to +10%)" />
              <div
                className="gauge-pointer"
                style={{ left: `${sloanGaugePct}%` }}
                title={`Accrual: ${(sloanRatio ? sloanRatio * 100 : 0).toFixed(1)}%`}
              />
            </div>
            <div className="gauge-labels">
              <span>-25% (Cash Heavy)</span>
              <span style={{ left: "50%" }}>0%</span>
              <span>+25% (Accruals)</span>
            </div>
          </div>

          <p className="pillar-summary">
            {forensics?.sloan?.summary || "Compares reported net income against actual operational cash collections."}
          </p>
          <div className="pillar-footer">
            <button type="button" className="text-link-btn" onClick={() => onNavigateToTab?.("radar")}>
              Inspect cash accruals →
            </button>
          </div>
        </div>
      </section>

      {/* 4. Audited Financial Statement Fundamentals Table */}
      <section className="terminal-table-card">
        <div className="table-card-header">
          <div>
            <h3>Audited Financial Statement Fundamentals</h3>
            <span className="statement-subtext">Figures extracted deterministically from primary regulatory disclosures ({currP} vs {priorP})</span>
          </div>
          <div className="table-actions">
            <span className="badge-grounded">
              <CheckIcon size={12} /> 100% SEC/BSE Disclosures
            </span>
          </div>
        </div>

        <div className="terminal-table-wrapper">
          <table className="terminal-financial-table">
            <thead>
              <tr>
                <th>Financial Metric</th>
                <th>{currP} Audited</th>
                <th>{priorP} Audited</th>
                <th>YoY Trajectory / Ratio</th>
                <th>Forensic Audit Note</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Revenue from Operations</strong></td>
                <td className="mono-num">{formatMoney(getFactVal("revenue", currP))}</td>
                <td className="mono-num">{formatMoney(getFactVal("revenue", priorP))}</td>
                <td className="metric-delta">
                  {revGrowth?.value !== null && revGrowth?.value !== undefined
                    ? `${(revGrowth.value * 100).toFixed(1)}% YoY`
                    : revGrowth?.formula || "N/A"}
                </td>
                <td className="note-cell">Reported gross revenue from customer contracts</td>
              </tr>
              <tr>
                <td><strong>Net Income (Profit for Period)</strong></td>
                <td className="mono-num">{formatMoney(getFactVal("netIncome", currP))}</td>
                <td className="mono-num">{formatMoney(getFactVal("netIncome", priorP))}</td>
                <td className="metric-delta">
                  {niGrowth?.value !== null && niGrowth?.value !== undefined
                    ? `${(niGrowth.value * 100).toFixed(1)}% YoY`
                    : niGrowth?.formula || "N/A"}
                </td>
                <td className="note-cell">Attributable to equity shareholders</td>
              </tr>
              <tr>
                <td><strong>Cash Flow from Operations (OCF)</strong></td>
                <td className="mono-num">{formatMoney(getFactVal("operatingCashFlow", currP))}</td>
                <td className="mono-num">{formatMoney(getFactVal("operatingCashFlow", priorP))}</td>
                <td className="metric-delta">
                  {ocfGrowth?.value !== null && ocfGrowth?.value !== undefined
                    ? `${(ocfGrowth.value * 100).toFixed(1)}% YoY`
                    : ocfGrowth?.formula || "N/A"}
                </td>
                <td className="note-cell">Actual cash collected from core operational activities</td>
              </tr>
              <tr>
                <td><strong>Trade Accounts Receivable</strong></td>
                <td className="mono-num">{formatMoney(getFactVal("receivables", currP))}</td>
                <td className="mono-num">{formatMoney(getFactVal("receivables", priorP))}</td>
                <td className="metric-delta">
                  {recGrowth?.value !== null && recGrowth?.value !== undefined
                    ? `${(recGrowth.value * 100).toFixed(1)}% YoY`
                    : "N/A"}
                </td>
                <td className="note-cell">Uncollected customer invoices on balance sheet</td>
              </tr>
              <tr>
                <td><strong>Capital Expenditures (CapEx)</strong></td>
                <td className="mono-num">{formatMoney(getFactVal("capex", currP))}</td>
                <td className="mono-num">{formatMoney(getFactVal("capex", priorP))}</td>
                <td className="metric-delta">
                  {getCalc("capex_to_ocf_ratio")?.value !== null && getCalc("capex_to_ocf_ratio")?.value !== undefined
                    ? `${(getCalc("capex_to_ocf_ratio")!.value! * 100).toFixed(1)}% of OCF`
                    : "N/A"}
                </td>
                <td className="note-cell">Property, plant, equipment &amp; productive asset investment</td>
              </tr>
              <tr className="highlight-row">
                <td><strong>Free Cash Flow (OCF − CapEx)</strong></td>
                <td className="mono-num">{fcf?.value !== null && fcf?.value !== undefined ? formatMoney(fcf.value) : "N/A"}</td>
                <td className="mono-num">—</td>
                <td className="metric-delta">
                  {fcf?.value !== null && fcf?.value !== undefined && fcf.value > 0
                    ? "Positive Cash Gen"
                    : "Cash Deficit"}
                </td>
                <td className="note-cell">Discretionary capital available for debt service or growth</td>
              </tr>
              <tr className="highlight-row">
                <td><strong>Cash Conversion (OCF ÷ Net Income)</strong></td>
                <td className="mono-num">{cashConv?.value !== null && cashConv?.value !== undefined ? `${(cashConv.value * 100).toFixed(1)}%` : "N/A"}</td>
                <td className="mono-num">—</td>
                <td className="metric-delta">
                  {cashConv?.value !== null && cashConv?.value !== undefined && cashConv.value >= 1.0
                    ? "High Quality"
                    : "Accrual Gap"}
                </td>
                <td className="note-cell">Proportion of reported accounting profit materialized as cash</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Executive Takeaway & Diligence Next Steps */}
      <section className="executive-takeaway-card">
        <div className="takeaway-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SearchIcon size={16} style={{ color: "var(--accent)" }} />
            <h4>Executive Diligence Takeaways &amp; Next Investigation Leads</h4>
          </div>
          <span className="findings-count-badge">
            {findings.length} Anomaly Signal{findings.length === 1 ? "" : "s"} Detected
          </span>
        </div>

        <div className="takeaway-grid">
          <div className="takeaway-column">
            <span className="takeaway-label">Core Forensic Verdict</span>
            <p className="takeaway-text">
              {verdictInfo.narrative}
            </p>
          </div>
          <div className="takeaway-column">
            <span className="takeaway-label">Audit Recommendation</span>
            <p className="takeaway-text">
              {findings.length > 0
                ? findings[0]?.whatToInvestigateNext || "Examine customer credit terms and DSO aging in 10-K notes."
                : "No material anomalies detected. Operating cash collection and revenue trajectory remain strictly aligned with primary audited disclosures."}
            </p>
          </div>
          <div className="takeaway-column actions">
            <span className="takeaway-label">Investigation Workspaces</span>
            <div className="takeaway-actions-row">
              <button
                type="button"
                className="takeaway-btn"
                onClick={() => onNavigateToTab?.("radar")}
              >
                Open Forensic Radar →
              </button>
              <button
                type="button"
                className="takeaway-btn secondary"
                onClick={() => onNavigateToTab?.("debate")}
              >
                Review Bull / Bear Case →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
