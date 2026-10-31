import React from "react";
import { ShieldIcon, CheckIcon, XIcon, AlertTriangleIcon } from "./Icons.js";

interface RejectedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rejectedItems: { surface: string; claimText: string; reason: string }[];
  verifiedCount: number;
}

export const RejectedDrawer: React.FC<RejectedDrawerProps> = ({
  isOpen,
  onClose,
  rejectedItems,
  verifiedCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="rejected-drawer">
      <div className="drawer-topline">
        <h4>
          <ShieldIcon size={16} style={{ color: "var(--accent)" }} />
          <span>Automated Citation Verification Gate Audit</span>
        </h4>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: "4px 8px", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
          aria-label="Close drawer"
        >
          <XIcon size={16} />
        </button>
      </div>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 12px" }}>
        The verification gate intercepts every LLM finding, claim, and debate argument. If a model asserts a hallucinated figure, references a competitor's filing, or cites an ungrounded calculation ID, it is intercepted against the database in sub-5ms before reaching the user.
      </p>

      {rejectedItems.length > 0 ? (
        <div style={{ marginTop: "12px" }}>
          <div style={{ color: "var(--status-rejected)", fontSize: "12px", fontWeight: 500, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangleIcon size={13} />
            <span>Intercepted & Stripped Items in Current Session:</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {rejectedItems.map((item, idx) => (
              <div key={idx} style={{ padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-control)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginRight: "6px" }}>[{item.surface}]</span>
                  <span>{item.claimText}</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--status-rejected)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
                  Reason: {item.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "8px 12px", background: "var(--status-verified-bg)", border: "1px solid var(--status-verified-border)", borderRadius: "var(--radius-control)", display: "flex", alignItems: "center", gap: "6px", color: "var(--status-verified)", fontSize: "12px" }}>
          <CheckIcon size={14} />
          <span>All {verifiedCount} statements in this active investigation matched verified database 10-K figures with zero hallucinated references.</span>
        </div>
      )}
    </div>
  );
};
