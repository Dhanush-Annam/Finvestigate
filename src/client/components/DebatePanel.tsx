import React from "react";
import type { Debate, DebateArgument } from "../../shared/types/index.js";
import { TrendingUpIcon, TrendingDownIcon, ScaleIcon, SearchIcon, ActivityIcon } from "./Icons.js";

interface DebatePanelProps {
  debate: Debate;
  company: string;
  onInspectCalculation: (calcId: string | null) => void;
  innerRef?: React.RefObject<HTMLElement | null>;
}

export const DebatePanel: React.FC<DebatePanelProps> = ({
  debate,
  company,
  onInspectCalculation,
  innerRef,
}) => {
  const bullScore = debate.judgeVerdict.bullScore ?? debate.bullCase.overallStrength;
  const bearScore = debate.judgeVerdict.bearScore ?? debate.bearCase.overallStrength;
  const totalScore = bullScore + bearScore || 10;
  const bullPct = Math.round((bullScore / totalScore) * 100);
  const bearPct = 100 - bullPct;

  return (
    <section
      className="debate-court-section"
      ref={innerRef as React.RefObject<HTMLElement>}
      id="step-challenge"
      aria-label="Tri-agent courtroom debate"
    >
      <div className="section-heading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p className="eyebrow">Stage 05 · Tri-Agent Judicial Debate</p>
            <h2>Competing Theses, One Critical Diligence Question</h2>
          </div>
          <div>
            {debate.mode === "ai_grounded" ? (
              <span className="finding-status-tag pass" title="Evidence-grounded multi-agent debate verified against SEC filings">
                <ActivityIcon size={12} />
                <span>AI Grounded Mode (Gemini 10-K Constrained)</span>
              </span>
            ) : (
              <span className="finding-status-tag low" title="Deterministic rule-based arguments constructed directly from audited calculations">
                <ActivityIcon size={12} />
                <span>Deterministic Fallback Mode</span>
              </span>
            )}
          </div>
        </div>
        <p>
          Both Bull and Bear cases are strictly constrained to verified regulatory evidence.
          The Judge synthesizes the primary unresolved risk question for the investment committee.
        </p>
      </div>

      {/* Conviction Gauge */}
      <div className="conviction-meter-container">
        <div className="conviction-header">
          <span className="bull-stat">
            Bull Conviction: {bullScore.toFixed(1)}/10 ({bullPct}%)
          </span>
          <span className="bear-stat">
            Bear Conviction: {bearScore.toFixed(1)}/10 ({bearPct}%)
          </span>
        </div>
        <div className="conviction-bar-track">
          <div className="conviction-bull-fill" style={{ width: `${bullPct}%` }} />
          <div className="conviction-bear-fill" style={{ width: `${bearPct}%` }} />
        </div>
        <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          <span>Evidence-derived conviction score</span>
          <span>Bounded 1.0–9.5 · Audited 10-K math</span>
        </div>
      </div>

      {/* Dynamic Evidence-Based Conviction Drivers */}
      {((debate.judgeVerdict.bullFactors && debate.judgeVerdict.bullFactors.length > 0) ||
        (debate.judgeVerdict.bearFactors && debate.judgeVerdict.bearFactors.length > 0)) && (
        <div style={{
          marginBottom: "16px",
          padding: "12px 14px",
          background: "var(--bg-deep)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-control)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          fontSize: "12px",
        }}>
          <div>
            <div style={{ fontWeight: 500, color: "var(--status-verified)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingUpIcon size={13} />
              <span>Key Bull Fundamentals</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {debate.judgeVerdict.bullFactors?.slice(0, 3).map((f, i) => (
                <li key={i}>
                  <strong style={{ color: "var(--text-primary)" }}>{f.factor} (+{f.contribution.toFixed(1)}):</strong> {f.evidence}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 500, color: "var(--status-rejected)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingDownIcon size={13} />
              <span>Key Bear Risk Drivers</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {debate.judgeVerdict.bearFactors?.slice(0, 3).map((f, i) => (
                <li key={i}>
                  <strong style={{ color: "var(--text-primary)" }}>{f.factor} (+{f.contribution.toFixed(1)}):</strong> {f.evidence}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Bull vs Bear Cases Grid */}
      <div className="debate-agents-grid">
        {/* Bull Case */}
        <div className="debate-agent-card bull-case">
          <div className="agent-title">
            <TrendingUpIcon size={16} style={{ color: "var(--status-verified)" }} />
            <span>Bull Thesis (Strength: {bullScore.toFixed(1)}/10)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {debate.bullCase.arguments.map((arg: DebateArgument, idx: number) => (
              <div key={idx} style={{ padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-control)" }}>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: "0 0 8px", lineHeight: 1.5 }}>
                  "{arg.argument}"
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: arg.caveat ? "6px" : "0" }}>
                  {arg.evidence.map((ev: { metric: string; value: string; reference: string }, eIdx: number) => (
                    <button
                      key={eIdx}
                      type="button"
                      style={{
                        padding: "2px 8px",
                        background: "var(--bg-deep)",
                        border: "1px solid var(--border-hairline)",
                        borderRadius: "var(--radius-tag)",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                      onClick={() => onInspectCalculation(ev.reference)}
                      title={`Trace reference ${ev.reference}`}
                    >
                      <span>{ev.metric}: <strong style={{ color: "var(--text-primary)" }}>{ev.value}</strong></span>
                      <span style={{ color: "var(--accent)", marginLeft: "4px" }}>[{ev.reference}]</span>
                    </button>
                  ))}
                </div>
                {arg.caveat && (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                    <em>Caveat:</em> {arg.caveat}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bear Case */}
        <div className="debate-agent-card bear-case">
          <div className="agent-title">
            <TrendingDownIcon size={16} style={{ color: "var(--status-rejected)" }} />
            <span>Bear Thesis (Strength: {bearScore.toFixed(1)}/10)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {debate.bearCase.arguments.map((arg: DebateArgument, idx: number) => (
              <div key={idx} style={{ padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-control)" }}>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: "0 0 8px", lineHeight: 1.5 }}>
                  "{arg.argument}"
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: arg.caveat ? "6px" : "0" }}>
                  {arg.evidence.map((ev: { metric: string; value: string; reference: string }, eIdx: number) => (
                    <button
                      key={eIdx}
                      type="button"
                      style={{
                        padding: "2px 8px",
                        background: "var(--bg-deep)",
                        border: "1px solid var(--border-hairline)",
                        borderRadius: "var(--radius-tag)",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                      onClick={() => onInspectCalculation(ev.reference)}
                      title={`Trace reference ${ev.reference}`}
                    >
                      <span>{ev.metric}: <strong style={{ color: "var(--text-primary)" }}>{ev.value}</strong></span>
                      <span style={{ color: "var(--accent)", marginLeft: "4px" }}>[{ev.reference}]</span>
                    </button>
                  ))}
                </div>
                {arg.caveat && (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                    <em>Caveat:</em> {arg.caveat}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forensic Judge Synthesis */}
      <div className="judge-synthesis-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
            Forensic Judge Verdict · Evidence Quality: {debate.judgeVerdict.evidenceQuality}
          </span>
          {debate.judgeVerdict.confidence && (
            <span style={{ fontSize: "11px", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
              Confidence: {debate.judgeVerdict.confidence}
            </span>
          )}
        </div>

        <h3 className="judge-title">
          {debate.judgeVerdict.mostImportantUnresolvedQuestion}
        </h3>

        <p className="judge-text">
          {debate.judgeVerdict.explanation}
        </p>

        {debate.judgeVerdict.unresolvedQuestionEvidenceRefs && debate.judgeVerdict.unresolvedQuestionEvidenceRefs.length > 0 && (
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Cited evidence chain:
            </span>
            {debate.judgeVerdict.unresolvedQuestionEvidenceRefs.map((refId) => (
              <button
                key={refId}
                type="button"
                style={{
                  padding: "2px 8px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--radius-tag)",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent)",
                  cursor: "pointer",
                }}
                onClick={() => onInspectCalculation(refId)}
              >
                [{refId}]
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
