import React from "react";
import type { Calculation, Fact } from "../../shared/types/index.js";
import { labelFor, displayCalculationValue, displayValue } from "../types/index.js";
import { CheckIcon, ExternalLinkIcon, FileTextIcon, TerminalIcon } from "./Icons.js";

interface EvidenceLineageProps {
  company: string;
  calculations: Calculation[];
  facts: Fact[];
  selectedCalcId: string | null;
  onSelectCalcId: (id: string) => void;
  innerRef?: React.RefObject<HTMLDivElement | null>;
}

export const EvidenceLineage: React.FC<EvidenceLineageProps> = ({
  company,
  calculations,
  facts,
  selectedCalcId,
  onSelectCalcId,
  innerRef,
}) => {
  const selectedCalculation = calculations.find((c) => c.calcId === selectedCalcId) ?? calculations[0] ?? null;
  const inputs = selectedCalculation
    ? selectedCalculation.inputFactIds
        .map((id) => facts.find((fact) => fact.factId === id))
        .filter((fact): fact is Fact => Boolean(fact))
    : [];

  const getDetailedLineage = () => {
    if (!selectedCalculation || inputs.length === 0) return null;

    const metric = selectedCalculation.metric;
    const f0 = inputs[0];
    const f1 = inputs[1];

    if (metric === "capex_to_ocf_ratio" && f0 && f1) {
      const capexFact = inputs.find((f) => f.metric === "capex") || f0;
      const ocfFact = inputs.find((f) => f.metric === "operatingCashFlow") || f1;
      return {
        formulaName: "CapEx ÷ Operating Cash Flow",
        mathBreakdown: `${displayValue(capexFact.value, capexFact.unit)} ÷ ${displayValue(ocfFact.value, ocfFact.unit)} = ${selectedCalculation.value !== null ? selectedCalculation.value.toFixed(4) : "N/A"} → ${displayCalculationValue(selectedCalculation)}`,
      };
    }

    if (metric === "cash_conversion_ratio" && f0 && f1) {
      const ocfFact = inputs.find((f) => f.metric === "operatingCashFlow") || f0;
      const niFact = inputs.find((f) => f.metric === "netIncome") || f1;
      return {
        formulaName: "Operating Cash Flow ÷ Net Income",
        mathBreakdown: `${displayValue(ocfFact.value, ocfFact.unit)} ÷ ${displayValue(niFact.value, niFact.unit)} = ${selectedCalculation.value !== null ? selectedCalculation.value.toFixed(4) : "N/A"} → ${displayCalculationValue(selectedCalculation)}`,
      };
    }

    if (metric === "free_cash_flow" && f0 && f1) {
      const ocfFact = inputs.find((f) => f.metric === "operatingCashFlow") || f0;
      const capexFact = inputs.find((f) => f.metric === "capex") || f1;
      return {
        formulaName: "Operating Cash Flow − CapEx",
        mathBreakdown: `${displayValue(ocfFact.value, ocfFact.unit)} − ${displayValue(capexFact.value, capexFact.unit)} = ${displayCalculationValue(selectedCalculation)}`,
      };
    }

    if (metric.endsWith("_growth_yoy") && f0 && f1) {
      const currentFact = f0;
      const priorFact = f1;
      const metricLabel = labelFor(currentFact.metric);
      return {
        formulaName: `(Current ${metricLabel} − Prior ${metricLabel}) ÷ Prior ${metricLabel}`,
        mathBreakdown: `(${displayValue(currentFact.value, currentFact.unit)} − ${displayValue(priorFact.value, priorFact.unit)}) ÷ ${displayValue(priorFact.value, priorFact.unit)} = ${displayCalculationValue(selectedCalculation)}`,
      };
    }

    return {
      formulaName: selectedCalculation.formula,
      mathBreakdown: `${selectedCalculation.formula} → ${displayCalculationValue(selectedCalculation)}`,
    };
  };

  const detailedLineage = getDetailedLineage();

  return (
    <section className="evidence-panel" ref={innerRef as React.RefObject<HTMLElement>} aria-label="Evidence explorer">
      <div className="section-heading">
        <p className="eyebrow">Stage 04 · Evidence Lineage DAG</p>
        <h2>Deterministic Calculation Provenance</h2>
        <p>
          Select any metric to inspect its reported inputs, mathematical formula, and primary regulatory filing accession records.
        </p>
      </div>

      <div className="evidence-grid">
        <div className="calculation-list">
          {calculations.map((calculation) => (
            <button
              key={calculation.calcId}
              type="button"
              className={`calculation-row ${calculation.calcId === selectedCalculation?.calcId ? "active" : ""}`}
              onClick={() => onSelectCalcId(calculation.calcId)}
            >
              <div className="calc-name">{labelFor(calculation.metric)}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {calculation.period.label}
                </span>
                <span className="calc-val">{displayCalculationValue(calculation)}</span>
              </div>
            </button>
          ))}
        </div>

        {selectedCalculation && (
          <div className="lineage-detail-card">
            {/* 4-Node Visual Evidence Lineage */}
            <div className="lineage-4node-grid">
              <div className="lineage-node">
                <div className="node-step-label">01 · Source</div>
                <div className="node-label truncatable" title={inputs[0]?.source || `${company} Filing`}>
                  {inputs[0]?.source || `${company} Filing`}
                </div>
                {inputs[0]?.sourceUrl && (
                  <a
                    href={inputs[0].sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px", marginTop: "4px" }}
                  >
                    <span>SEC Document</span>
                    <ExternalLinkIcon size={11} />
                  </a>
                )}
              </div>

              <div className="lineage-node">
                <div className="node-step-label">02 · Reported Fact</div>
                <div className="node-label">
                  {inputs[0] ? displayValue(inputs[0].value, inputs[0].unit) : "Reported Fact"}
                </div>
                <span className="node-sub">{inputs[0]?.factId || "Fact Node"}</span>
              </div>

              <div className="lineage-node">
                <div className="node-step-label">03 · Formula</div>
                <div className="node-label truncatable" title={detailedLineage?.formulaName || selectedCalculation.formula}>
                  {detailedLineage?.formulaName || selectedCalculation.formula}
                </div>
                <span className="node-sub">{selectedCalculation.calcId}</span>
              </div>

              <div className="lineage-node verified">
                <div className="node-step-label verified">04 · Verified</div>
                <div className="node-label" style={{ color: "var(--status-verified)" }}>
                  {displayCalculationValue(selectedCalculation)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--status-verified)", display: "flex", alignItems: "center", gap: "3px" }}>
                  <CheckIcon size={12} />
                  <span>Ground truth</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                Calculation ID: {selectedCalculation.calcId}
              </span>
              <h3 style={{ fontSize: "18px", fontWeight: 500, color: "var(--text-primary)", margin: "4px 0" }}>
                {labelFor(selectedCalculation.metric)}: {displayCalculationValue(selectedCalculation)}
              </h3>
            </div>

            {/* Arithmetic Lineage Breakdown Box */}
            <div className="formula-display">
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Audited arithmetic reconciliation:
              </span>
              <span style={{ color: "var(--accent)" }}>{detailedLineage?.mathBreakdown}</span>
            </div>

            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>
              Derived from {inputs.length} reported filing fact{inputs.length === 1 ? "" : "s"}:
            </div>

            <div className="input-facts-grid">
              {inputs.map((fact) => (
                <div className="fact-card" key={fact.factId}>
                  <div className="fact-label">Fact · {fact.period.label} · {fact.factId}</div>
                  <div className="fact-value">
                    {labelFor(fact.metric)}: <span>{displayValue(fact.value, fact.unit)}</span>
                  </div>
                  <div className="fact-source">
                    <FileTextIcon size={12} />
                    <span>{fact.source}</span>
                  </div>
                  {fact.sourceUrl && (
                    <div style={{ marginTop: "6px" }}>
                      <a
                        href={fact.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px" }}
                      >
                        <span>Open SEC Filing</span>
                        <ExternalLinkIcon size={11} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
