import React from "react";
import type { InvestigationData, VerificationScoreboardData } from "../types/index.js";
import { getDiligenceVerdict } from "../../shared/utils/diligence.js";
import { ShieldIcon, AlertTriangleIcon, CheckIcon, ActivityIcon, FileTextIcon } from "./Icons.js";
import { TrustScoreboard } from "./TrustScoreboard.js";

interface ExecutiveOverviewTabProps {
  investigation: InvestigationData;
  activeStats: VerificationScoreboardData | null;
  scoreboardScope: "company" | "all";
  onScopeChange: (scope: "company" | "all") => void;
  onInspectCalculation?: (calcId: string | null) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const ExecutiveOverviewTab: React.FC<ExecutiveOverviewTabProps> = ({
  investigation,
  activeStats,
  scoreboardScope,
  onScopeChange,
  onInspectCalculation,
  onNavigateToTab,
}) => {
  const { company, displayName, cik, facts, calculations, findings, forensics } = investigation;
  const verdictInfo = getDiligenceVerdict(findings, company);

  const isIndian = company === "RELIANCE" || company === "TCS" || company === "TATAMOTORS" || company === "INFY" || company === "HDFCBANK" || company === "ICICIBANK" || company === "ITC" || company === "LT" || company === "WIPRO" || company === "BHARTIARTL" || company === "SBIN";
  const currencySymbol = isIndian ? "₹" : "$";

  // Financial Fact Extractor Helper
  const getFactVal = (metric: string, periodLabel: string): number | null => {
    const f = facts.find((fact) => fact.metric === metric && fact.period.label === periodLabel && fact.value !== null);
    return f && f.value !== null ? f.value : null;
  };

  const periods = [...new Map(facts.map((f) => [f.period.label, f.period])).values()]
    .sort((a, b) => b.endDate.localeCompare(a.endDate));

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

  return (
    <div className="tab-pane executive-overview-tab">
      {/* 1. Executive Summary & Verdict Header */}
      <section className="executive-banner-card">
        <div className="executive-banner-header">
          <div>
            <div className="company-badge-row">
              <span className="exchange-pill">{isIndian ? "BSE / Ind AS" : "SEC EDGAR / US-GAAP"}</span>
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
            >
              <ActivityIcon size={14} />
              <span>Inspect Anomaly Radar ({findings.length})</span>
            </button>
            <button
              type="button"
              className="action-pill-button"
              onClick={() => onNavigateToTab?.("debate")}
            >
              <FileTextIcon size={14} />
              <span>Courtroom Debate</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Four Quantitative Institutional Forensic Pillars */}
      <section className="pillar-cards-grid">
        {/* Altman Z-Score Card */}
        <div className={`pillar-card ${forensics?.altman?.classification?.toLowerCase().replace(/_/g, "-") || "neutral"}`}>
          <div className="pillar-header">
            <span className="pillar-title">Altman Z-Score</span>
            <span className={`pillar-badge ${forensics?.altman?.classification?.toLowerCase().replace(/_/g, "-") || "neutral"}`}>
              {forensics?.altman?.classification?.replace(/_/g, " ") || "COMPUTING"}
            </span>
          </div>
          <div className="pillar-value-row">
            <span className="pillar-score">{forensics?.altman?.score !== null && forensics?.altman?.score !== undefined ? forensics.altman.score.toFixed(2) : "N/A"}</span>
            <span className="pillar-threshold">Safe: &gt; 2.99 | Distress: &lt; 1.81</span>
          </div>
          <p className="pillar-summary">{forensics?.altman?.summary || "Assesses credit solvency and probabilistic financial distress risk."}</p>
          <div className="pillar-footer">
            <button type="button" className="text-link-btn" onClick={() => onNavigateToTab?.("radar")}>
              View 5-component breakdown →
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
            <span className="pillar-score">{forensics?.beneish?.score !== null && forensics?.beneish?.score !== undefined ? forensics.beneish.score.toFixed(2) : "N/A"}</span>
            <span className="pillar-threshold">Flag: &gt; -1.78</span>
          </div>
          <p className="pillar-summary">{forensics?.beneish?.summary || "Detects mathematical anomalies in earnings accruals and receivables."}</p>
          <div className="pillar-footer">
            <button type="button" className="text-link-btn" onClick={() => onNavigateToTab?.("radar")}>
              View 8-variable model →
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
            <span className="pillar-score">{forensics?.piotroski?.score !== null && forensics?.piotroski?.score !== undefined ? `${forensics.piotroski.score}/9` : "N/A"}</span>
            <span className="pillar-threshold">Strong: 8-9 | Weak: &le; 4</span>
          </div>
          <p className="pillar-summary">{forensics?.piotroski?.summary || "Tests 9 binary accounting health metrics across profitability and leverage."}</p>
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
              {forensics?.sloan?.ratio !== null && forensics?.sloan?.ratio !== undefined
                ? `${(forensics.sloan.ratio * 100).toFixed(1)}%`
                : "N/A"}
            </span>
            <span className="pillar-threshold">Aggressive: &gt; +10%</span>
          </div>
          <p className="pillar-summary">{forensics?.sloan?.summary || "Compares reported net income against actual operational cash collections."}</p>
          <div className="pillar-footer">
            <button type="button" className="text-link-btn" onClick={() => onNavigateToTab?.("radar")}>
              View cash accruals →
            </button>
          </div>
        </div>
      </section>

      {/* 3. Audited Financial Statements Summary Table */}
      <section className="terminal-table-card">
        <div className="table-card-header">
          <h3>Audited Financial Statement Fundamentals</h3>
          <span className="statement-subtext">All figures extracted from primary regulatory filings ({currP} vs {priorP})</span>
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
                <td>{formatMoney(getFactVal("revenue", currP))}</td>
                <td>{formatMoney(getFactVal("revenue", priorP))}</td>
                <td className="metric-delta">
                  {revGrowth?.value !== null && revGrowth?.value !== undefined
                    ? `${(revGrowth.value * 100).toFixed(1)}% YoY`
                    : revGrowth?.formula || "N/A"}
                </td>
                <td className="note-cell">Reported gross revenue from customer contracts</td>
              </tr>
              <tr>
                <td><strong>Net Income (Profit for Period)</strong></td>
                <td>{formatMoney(getFactVal("netIncome", currP))}</td>
                <td>{formatMoney(getFactVal("netIncome", priorP))}</td>
                <td className="metric-delta">
                  {niGrowth?.value !== null && niGrowth?.value !== undefined
                    ? `${(niGrowth.value * 100).toFixed(1)}% YoY`
                    : niGrowth?.formula || "N/A"}
                </td>
                <td className="note-cell">Attributable to equity shareholders</td>
              </tr>
              <tr>
                <td><strong>Cash Flow from Operations (OCF)</strong></td>
                <td>{formatMoney(getFactVal("operatingCashFlow", currP))}</td>
                <td>{formatMoney(getFactVal("operatingCashFlow", priorP))}</td>
                <td className="metric-delta">
                  {ocfGrowth?.value !== null && ocfGrowth?.value !== undefined
                    ? `${(ocfGrowth.value * 100).toFixed(1)}% YoY`
                    : ocfGrowth?.formula || "N/A"}
                </td>
                <td className="note-cell">Actual cash collected from core operational activities</td>
              </tr>
              <tr>
                <td><strong>Trade Accounts Receivable</strong></td>
                <td>{formatMoney(getFactVal("receivables", currP))}</td>
                <td>{formatMoney(getFactVal("receivables", priorP))}</td>
                <td className="metric-delta">
                  {getCalc("receivables_growth_yoy")?.value !== null && getCalc("receivables_growth_yoy")?.value !== undefined
                    ? `${(getCalc("receivables_growth_yoy")!.value! * 100).toFixed(1)}% YoY`
                    : "N/A"}
                </td>
                <td className="note-cell">Uncollected customer invoices on balance sheet</td>
              </tr>
              <tr>
                <td><strong>Capital Expenditures (CapEx)</strong></td>
                <td>{formatMoney(getFactVal("capex", currP))}</td>
                <td>{formatMoney(getFactVal("capex", priorP))}</td>
                <td className="metric-delta">
                  {getCalc("capex_to_ocf_ratio")?.value !== null && getCalc("capex_to_ocf_ratio")?.value !== undefined
                    ? `${(getCalc("capex_to_ocf_ratio")!.value! * 100).toFixed(1)}% of OCF`
                    : "N/A"}
                </td>
                <td className="note-cell">Property, plant, equipment & productive asset investment</td>
              </tr>
              <tr className="highlight-row">
                <td><strong>Free Cash Flow (OCF - CapEx)</strong></td>
                <td>{fcf?.value !== null && fcf?.value !== undefined ? formatMoney(fcf.value) : "N/A"}</td>
                <td>—</td>
                <td className="metric-delta">{fcf?.value !== null && fcf?.value !== undefined && fcf.value > 0 ? "Positive Cash Gen" : "Cash Deficit"}</td>
                <td className="note-cell">Discretionary capital available for debt service or growth</td>
              </tr>
              <tr className="highlight-row">
                <td><strong>Cash Conversion (OCF / Net Income)</strong></td>
                <td>{cashConv?.value !== null && cashConv?.value !== undefined ? `${(cashConv.value * 100).toFixed(1)}%` : "N/A"}</td>
                <td>—</td>
                <td className="metric-delta">{cashConv?.value !== null && cashConv?.value !== undefined && cashConv.value >= 1.0 ? "High Quality" : "Accrual Gap"}</td>
                <td className="note-cell">Proportion of reported profit materialized as cash</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Grounded Trust Scoreboard */}
      <section className="overview-trust-section">
        <TrustScoreboard
          stats={activeStats}
          scope={scoreboardScope}
          ticker={company}
          onScopeChange={onScopeChange}
        />
      </section>
    </div>
  );
};
