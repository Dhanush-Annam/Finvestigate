import React, { useState, useEffect, useRef } from "react";
import type { InvestigationData } from "../types/index.js";
import { ShieldIcon, CheckIcon, FileTextIcon, SearchIcon, ActivityIcon } from "./Icons.js";

interface SearchResultItem {
  ticker: string;
  displayName: string;
  market: "US" | "IN";
  cik: string;
}

interface StreamProgress {
  stage: string;
  progress: number;
  message: string;
}

interface InvestigationHeaderProps {
  investigation: InvestigationData | null;
  ticker: string;
  liveQuery: string;
  searchError: string | null;
  loading: boolean;
  streamProgress?: StreamProgress | null;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onSelectTicker: (ticker: string) => void;
  onOpenExportModal: () => void;
  onToggleDrawer: () => void;
  rejectedCount: number;
  verifiedCount: number;
  totalCount: number;
}

const INDIAN_TICKERS = new Set([
  "RELIANCE", "TCS", "TATAMOTORS", "INFY", "HDFCBANK", "ICICIBANK", "ITC", "LT", "WIPRO", "BHARTIARTL", "SBIN"
]);

export const InvestigationHeader: React.FC<InvestigationHeaderProps> = ({
  investigation,
  ticker,
  liveQuery,
  searchError,
  loading,
  streamProgress,
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
    ? "Consolidated audited financials in INR from BSE statutory regulatory filings"
    : investigation?.isLiveMode
    ? "Live XBRL extraction directly from data.sec.gov with sub-second rate-limiting"
    : "Curated audited 10-K filings with deterministic calculation grounding";

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch search suggestions
  useEffect(() => {
    if (!liveQuery.trim()) {
      fetch("/api/search?q=")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.results) setSuggestions(data.results);
        })
        .catch(() => {});
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(liveQuery.trim())}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.results) setSuggestions(data.results);
        })
        .catch(() => {});
    }, 150);

    return () => clearTimeout(timer);
  }, [liveQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[highlightedIndex];
      if (selected) {
        onSelectTicker(selected.ticker);
        setShowDropdown(false);
        onSearchChange("");
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <header className="masthead">
        <div className="brand-wrapper">
          <div className="brand-icon">F</div>
          <div>
            <div className="brand">
              Finvestigate
              <span className="brand-badge">Institutional Financial Terminal</span>
            </div>
            <span className="tagline">Deterministic evidence-grounded quantitative intelligence</span>
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
            className="export-button print-dossier-btn"
            onClick={handlePrint}
            title="Print or export high-resolution PDF Dossier"
          >
            <FileTextIcon size={14} />
            <span>Print / PDF Report</span>
          </button>
        </div>
      </header>

      {/* Primary Ticker Selector & Universal Search Bar */}
      <div className="picker-container">
        <div className="quick-tickers-row" aria-label="Company selection">
          <span className="quick-tickers-label">Benchmarks:</span>
          {["NVDA", "AAPL", "MSFT", "RELIANCE", "TCS", "INFY"].map((sym) => (
            <button
              key={sym}
              type="button"
              className={`ticker-chip ${ticker === sym ? "selected" : ""}`}
              onClick={() => onSelectTicker(sym)}
              disabled={loading}
            >
              <strong>{sym}</strong>
              <span title={INDIAN_TICKERS.has(sym) ? "BSE Regulatory Filings" : "Audited SEC EDGAR 10-K"}>
                {INDIAN_TICKERS.has(sym) ? "BSE" : "10-K"}
              </span>
            </button>
          ))}
        </div>

        <div className="search-and-guide" ref={dropdownRef}>
          <form className="live-search-form" onSubmit={onSearchSubmit}>
            <div className="input-group">
              <input
                type="text"
                className={`live-input ${searchError ? "input-error" : ""}`}
                placeholder="Universal ticker autocomplete (e.g. INFY, INTC, TSLA, HDFCBANK)..."
                value={liveQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              {searchError && <span className="field-error">{searchError}</span>}

              {/* Typeahead Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="search-autocomplete-dropdown">
                  <div className="dropdown-header">
                    <span>Equities Directory ({suggestions.length} matches)</span>
                  </div>
                  {suggestions.map((item, idx) => (
                    <div
                      key={item.ticker}
                      className={`dropdown-item ${idx === highlightedIndex ? "highlighted" : ""}`}
                      onClick={() => {
                        onSelectTicker(item.ticker);
                        setShowDropdown(false);
                        onSearchChange("");
                      }}
                    >
                      <div className="item-symbol-col">
                        <strong className="item-ticker">{item.ticker}</strong>
                        <span className={`item-market-badge ${item.market.toLowerCase()}`}>
                          {item.market === "IN" ? "BSE" : "SEC"}
                        </span>
                      </div>
                      <div className="item-name-col">
                        <span className="item-title">{item.displayName}</span>
                        <span className="item-sub">ID: {item.cik}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="live-button" disabled={loading}>
              <SearchIcon size={14} />
              <span>{loading ? "Streaming..." : "Analyze"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Live SSE Streaming Progress Banner */}
      {loading && streamProgress && (
        <div className="streaming-progress-card">
          <div className="progress-info-row">
            <span className="progress-stage-name">
              <ActivityIcon size={14} /> {streamProgress.stage.replace(/_/g, " ").toUpperCase()}
            </span>
            <span className="progress-percentage">{streamProgress.progress}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.max(5, streamProgress.progress)}%` }}
            />
          </div>
          <span className="progress-message">{streamProgress.message}</span>
        </div>
      )}

      <div className="provenance-bar">
        <span>
          <strong>Data Provenance:</strong> {dataSourceSubtext}
        </span>
        <span className="source-spec">
          {isIndian ? "Ind AS Consolidated (BSE Statutory)" : "SEC EDGAR US GAAP (data.sec.gov)"}
        </span>
      </div>
    </>
  );
};
