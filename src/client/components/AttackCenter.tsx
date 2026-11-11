import React, { useState } from "react";
import type { AttackScenario, AdversarialAttackResult } from "../types/index.js";
import { ShieldIcon, ZapIcon, RefreshCwIcon, AlertTriangleIcon, CheckIcon } from "./Icons.js";

interface AttackCenterProps {
  ticker: string;
  onAttackCompleted?: () => void;
  innerRef?: React.RefObject<HTMLElement | null>;
}

const SCENARIOS: { id: AttackScenario; label: string; name: string; desc: string; expectedCode: string }[] = [
  {
    id: "fabricated_id",
    label: "Fabricated Reference ID",
    name: "Scenario A: Fabricated Reference ID",
    desc: "AI claims +999% revenue citing non-existent reference ID 'REF-NONEXISTENT-999'.",
    expectedCode: "FAIL_MISSING_REF",
  },
  {
    id: "cross_company",
    label: "Cross-Company Reference",
    name: "Scenario B: Cross-Company Contamination",
    desc: "AI cites valid competitor 10-K fact (e.g. Apple revenue) in this company's audit.",
    expectedCode: "FAIL_CROSS_COMPANY",
  },
  {
    id: "numeric_hallucination",
    label: "Numeric Drift (>0.5%)",
    name: "Scenario C: Numeric Drift (>0.5% Boundary)",
    desc: "AI inflates verified DB figure by +40%, violating strict 0.5% tolerance threshold.",
    expectedCode: "FAIL_MISMATCH",
  },
  {
    id: "sign_flip_mismatch",
    label: "Sign-Flip Inversion",
    name: "Scenario D: Sign-Flip Semantic Inversion",
    desc: "AI inverts sign-flip status or asserts numeric growth on a turnaround company.",
    expectedCode: "FAIL_SIGN_FLIP",
  },
];

