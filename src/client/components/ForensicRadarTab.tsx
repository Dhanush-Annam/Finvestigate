import React, { useState } from "react";
import type { InvestigationData } from "../types/index.js";
import { FindingCard } from "./FindingCard.js";
import { DivergenceRadar } from "./DivergenceRadar.js";
import { ShieldIcon, AlertTriangleIcon, CheckIcon, ActivityIcon, ScaleIcon, TrendingUpIcon } from "./Icons.js";

interface ForensicRadarTabProps {
  investigation: InvestigationData;
  onInspectCalculation?: (calcId: string | null) => void;
}

export const ForensicRadarTab: React.FC<ForensicRadarTabProps> = ({
  investigation,
  onInspectCalculation,
}) => {
  const { company, forensics, findings, calculations } = investigation;
  const [activeModelView, setActiveModelView] = useState<"all" | "divergence" | "beneish" | "altman" | "piotroski" | "sloan">("all");

  const beneish = forensics?.beneish;
  const altman = forensics?.altman;
  const piotroski = forensics?.piotroski;
  const sloan = forensics?.sloan;

  // Beneish variable data for visualization
  const beneishVars = beneish
    ? [
        { code: "DSRI", name: "Days Sales in Receivables", val: beneish.variables.dsri.value, flag: beneish.variables.dsri.flag, thresh: 1.2, desc: "Receivables acceleration relative to sales" },
        { code: "GMI", name: "Gross Margin Index", val: beneish.variables.gmi.value, flag: beneish.variables.gmi.flag, thresh: 1.1, desc: "Gross margin deterioration indicator" },
        { code: "AQI", name: "Asset Quality Index", val: beneish.variables.aqi.value, flag: beneish.variables.aqi.flag, thresh: 1.25, desc: "Non-current non-PPE asset capitalization" },
        { code: "SGI", name: "Sales Growth Index", val: beneish.variables.sgi.value, flag: beneish.variables.sgi.flag, thresh: 1.3, desc: "Rapid top-line expansion trajectory" },
        { code: "DEPI", name: "Depreciation Index", val: beneish.variables.depi.value, flag: beneish.variables.depi.flag, thresh: 1.1, desc: "Slowing rate of asset depreciation" },
        { code: "SGAI", name: "SG&A Expense Index", val: beneish.variables.sgai.value, flag: beneish.variables.sgai.flag, thresh: 1.15, desc: "Over-proportional operating overhead" },
        { code: "LVGI", name: "Leverage Index", val: beneish.variables.lvgi.value, flag: beneish.variables.lvgi.flag, thresh: 1.1, desc: "Debt-to-assets balance sheet expansion" },
        { code: "TATA", name: "Total Accruals to Assets", val: beneish.variables.tata.value, flag: beneish.variables.tata.flag, thresh: 0.05, desc: "Proportion of non-cash accruals to assets" },
      ]
    : [];

  // Altman 5 components for visualization
  const altmanComps = altman
    ? [
        { key: "X1", name: "Working Capital / Assets", weight: 1.2, val: altman.components.x1.value, contrib: (altman.components.x1.value ?? 0) * 1.2, role: "Short-term balance sheet liquidity" },
        { key: "X2", name: "Retained Earnings / Assets", weight: 1.4, val: altman.components.x2.value, contrib: (altman.components.x2.value ?? 0) * 1.4, role: "Cumulative lifetime profitability" },
        { key: "X3", name: "Operating EBIT / Assets", weight: 3.3, val: altman.components.x3.value, contrib: (altman.components.x3.value ?? 0) * 3.3, role: "Core asset earnings productivity" },
        { key: "X4", name: "Equity / Total Liabilities", weight: 0.6, val: altman.components.x4.value, contrib: (altman.components.x4.value ?? 0) * 0.6, role: "Solvency & capital cushion" },
        { key: "X5", name: "Sales / Total Assets", weight: 0.999, val: altman.components.x5.value, contrib: (altman.components.x5.value ?? 0) * 0.999, role: "Asset turnover & capital efficiency" },
      ]
    : [];

  // Piotroski score tallies
  const pSignals = piotroski?.signals;
  const pProfitScore = pSignals
    ? (pSignals.positiveNetIncome ? 1 : 0) +
      (pSignals.positiveRoa ? 1 : 0) +
      (pSignals.positiveOcf ? 1 : 0) +
      (pSignals.cashFlowGreaterThanNetIncome ? 1 : 0)
    : 0;

  const pLevScore = pSignals
    ? (pSignals.lowerLeverage ? 1 : 0) +
      (pSignals.higherCurrentRatio ? 1 : 0) +
      (pSignals.noDilution ? 1 : 0)
    : 0;

  const pEffScore = pSignals
    ? (pSignals.higherGrossMargin ? 1 : 0) +
      (pSignals.higherAssetTurnover ? 1 : 0)
    : 0;

  return (
    <div className="tab-pane forensic-radar-tab">
      <div className="radar-header-banner">
        <div>
          <h2>Forensic Quantitative Accounting Suite</h2>
          <p className="section-lede">
            Deterministic quantitative forensic accounting models evaluating earnings quality, solvency, and balance-sheet integrity directly from audited regulatory disclosures.
          </p>
        </div>

        <div className="model-selector-pills" role="tablist" aria-label="Forensic model filters">
          <button
            type="button"
            className={`pill-btn ${activeModelView === "all" ? "active" : ""}`}
            onClick={() => setActiveModelView("all")}
          >
            All Forensic Models
          </button>
          <button
            type="button"
            className={`pill-btn ${activeModelView === "divergence" ? "active" : ""}`}
            onClick={() => setActiveModelView("divergence")}
          >
            Divergence Radar ({findings.length})
          </button>
          <button
            type="button"
            className={`pill-btn ${activeModelView === "beneish" ? "active" : ""}`}
            onClick={() => setActiveModelView("beneish")}
          >
            Beneish M-Score
          </button>
          <button
            type="button"
            className={`pill-btn ${activeModelView === "altman" ? "active" : ""}`}
            onClick={() => setActiveModelView("altman")}
          >
            Altman Z-Score
          </button>
          <button
            type="button"
            className={`pill-btn ${activeModelView === "piotroski" ? "active" : ""}`}
            onClick={() => setActiveModelView("piotroski")}
          >
            Piotroski F-Score
          </button>
          <button
            type="button"
            className={`pill-btn ${activeModelView === "sloan" ? "active" : ""}`}
            onClick={() => setActiveModelView("sloan")}
          >
            Sloan Accruals
          </button>
        </div>
      </div>

      {/* 1. Divergence Radar & Forensic Findings */}
      {(activeModelView === "all" || activeModelView === "divergence") && (
        <section className="radar-divergence-section">
          <DivergenceRadar
            investigation={investigation}
            onInspectCalculation={(id) => onInspectCalculation?.(id)}
          />
          <FindingCard
            findings={findings}
            onInspectCalculation={(id) => onInspectCalculation?.(id)}
          />
        </section>
      )}

      {/* 2. Beneish M-Score Section with 8-Variable Sensitivity Visualizer */}
      {(activeModelView === "all" || activeModelView === "beneish") && beneish && (
        <section className="forensic-card beneish-breakdown-card">
          <div className="forensic-card-header">
            <div>
              <div className="card-badge-row">
                <span className="model-tag">Beneish (1999) Probabilistic Model</span>
                <span className={`risk-badge ${beneish.interpretation.toLowerCase().replace(/_/g, "-")}`}>
                  {beneish.interpretation === "HIGH_MANIPULATION_RISK" ? "HIGH MANIPULATION RISK" : "LOW RISK"}
                </span>
              </div>
              <h3>Beneish M-Score: {beneish.score !== null ? beneish.score.toFixed(3) : "N/A"}</h3>
            </div>
            <div className="score-summary-pill">
              <span>Manipulation Cutoff: M &gt; -1.78</span>
            </div>
          </div>

          <p className="card-explanation">
            {beneish.summary} The Beneish M-Score detects mathematical probability of earnings manipulation across 8 fundamental dimensions. Negative values below -1.78 indicate low probability of earnings distortion.
          </p>

          {/* Visual 8-Variable Sensitivity Bar Chart */}
          <div className="beneish-visual-chart-container">
            <div className="chart-title-strip">
              <span>8-Variable Sensitivity Relative to Neutral Baseline (1.0)</span>
              <span className="chart-sub-note">Red / Amber indicates threshold violation</span>
            </div>

            <div className="beneish-bars-grid">
              {beneishVars.map((v) => {
                const numVal = v.val ?? 0;
                // Bar width normalized around baseline 1.0 (0.0 to 2.5 scale)
                const barWidth = Math.min(100, Math.max(8, (Math.abs(numVal) / 2.0) * 100));
                return (
                  <div key={v.code} className="beneish-bar-item">
                    <div className="bar-meta-row">
                      <div className="bar-code-name">
                        <strong className="var-code">{v.code}</strong>
                        <span className="var-name">{v.name}</span>
                      </div>
                      <div className="bar-val-badge">
                        <span className={`val-num ${v.flag ? "flagged" : ""}`}>
                          {v.val !== null ? v.val.toFixed(3) : "N/A"}
                        </span>
                        <span className="thresh-label">Cutoff: &gt;{v.thresh}</span>
                      </div>
                    </div>
                    <div className="bar-track-wrap">
                      <div
                        className={`bar-fill-indicator ${v.flag ? "critical" : "normal"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="baseline-line-1" title="Neutral baseline 1.0" />
                    </div>
                    <span className="var-desc-text">{v.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabular Details */}
          <div className="table-responsive">
            <table className="forensic-detail-table">
              <thead>
                <tr>
                  <th>Index</th>
                  <th>Variable Name</th>
                  <th>Mathematical Formula</th>
                  <th>Calculated Index</th>
                  <th>Forensic Status</th>
                </tr>
              </thead>
              <tbody>
                {beneishVars.map((v) => (
                  <tr key={v.code}>
                    <td><strong>{v.code}</strong></td>
                    <td>{v.name}</td>
                    <td><code className="formula-code">Index calculation</code></td>
                    <td className="numeric-val">{v.val !== null ? v.val.toFixed(3) : "N/A"}</td>
                    <td>
                      {v.flag ? (
                        <span className="table-flag warning"><AlertTriangleIcon size={12} /> Threshold flagged (&gt;{v.thresh})</span>
                      ) : (
                        <span className="table-flag pass"><CheckIcon size={12} /> Clean / Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. Altman Z-Score Section with Factor Contribution Waterfall */}
      {(activeModelView === "all" || activeModelView === "altman") && altman && (
        <section className="forensic-card altman-breakdown-card">
          <div className="forensic-card-header">
            <div>
              <div className="card-badge-row">
                <span className="model-tag">Altman Multi-Factor Solvency Model</span>
                <span className={`risk-badge ${altman.classification.toLowerCase().replace(/_/g, "-")}`}>
                  {altman.classification.replace(/_/g, " ")}
                </span>
              </div>
              <h3>Altman Z-Score: {altman.score !== null ? altman.score.toFixed(2) : "N/A"}</h3>
            </div>
            <div className="score-summary-pill">
              <span>Safe: &gt;2.99 | Grey: 1.81–2.99 | Distress: &lt;1.81</span>
            </div>
          </div>

          <p className="card-explanation">{altman.summary}</p>

          {/* Visual 5-Factor Factor Contribution Bar Breakdown */}
          <div className="altman-visual-breakdown">
            <div className="chart-title-strip">
              <span>Factor Contribution to Total Z-Score: Z = 1.2·X1 + 1.4·X2 + 3.3·X3 + 0.6·X4 + 0.999·X5</span>
            </div>

            <div className="altman-components-grid">
              {altmanComps.map((c) => (
                <div key={c.key} className="component-tile">
                  <div className="comp-top">
                    <span className="comp-key">{c.key}</span>
                    <span className="comp-weight">Weight: {c.weight}x</span>
                  </div>
                  <span className="comp-name">{c.name}</span>
                  <div className="comp-values-row">
                    <span className="comp-val">{c.val !== null ? c.val.toFixed(3) : "N/A"}</span>
                    <span className="comp-contrib text-verified">+{c.contrib.toFixed(2)} pts</span>
                  </div>
                  <span className="comp-sub">{c.role}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Piotroski F-Score Section with 3-Pillar Scorecard Grid */}
      {(activeModelView === "all" || activeModelView === "piotroski") && piotroski && (
        <section className="forensic-card piotroski-breakdown-card">
          <div className="forensic-card-header">
            <div>
              <div className="card-badge-row">
                <span className="model-tag">Piotroski 9-Signal Screen</span>
                <span className={`risk-badge ${piotroski.classification.toLowerCase()}`}>
                  {piotroski.classification} ({piotroski.score}/9)
                </span>
              </div>
              <h3>Piotroski F-Score: {piotroski.score}/9</h3>
            </div>
            <div className="score-summary-pill">
              <span>Strong: 8–9 | Moderate: 5–7 | Weak: &le;4</span>
            </div>
          </div>

          <p className="card-explanation">{piotroski.summary}</p>

          <div className="checklist-3col-grid">
            {/* Profitability Column */}
            <div className="checklist-group">
              <div className="group-header-row">
                <h4>Profitability Signals</h4>
                <span className="group-score-pill">{pProfitScore}/4 pts</span>
              </div>
              <ul className="checklist">
                <li className={piotroski.signals.positiveNetIncome ? "passed" : "failed"}>
                  {piotroski.signals.positiveNetIncome ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                  <span>Positive Net Income</span>
                </li>
                <li className={piotroski.signals.positiveRoa ? "passed" : "failed"}>
                  {piotroski.signals.positiveRoa ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                  <span>Positive Return on Assets (ROA)</span>
                </li>
                <li className={piotroski.signals.positiveOcf ? "passed" : "failed"}>
                  {piotroski.signals.positiveOcf ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                  <span>Positive Operating Cash Flow</span>
                </li>
                <li className={piotroski.signals.cashFlowGreaterThanNetIncome ? "passed" : "failed"}>
                  {piotroski.signals.cashFlowGreaterThanNetIncome ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                  <span>Quality of Earnings (OCF &gt; Net Income)</span>
                </li>
              </ul>
            </div>

            {/* Leverage & Liquidity Column */}
            <div className="checklist-group">
              <div className="group-header-row">
                <h4>Leverage &amp; Liquidity</h4>
                <span className="group-score-pill">{pLevScore}/3 pts</span>
              </div>
              <ul className="checklist">
                <li className={piotroski.signals.lowerLeverage ? "passed" : "failed"}>
                  {piotroski.signals.lowerLeverage ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                  <span>Decreasing / Stable Long-Term Debt</span>
                </li>
                <li className={piotroski.signals.higherCurrentRatio ? "passed" : "failed"}>
                  {piotroski.signals.higherCurrentRatio ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                  <span>Higher Current Ratio YoY</span>
                </li>
                <li className={piotroski.signals.noDilution ? "passed" : "failed"}>
                  {piotroski.signals.noDilution ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                  <span>No Substantial Share Dilution</span>
                </li>
              </ul>
            </div>

            {/* Operating Efficiency Column */}
            <div className="checklist-group">
              <div className="group-header-row">
                <h4>Operating Efficiency</h4>
                <span className="group-score-pill">{pEffScore}/2 pts</span>
              </div>
              <ul className="checklist">
                <li className={piotroski.signals.higherGrossMargin ? "passed" : "failed"}>
                  {piotroski.signals.higherGrossMargin ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                  <span>Higher Gross Margin YoY</span>
                </li>
                <li className={piotroski.signals.higherAssetTurnover ? "passed" : "failed"}>
                  {piotroski.signals.higherAssetTurnover ? <CheckIcon size={13} /> : <AlertTriangleIcon size={13} />}
                  <span>Higher Asset Turnover Ratio</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* 5. Sloan Accruals Section */}
      {(activeModelView === "all" || activeModelView === "sloan") && sloan && (
        <section className="forensic-card sloan-breakdown-card">
          <div className="forensic-card-header">
            <div>
              <div className="card-badge-row">
                <span className="model-tag">Sloan Accrual Quality Model</span>
                <span className={`risk-badge ${sloan.interpretation.toLowerCase().replace(/_/g, "-")}`}>
                  {sloan.interpretation.replace(/_/g, " ")}
                </span>
              </div>
              <h3>
                Sloan Accrual Ratio: {sloan.ratio !== null ? `${(sloan.ratio * 100).toFixed(2)}%` : "N/A"}
              </h3>
            </div>
            <div className="score-summary-pill">
              <span>Balanced Band: |Ratio| &le; 10%</span>
            </div>
          </div>

          <p className="card-explanation">{sloan.summary}</p>

          <div className="sloan-visual-explanation">
            <div className="sloan-balance-band-visual">
              <div className="band-zone cash-heavy">
                <span>Negative Accruals (&lt; -10%)</span>
                <strong>Cash Flow Heavy</strong>
              </div>
              <div className="band-zone safe">
                <span>Safe Band (-10% to +10%)</span>
                <strong>Balanced Earnings Quality</strong>
              </div>
              <div className="band-zone aggressive">
                <span>Aggressive Accruals (&gt; +10%)</span>
                <strong>Non-Cash Profit Inflation</strong>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
