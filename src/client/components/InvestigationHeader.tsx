import React from "react";
import type { InvestigationData } from "../types/index.js";
import { ShieldIcon, CheckIcon, FileTextIcon, SearchIcon } from "./Icons.js";

interface InvestigationHeaderProps {
  investigation: InvestigationData | null;
  ticker: string;
  liveQuery: string;
  searchError: string | null;
  loading: boolean;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onSelectTicker: (ticker: string) => void;
  onOpenExportModal: () => void;
  onToggleDrawer: () => void;
  rejectedCount: number;
  verifiedCount: number;
  totalCount: number;
}

const INDIAN_TICKERS = new Set(["RELIANCE", "TCS", "TATAMOTORS"]);

export const InvestigationHeader: React.FC<InvestigationHeaderProps> = ({
  investigation,
  ticker,
  liveQuery,
  searchError,
  loading,
  onSearchChange,
  onSearchSubmit,
  onSelectTicker,
  onOpenExportModal,
  onToggleDrawer,
  rejectedCount,
  verifiedCount,
  totalCount,
}) => {
  const isIndian = INDIAN_TICKERS.has(ticker.toUpperCase());
  const dataSourceLabel = isIndian
    ? "BSE Primary Audited"
    : investigation?.isLiveMode
    ? "SEC EDGAR 10-K Live"
    : "SEC Curated 10-K Repo";

  const dataSourceSubtext = isIndian
    ? "Consolidated audited financials in INR from BSE primary regulatory filings"
    : investigation?.isLiveMode
    ? "Live XBRL extraction directly from data.sec.gov with sub-second rate-limiting"
    : "Curated audited 10-K filings with deterministic calculation grounding";

  return (
    <>
      <header className="masthead">
        <div className="brand-wrapper">
          <div className="brand-icon">F</div>
          <div>
            <div className="brand">
              Finvestigate
              <span className="brand-badge">SEC Forensic Terminal</span>
            </div>
            <span className="tagline">Deterministic evidence-grounded financial intelligence</span>
          </div>
        </div>

        <div className="masthead-actions">
          <button
            type="button"
            className={`verification-shield-badge ${rejectedCount > 0 ? "stripped" : "clean"}`}
            onClick={onToggleDrawer}
            title="Evidence Gate audit log"
          >
            {rejectedCount > 0 ? <ShieldIcon size={14} /> : <CheckIcon size={14} />}
            <span>
              {rejectedCount > 0
                ? `${rejectedCount} of ${totalCount} claims intercepted by gate`
                : `All cited claims verified (${verifiedCount}/${totalCount})`}
            </span>
          </button>

          <span
            className={`status-pill ${isIndian ? "curated" : investigation?.isLiveMode ? "live" : "curated"}`}
            title={dataSourceSubtext}
          >
            <span className="indicator-dot" />
            {dataSourceLabel}
          </span>

          <button
            type="button"
            className="export-button"
            onClick={onOpenExportModal}
            title="Export full investigation brief"
          >
            <FileTextIcon size={14} />
            <span>Export Dossier</span>
          </button>
        </div>
      </header>

      {/* Primary Ticker Selector & Search Bar */}
      <div className="picker-container">
        <div className="quick-tickers-row" aria-label="Company selection">
          <span className="quick-tickers-label">Primary benchmarks:</span>
          {["NVDA", "AAPL", "MSFT", "RELIANCE", "TCS"].map((sym) => (
            <button
              key={sym}
              type="button"
              className={`ticker-chip ${ticker === sym ? "selected" : ""}`}
              onClick={() => onSelectTicker(sym)}
              disabled={loading}
            >
              <strong>{sym}</strong>
              <span title={INDIAN_TICKERS.has(sym) ? "Curated Primary-Source Annual Report Data (Ind AS)" : "Audited SEC EDGAR 10-K"}>
                {INDIAN_TICKERS.has(sym) ? "BSE" : "10-K"}
              </span>
            </button>
          ))}
        </div>

        <div className="search-and-guide">
          <form className="live-search-form" onSubmit={onSearchSubmit}>
            <div className="input-group">
              <input
                type="text"
                className={`live-input ${searchError ? "input-error" : ""}`}
                placeholder="Search SEC ticker or CIK (e.g. INTC, TSLA)..."
                value={liveQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                disabled={loading}
              />
              {searchError && <span className="field-error">{searchError}</span>}
            </div>
            <button type="submit" className="live-button" disabled={loading}>
              {loading ? "Ingesting..." : "Investigate"}
            </button>
          </form>
        </div>
      </div>

      <div className="provenance-bar">
        <span>
          <strong>Data Provenance:</strong> {dataSourceSubtext}
        </span>
        <span className="source-spec">
          {isIndian ? "Ind AS Consolidated" : "SEC EDGAR US GAAP"}
        </span>
      </div>
    </>
  );
};