export const AttackCenter: React.FC<AttackCenterProps> = ({
  ticker,
  onAttackCompleted,
  innerRef,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<AttackScenario>("fabricated_id");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdversarialAttackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeScenarioMeta = SCENARIOS.find((s) => s.id === selectedScenario)!;

  const handleExecuteAttack = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/investigations/${encodeURIComponent(ticker)}/attack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: selectedScenario }),
      });

      if (!response.ok) {
        throw new Error(`Attack API returned HTTP ${response.status}`);
      }

      const data: AdversarialAttackResult = await response.json();
      setResult(data);
      if (onAttackCompleted) onAttackCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to execute adversarial attack.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="headline-attack-card"
      ref={innerRef as React.RefObject<HTMLElement>}
      id="step-attack"
      aria-label="Adversarial attack demonstration center"
    >
      <div className="attack-card-top">
        <div>
          <p className="eyebrow">Stage 03 · Adversarial Gate Stress-Testing</p>
          <h2>Deliberate Hallucination Injection</h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px", maxWidth: "560px", margin: 0, lineHeight: 1.6 }}>
          Injects known adversarial failure modes directly into the backend verification gate.
          The mechanical gate rejects the ungrounded claim against the database in sub-5ms, records an audit event, and activates atomic fallback.
        </p>
      </div>

      {/* Scenario Selector & Attack Action Bar */}
      <div className="attack-action-bar">
        <div className="attack-tabs">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, marginRight: "4px" }}>
            Vector:
          </span>
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              className={`attack-tab-btn ${selectedScenario === sc.id ? "active" : ""}`}
              onClick={() => {
                setSelectedScenario(sc.id);
                setResult(null);
              }}
            >
              {sc.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="attack-inject-btn"
            onClick={handleExecuteAttack}
            disabled={loading}
          >
            {loading ? <RefreshCwIcon size={14} className="spinning" /> : <ZapIcon size={14} />}
            <span>{loading ? "Intercepting..." : "Inject Adversarial Claim"}</span>
          </button>
          {result && (
            <button
              type="button"
              className="export-button"
              onClick={() => setResult(null)}
            >
              <RefreshCwIcon size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Scenario Description Sub-bar */}
      <div className="scenario-desc-bar">
        <div>
          <strong style={{ color: "var(--text-primary)" }}>{activeScenarioMeta.name}:</strong>{" "}
          <span style={{ color: "var(--text-secondary)" }}>{activeScenarioMeta.desc}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--status-rejected)" }}>
          Expected code: <code>{activeScenarioMeta.expectedCode}</code>
        </div>
      </div>

      {error && (
        <div style={{
          color: "var(--status-rejected)",
          padding: "10px 14px",
          background: "var(--status-rejected-bg)",
          border: "1px solid var(--status-rejected-border)",
          borderRadius: "var(--radius-control)",
          marginBottom: "16px",
          fontSize: "13px",
        }}>
          {error}
        </div>
      )}

      {/* Live Attack Interception Terminal Rejection Box */}
      {result && (
        <div className="attack-result-box">
          <div className="attack-result-header">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldIcon size={14} />
              <span>Mechanical Gate Interception: Rejected & Purged</span>
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
              Latency: {result.latencyMs.toFixed(1)}ms · Code: {result.resultCode.toUpperCase()}
            </span>
          </div>

          {/* 5-Stage Mechanical Defense Pipeline */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: "8px",
            margin: "12px 0 16px",
            padding: "8px",
            background: "var(--bg-deep)",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--border-hairline)",
          }}>
            <div className="pipeline-step">
              <div className="step-num">01 · Vector</div>
              <strong className="step-label" style={{ color: "var(--status-rejected)" }}>AI Vector</strong>
              <span className="step-detail">Adversarial input</span>
            </div>

            <div className="pipeline-step">
              <div className="step-num">02 · Trigger</div>
              <strong className="step-label" style={{ color: "var(--status-warning)" }}>Rule Triggered</strong>
              <span className="step-detail" style={{ fontFamily: "var(--font-mono)" }}>{result.resultCode}</span>
            </div>

            <div className="pipeline-step">
              <div className="step-num">03 · DB Check</div>
              <strong className="step-label" style={{ color: "var(--text-primary)" }}>10-K Database</strong>
              <span className="step-detail">Fact verification</span>
            </div>

            <div className="pipeline-step rejected">
              <div className="step-num" style={{ color: "var(--status-rejected)", fontFamily: "var(--font-mono)" }}>04 · Action</div>
              <strong className="step-label" style={{ color: "var(--status-rejected)" }}>Rejected</strong>
              <span className="step-detail">Fallback engaged</span>
            </div>

            <div className="pipeline-step verified">
              <div className="step-num" style={{ color: "var(--status-verified)", fontFamily: "var(--font-mono)" }}>05 · Audit Log</div>
              <strong className="step-label" style={{ color: "var(--status-verified)" }}>Persisted</strong>
              <span className="step-detail">{result.latencyMs.toFixed(1)}ms</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)", width: "120px", flexShrink: 0 }}>Injected Claim:</span>
              <span style={{ color: "var(--status-rejected)", textDecoration: "line-through" }}>"{result.injectedClaim}"</span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)", width: "120px", flexShrink: 0 }}>Cited Ref ID:</span>
              <span style={{ color: "var(--status-rejected)" }}>{result.citedRef}</span>
              <span style={{ color: "var(--text-muted)" }}>(Expected: {result.expectedCompany})</span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)", width: "120px", flexShrink: 0 }}>Interception Reason:</span>
              <span style={{ color: "var(--text-primary)" }}>{result.reason}</span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)", width: "120px", flexShrink: 0 }}>Database Ground Truth:</span>
              <span style={{ color: "var(--status-verified)" }}>Verified 10-K value = <strong>{result.actualDbValue}</strong></span>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "4px", paddingTop: "6px", borderTop: "1px solid var(--border-hairline)" }}>
              <span style={{ color: "var(--text-muted)", width: "120px", flexShrink: 0 }}>Atomic Fallback:</span>
              <span style={{ color: "var(--text-secondary)" }}>Restored grounded thesis: "{result.fallbackReplacement}"</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
