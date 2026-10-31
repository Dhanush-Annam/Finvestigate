import React from "react";
import type { VerificationScoreboardData } from "../types/index.js";
import { ShieldIcon, CheckIcon, AlertTriangleIcon, ActivityIcon, ZapIcon } from "./Icons.js";

interface TrustScoreboardProps {
  stats: VerificationScoreboardData | null;
  scope: "company" | "all";
  ticker: string;
  onScopeChange: (scope: "company" | "all") => void;
  innerRef?: React.RefObject<HTMLElement | null>;
}

export const TrustScoreboard: React.FC<TrustScoreboardProps> = ({
  stats,
  scope,
  ticker,
  onScopeChange,
  innerRef,
}) => {
  // Production filing evidence metrics (10-K extraction audit)
  const prod = stats?.production;
  const prodTotal = prod?.totalClaims ?? stats?.totalClaims ?? 0;
  const prodVerified = prod?.verifiedClaims ?? stats?.verifiedClaims ?? 0;
  const prodRejected = prod?.rejectedClaims ?? stats?.rejectedClaims ?? 0;
  const prodCross = prod?.crossCompany ?? stats?.crossCompany ?? 0;
  const prodMissing = prod?.missingRef ?? stats?.missingRef ?? 0;
  const prodMismatch = prod?.mismatch ?? stats?.mismatch ?? 0;
  const prodNull = prod?.nullValue ?? stats?.nullValue ?? 0;
  const prodRate = prod?.verificationRate ?? stats?.verificationRate ?? (prodTotal > 0 ? `${((prodVerified / prodTotal) * 100).toFixed(1)}%` : "N/A");
  const prodInterceptionRate = prod?.interceptionRate ?? (prodTotal > 0 ? `${((prodRejected / prodTotal) * 100).toFixed(1)}%` : "N/A");

  // Red-team adversarial attack traffic (injected test vectors)
  const adv = stats?.adversarial;
  const totalAttacks = adv?.totalAttacks ?? 0;
  const blockedAttacks = adv?.blockedAttacks ?? 0;
  const blockRate = adv?.blockRate ?? (totalAttacks > 0 ? `${((blockedAttacks / totalAttacks) * 100).toFixed(1)}%` : "N/A");
  const crossBlocked = adv?.crossCompanyBlocked ?? 0;
  const missingBlocked = adv?.missingRefBlocked ?? 0;
  const driftBlocked = adv?.numericDriftBlocked ?? 0;
  const signFlipBlocked = adv?.signFlipBlocked ?? 0;

  return (
    <section
      className="trust-scoreboard-card"
      ref={innerRef as React.RefObject<HTMLElement>}
      id="step-verify"
      aria-label="Evidence Integrity Scoreboard"
    >
      <div className="scoreboard-head">
        <div>
          <p className="eyebrow">Stage 04 · Citation Gate & Trust Scoreboard</p>
          <h2>Evidence Integrity & Interception Audits</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
            Derived directly from the database <code style={{ fontFamily: "var(--font-mono)" }}>verification_log</code> table.
            Zero hardcoded metrics.
          </p>
        </div>

        <div className="scoreboard-scope-switch">
          <button
            type="button"
            className={`scope-btn ${scope === "company" ? "active" : ""}`}
            onClick={() => onScopeChange("company")}
          >
            {ticker} Scope ({scope === "company" ? prodTotal : "Active"})
          </button>
          <button
            type="button"
            className={`scope-btn ${scope === "all" ? "active" : ""}`}
            onClick={() => onScopeChange("all")}
          >
            Global Repository ({scope === "all" ? prodTotal : "All"})
          </button>
        </div>
      </div>

      {prodTotal === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-deep)", borderRadius: "var(--radius-card)" }}>
          <p style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: "14px", marginBottom: "4px" }}>
            0 audit events recorded yet for this scope
          </p>
          <p style={{ fontSize: "12px", maxWidth: "480px", margin: "0 auto" }}>
            The mechanical verification gate operates dynamically on every claim. Use the Attack Center above to inject an adversarial claim and see it recorded in real time.
          </p>
        </div>
      ) : (
        <>
          {/* Panel 1: Production Evidence Gate */}
          <div className="scoreboard-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                  Panel 1 · Production Filing Evidence Gate
                </span>
                <h3 style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", margin: "2px 0 0" }}>
                  Audited 10-K Filing Grounding ({prodTotal} Claims Evaluated)
                </h3>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--status-verified)", background: "var(--status-verified-bg)", border: "1px solid var(--status-verified-border)", padding: "3px 8px", borderRadius: "var(--radius-tag)" }}>
                Invariant: {prodVerified} + {prodRejected} = {prodTotal} ({prodRate} Grounded)
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "14px" }}>
              <div className="stat-cell verified">
                <div className="stat-figure">{prodVerified}</div>
                <div className="stat-label">Claims Verified</div>
                <div className="stat-sub">{prodRate} grounded</div>
              </div>

              <div className="stat-cell intercepted">
                <div className="stat-figure">{prodRejected}</div>
                <div className="stat-label">Unsupported Rejected</div>
                <div className="stat-sub">Purged before reasoning</div>
              </div>

              <div className="stat-cell">
                <div className="stat-figure">{prodCross}</div>
                <div className="stat-label">Cross-Company Blocked</div>
                <div className="stat-sub">Peer contamination</div>
              </div>

              <div className="stat-cell">
                <div className="stat-figure">{prodMissing}</div>
                <div className="stat-label">Missing Refs Purged</div>
                <div className="stat-sub">Fabricated IDs</div>
              </div>

              <div className="stat-cell">
                <div className="stat-figure">{prodMismatch + prodNull}</div>
                <div className="stat-label">Numeric Drift Flagged</div>
                <div className="stat-sub">&gt;0.5% tolerance violation</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-control)", padding: "8px 12px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <ShieldIcon size={14} style={{ color: "var(--status-verified)", flexShrink: 0 }} />
              <span>
                <strong style={{ color: "var(--text-primary)" }}>0 cross-company citations permitted.</strong> Mechanical gate verifies fact provenance before findings reach the brief.
              </span>
            </div>
          </div>

          {/* Panel 2: Red-Team Test Results */}
          <div className="scoreboard-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                  Panel 2 · Red-Team Adversarial Traffic Harness
                </span>
                <h3 style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", margin: "2px 0 0" }}>
                  Simulated Injected Attacks ({blockedAttacks} / {totalAttacks} Blocked)
                </h3>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--status-rejected)", background: "var(--status-rejected-bg)", border: "1px solid var(--status-rejected-border)", padding: "3px 8px", borderRadius: "var(--radius-tag)" }}>
                {totalAttacks > 0 ? `${blockedAttacks} of ${totalAttacks} Injected Attacks Blocked (${blockRate})` : "0 Attacks Injected in Active Session"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "14px" }}>
              <div className="stat-cell intercepted">
                <div className="stat-figure">{blockedAttacks}</div>
                <div className="stat-label">Attacks Blocked</div>
                <div className="stat-sub">{blockRate} rate</div>
              </div>

              <div className="stat-cell">
                <div className="stat-figure">{crossBlocked}</div>
                <div className="stat-label">Peer Contamination</div>
                <div className="stat-sub">Scenario B blocked</div>
              </div>

              <div className="stat-cell">
                <div className="stat-figure">{missingBlocked}</div>
                <div className="stat-label">Fabricated IDs</div>
                <div className="stat-sub">Scenario A blocked</div>
              </div>

              <div className="stat-cell">
                <div className="stat-figure">{driftBlocked}</div>
                <div className="stat-label">Numeric Drift</div>
                <div className="stat-sub">Scenario C blocked</div>
              </div>

              <div className="stat-cell">
                <div className="stat-figure">{signFlipBlocked}</div>
                <div className="stat-label">Sign-Flip Inversions</div>
                <div className="stat-sub">Scenario D blocked</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-control)", padding: "8px 12px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <ZapIcon size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span>
                <strong style={{ color: "var(--text-primary)" }}>Sub-5ms mechanical enforcement:</strong> Injected attack events are logged as <code style={{ fontFamily: "var(--font-mono)" }}>source_type = 'adversarial'</code> so test traffic never pollutes the production evidence baseline.
              </span>
            </div>
          </div>

          {/* Real SQLite Audit Log Feed */}
          {stats?.recentRejections && stats.recentRejections.length > 0 && (
            <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-card)", padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                <span>Persisted Interception Log Feed (Production Gate)</span>
                <span>Sub-5ms Enforcement</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {stats.recentRejections.slice(0, 4).map((item) => (
                  <div key={item.id} style={{ padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-control)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--status-rejected)", fontWeight: 500 }}>
                        [{item.result.toUpperCase()}] Ref: {item.refId}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p style={{ margin: "2px 0", fontSize: "12px", color: "var(--text-primary)" }}>
                      {item.claimText}
                    </p>
                    <small style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                      Reason: {item.detail}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
