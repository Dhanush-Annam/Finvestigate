import React, { useState } from "react";
import type { InvestigationData } from "../types/index.js";
import { FindingCard } from "./FindingCard.js";
import { DivergenceRadar } from "./DivergenceRadar.js";
import { ShieldIcon, AlertTriangleIcon, CheckIcon, TerminalIcon } from "./Icons.js";

interface ForensicRadarTabProps {
  investigation: InvestigationData;
  onInspectCalculation?: (calcId: string | null) => void;
}

export const ForensicRadarTab: React.FC<ForensicRadarTabProps> = ({
  investigation,
  onInspectCalculation,
}) => {
  const { company, forensics, findings, calculations } = investigation;
  const [activeModelView, setActiveModelView] = useState<"all" | "beneish" | "altman" | "piotroski" | "sloan">("all");

  const beneish = forensics?.beneish;
  const altman = forensics?.altman;
  const piotroski = forensics?.piotroski;
  const sloan = forensics?.sloan;

  return (
    <div className="tab-pane forensic-radar-tab">
      <div className="radar-header-banner">
        <div>
          <h2>Forensic Quantitative Anomaly Suite</h2>
          <p className="section-lede">
            Institutional quantitative forensic accounting models running deterministically on audited financial disclosures.
          </p>
        </div>

        <div className="model-selector-pills">
          <button
            type="button"
            className={`pill-btn ${activeModelView === "all" ? "active" : ""}`}
            onClick={() => setActiveModelView("all")}
          >
            All Models
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

      {/* 1. Beneish M-Score Section */}
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
              <span>Threshold: M &gt; -1.78</span>
            </div>
          </div>

          <p className="card-explanation">
            {beneish.summary} The Beneish M-Score uses an 8-variable probabilistic model to detect financial statement manipulation. Enron had an M-Score of -0.06 in 2000 prior to collapse.
          </p>

          <div className="table-responsive">
            <table className="forensic-detail-table">
              <thead>
                <tr>
                  <th>Index</th>
                  <th>Variable Name</th>
                  <th>Mathematical Formula</th>
                  <th>Calculated Index</th>
                  <th>Forensic Meaning & Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>DSRI</strong></td>
                  <td>Days Sales in Receivables Index</td>
                  <td><code>(AR_t / Rev_t) / (AR_t-1 / Rev_t-1)</code></td>
                  <td className="numeric-val">{beneish.variables.dsri.value?.toFixed(3) ?? "N/A"}</td>
                  <td>
                    {beneish.variables.dsri.flag ? (
                      <span className="table-flag warning"><AlertTriangleIcon size={12} /> High receivables acceleration (&gt;1.2)</span>
                    ) : (
                      <span className="table-flag pass"><CheckIcon size={12} /> Balanced collection cycle</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td><strong>GMI</strong></td>
                  <td>Gross Margin Index</td>
                  <td><code>GrossMargin_t-1 / GrossMargin_t</code></td>
                  <td className="numeric-val">{beneish.variables.gmi.value?.toFixed(3) ?? "N/A"}</td>
                  <td>
                    {beneish.variables.gmi.flag ? (
                      <span className="table-flag warning"><AlertTriangleIcon size={12} /> Margin deterioration (&gt;1.1)</span>
                    ) : (
                      <span className="table-flag pass"><CheckIcon size={12} /> Stable / expanding margin</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td><strong>AQI</strong></td>
                  <td>Asset Quality Index</td>
                  <td><code>Non-current non-PPE assets YoY ratio</code></td>
                  <td className="numeric-val">{beneish.variables.aqi.value?.toFixed(3) ?? "N/A"}</td>
                  <td>
                    {beneish.variables.aqi.flag ? (
                      <span className="table-flag warning"><AlertTriangleIcon size={12} /> Capitalization of costs (&gt;1.25)</span>
                    ) : (
                      <span className="table-flag pass"><CheckIcon size={12} /> Clean balance sheet</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td><strong>SGI</strong></td>
                  <td>Sales Growth Index</td>
                  <td><code>Revenue_t / Revenue_t-1</code></td>
                  <td className="numeric-val">{beneish.variables.sgi.value?.toFixed(3) ?? "N/A"}</td>
                  <td>
                    {beneish.variables.sgi.flag ? (
                      <span className="table-flag info">Rapid sales velocity (&gt;1.30)</span>
                    ) : (
                      <span className="table-flag pass"><CheckIcon size={12} /> Sustainable top-line</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td><strong>DEPI</strong></td>
                  <td>Depreciation Index</td>
                  <td><code>DeprRate_t-1 / DeprRate_t</code></td>
                  <td className="numeric-val">{beneish.variables.depi.value?.toFixed(3) ?? "N/A"}</td>
                  <td>
                    {beneish.variables.depi.flag ? (
                      <span className="table-flag warning"><AlertTriangleIcon size={12} /> Depreciation slowed (&gt;1.1)</span>
                    ) : (
                      <span className="table-flag pass"><CheckIcon size={12} /> Normal depreciation rates</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td><strong>SGAI</strong></td>
                  <td>SG&A Expense Index</td>
                  <td><code>(SGA_t / Sales_t) / (SGA_t-1 / Sales_t-1)</code></td>
                  <td className="numeric-val">{beneish.variables.sgai.value?.toFixed(3) ?? "N/A"}</td>
                  <td>
                    {beneish.variables.sgai.flag ? (
                      <span className="table-flag warning"><AlertTriangleIcon size={12} /> Over-proportional opex (&gt;1.15)</span>
                    ) : (
                      <span className="table-flag pass"><CheckIcon size={12} /> Operating leverage intact</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td><strong>LVGI</strong></td>
                  <td>Leverage Index</td>
                  <td><code>(Debt / Assets)_t / (Debt / Assets)_t-1</code></td>
                  <td className="numeric-val">{beneish.variables.lvgi.value?.toFixed(3) ?? "N/A"}</td>
                  <td>
                    {beneish.variables.lvgi.flag ? (
                      <span className="table-flag warning"><AlertTriangleIcon size={12} /> Leverage expansion (&gt;1.1)</span>
                    ) : (
                      <span className="table-flag pass"><CheckIcon size={12} /> Controlled debt profile</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td><strong>TATA</strong></td>
                  <td>Total Accruals to Total Assets</td>
                  <td><code>(Net Income - OCF) / Total Assets</code></td>
                  <td className="numeric-val">{beneish.variables.tata.value?.toFixed(4) ?? "N/A"}</td>
                  <td>
                    {beneish.variables.tata.flag ? (
                      <span className="table-flag warning"><AlertTriangleIcon size={12} /> High non-cash accruals (&gt;0.05)</span>
                    ) : (
                      <span className="table-flag pass"><CheckIcon size={12} /> High cash flow backing</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 2. Altman Z-Score Section */}
      {(activeModelView === "all" || activeModelView === "altman") && altman && (
        <section className="forensic-card altman-breakdown-card">
          <div className="forensic-card-header">
            <div>
              <div className="card-badge-row">
                <span className="model-tag">Altman Solvency Model</span>
                <span className={`risk-badge ${altman.classification.toLowerCase().replace(/_/g, "-")}`}>
                  {altman.classification.replace(/_/g, " ")}
                </span>
              </div>
              <h3>Altman Z-Score: {altman.score !== null ? altman.score.toFixed(2) : "N/A"}</h3>
            </div>
            <div className="score-summary-pill">
              <span>Safe: &gt;2.99 | Grey: 1.81-2.99 | Distress: &lt;1.81</span>
            </div>
          </div>

          <p className="card-explanation">{altman.summary}</p>

          <div className="altman-components-grid">
            <div className="component-tile">
              <span className="comp-name">X1: Working Capital</span>
              <span className="comp-weight">Weight: 1.20</span>
              <span className="comp-val">{altman.components.x1.value !== null ? altman.components.x1.value.toFixed(3) : "N/A"}</span>
              <span className="comp-sub">Liquidity buffer</span>
            </div>
            <div className="component-tile">
              <span className="comp-name">X2: Retained Earnings</span>
              <span className="comp-weight">Weight: 1.40</span>
              <span className="comp-val">{altman.components.x2.value !== null ? altman.components.x2.value.toFixed(3) : "N/A"}</span>
              <span className="comp-sub">Cumulative profitability</span>
            </div>
            <div className="component-tile">
              <span className="comp-name">X3: Operating EBIT</span>
              <span className="comp-weight">Weight: 3.30</span>
              <span className="comp-val">{altman.components.x3.value !== null ? altman.components.x3.value.toFixed(3) : "N/A"}</span>
              <span className="comp-sub">Core earnings productivity</span>
            </div>
            <div className="component-tile">
              <span className="comp-name">X4: Equity / Liabilities</span>
              <span className="comp-weight">Weight: 0.60</span>
              <span className="comp-val">{altman.components.x4.value !== null ? altman.components.x4.value.toFixed(3) : "N/A"}</span>
              <span className="comp-sub">Capital cushion</span>
            </div>
            <div className="component-tile">
              <span className="comp-name">X5: Asset Turnover</span>
              <span className="comp-weight">Weight: 0.999</span>
              <span className="comp-val">{altman.components.x5.value !== null ? altman.components.x5.value.toFixed(3) : "N/A"}</span>
              <span className="comp-sub">Revenue generation</span>
            </div>
          </div>
        </section>
      )}

      {/* 3. Piotroski F-Score Section */}
      {(activeModelView === "all" || activeModelView === "piotroski") && piotroski && (
        <section className="forensic-card piotroski-breakdown-card">
          <div className="forensic-card-header">
            <div>
              <div className="card-badge-row">
                <span className="model-tag">Piotroski Fundamental Screen</span>
                <span className={`risk-badge ${piotroski.classification.toLowerCase()}`}>
                  {piotroski.classification} ({piotroski.score}/9)
                </span>
              </div>
              <h3>Piotroski F-Score: {piotroski.score}/9</h3>
            </div>
            <div className="score-summary-pill">
              <span>Strong: 8-9 | Moderate: 5-7 | Weak: &le;4</span>
            </div>
          </div>

          <p className="card-explanation">{piotroski.summary}</p>

          <div className="checklist-3col-grid">
            <div className="checklist-group">
              <h4>Profitability Signals (4 pts)</h4>
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

            <div className="checklist-group">
              <h4>Leverage & Liquidity (3 pts)</h4>
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

            <div className="checklist-group">
              <h4>Operating Efficiency (2 pts)</h4>
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

      {/* 4. Sloan Accruals Section */}
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
              <span>Threshold: |Ratio| &le; 10% Balanced</span>
            </div>
          </div>

          <p className="card-explanation">{sloan.summary}</p>
        </section>
      )}

      {/* 5. Divergence Radar & Finding Cards */}
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
    </div>
  );
};
