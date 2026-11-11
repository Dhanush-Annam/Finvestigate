import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

import type { InvestigationData, VerificationScoreboardData } from "./types/index.js";
import { InvestigationHeader } from "./components/InvestigationHeader.js";
import { ExecutiveOverviewTab } from "./components/ExecutiveOverviewTab.js";
import { ForensicRadarTab } from "./components/ForensicRadarTab.js";
import { DebatePanel } from "./components/DebatePanel.js";
import { EvidenceLineage } from "./components/EvidenceLineage.js";
import { ClaimCheckerPanel } from "./components/ClaimCheckerPanel.js";
import { AttackCenter } from "./components/AttackCenter.js";
import { TrustScoreboard } from "./components/TrustScoreboard.js";
import { RejectedDrawer } from "./components/RejectedDrawer.js";
import { DossierModal } from "./components/DossierModal.js";
import { ShieldIcon, AlertTriangleIcon, ActivityIcon, FileTextIcon, TerminalIcon } from "./components/Icons.js";

type TabId = "overview" | "radar" | "debate" | "lineage" | "compliance";

function parseUrlRoute(): { ticker: string; tab: TabId } {
  const path = window.location.pathname;
  const hash = window.location.hash.replace(/^#/, "");

  // Match /company/:ticker/:tab or /company/:ticker
  const match = path.match(/^\/company\/([^/]+)(?:\/([^/]+))?/) || hash.match(/^\/company\/([^/]+)(?:\/([^/]+))?/);
  if (match) {
    const rawTicker = match[1]?.toUpperCase() || "NVDA";
    const rawTab = (match[2]?.toLowerCase() as TabId) || "overview";
    const validTabs: TabId[] = ["overview", "radar", "debate", "lineage", "compliance"];
    const tab = validTabs.includes(rawTab) ? rawTab : "overview";
    return { ticker: rawTicker, tab };
  }
  return { ticker: "NVDA", tab: "overview" };
}

function App() {
  const initial = parseUrlRoute();
  const [ticker, setTicker] = useState(initial.ticker);
  const [activeTab, setActiveTab] = useState<TabId>(initial.tab);

  const [investigation, setInvestigation] = useState<InvestigationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalcId, setSelectedCalcId] = useState<string | null>(null);
  const [liveQuery, setLiveQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamProgress, setStreamProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);

  const [showRejectedDrawer, setShowRejectedDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Scoreboard State
  const [scoreboardScope, setScoreboardScope] = useState<"company" | "all">("company");
  const [companyScoreboard, setCompanyScoreboard] = useState<VerificationScoreboardData | null>(null);
  const [allScoreboard, setAllScoreboard] = useState<VerificationScoreboardData | null>(null);

  const evidencePanelRef = useRef<HTMLDivElement>(null);

  // Sync URL on state changes
  const updateUrlRoute = (newTicker: string, newTab: TabId) => {
    const targetUrl = `/company/${encodeURIComponent(newTicker)}/${newTab}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ ticker: newTicker, tab: newTab }, "", targetUrl);
    }
    document.title = `FINVESTIGATE — ${newTicker} [${newTab.toUpperCase()}]`;
  };

  // Handle browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = parseUrlRoute();
      setTicker(route.ticker);
      setActiveTab(route.tab);
      fetchCompanyData(route.ticker);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const fetchScoreboardData = (targetTicker?: string) => {
    const symbolToFetch = targetTicker ?? ticker;
    if (symbolToFetch) {
      fetch(`/api/verification-stats?ticker=${encodeURIComponent(symbolToFetch)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => data && setCompanyScoreboard(data))
        .catch(() => {});
    }

    fetch(`/api/verification-stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setAllScoreboard(data))
      .catch(() => {});
  };

  const fetchCompanyData = (targetTicker: string) => {
    setInvestigation(null);
    setError(null);
    setSearchError(null);
    setLoading(true);
    setStreamProgress({ stage: "connecting", progress: 10, message: `Connecting to financial stream for ${targetTicker}...` });

    // Try Server-Sent Events (SSE) live streaming endpoint first
    if (typeof window.EventSource !== "undefined") {
      let eventSource: EventSource | null = null;
      let completed = false;

      try {
        eventSource = new EventSource(`/api/investigations/${encodeURIComponent(targetTicker)}/stream`);

        eventSource.addEventListener("progress", (event) => {
          try {
            const data = JSON.parse(event.data);
            setStreamProgress(data);
          } catch {}
        });

        eventSource.addEventListener("complete", (event) => {
          completed = true;
          eventSource?.close();
          try {
            const data = JSON.parse(event.data) as InvestigationData;
            setInvestigation(data);
            setSelectedCalcId(data.calculations[0]?.calcId ?? null);
            setTicker(data.company);
            fetchScoreboardData(data.company);
          } catch (e) {
            setError("Failed to parse investigation data.");
          } finally {
            setLoading(false);
            setStreamProgress(null);
          }
        });

        eventSource.addEventListener("error", () => {
          if (!completed) {
            eventSource?.close();
            // Fall back to standard REST API fetch
            fetchStandardRest(targetTicker);
          }
        });

        return;
      } catch {
        // Fall back to REST if EventSource creation fails
      }
    }

    fetchStandardRest(targetTicker);
  };

  const fetchStandardRest = (targetTicker: string) => {
    fetch(`/api/investigations/${encodeURIComponent(targetTicker)}`)
      .then(async (response) => {
        if (response.ok) return response.json() as Promise<InvestigationData>;
        const errJson = await response.json().catch(() => ({}));
        return Promise.reject(
          new Error(
            errJson.error ||
              `Unable to retrieve regulatory filings for "${targetTicker}". Try NVDA, AAPL, MSFT, RELIANCE, TCS, or INFY.`
          )
        );
      })
      .then((data) => {
        setInvestigation(data);
        setSelectedCalcId(data.calculations[0]?.calcId ?? null);
        setTicker(data.company);
        fetchScoreboardData(data.company);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load investigation.");
      })
      .finally(() => {
        setLoading(false);
        setStreamProgress(null);
      });
  };

  useEffect(() => {
    fetchCompanyData(ticker);
    fetchScoreboardData(ticker);
    updateUrlRoute(ticker, activeTab);
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    updateUrlRoute(ticker, tab);
  };

  const handleSelectTicker = (newTicker: string) => {
    const clean = newTicker.trim().toUpperCase();
    setTicker(clean);
    updateUrlRoute(clean, activeTab);
    fetchCompanyData(clean);
  };

  const handleCustomSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!liveQuery.trim()) {
      setSearchError("Please enter a ticker symbol or SEC CIK (e.g. INFY, INTC, TSLA, AAPL)");
      return;
    }
    setSearchError(null);
    const cleanTicker = liveQuery.trim().toUpperCase();
    setLiveQuery("");
    handleSelectTicker(cleanTicker);
  };

  const inspectCalculation = (calcId: string | null) => {
    setSelectedCalcId(calcId);
    handleTabChange("lineage");
    setTimeout(() => {
      if (evidencePanelRef.current) {
        evidencePanelRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  };

  // Compute counts strictly from production filing evidence
  const activeStats = scoreboardScope === "company" ? companyScoreboard : allScoreboard;
  const prodStats = activeStats?.production ?? activeStats;
  const verifiedCount = prodStats?.verifiedClaims ?? investigation?.verificationStats?.verifiedClaims ?? 0;
  const rejectedCount = prodStats?.rejectedClaims ?? investigation?.verificationStats?.rejectedClaims ?? 0;
  const totalCount = prodStats?.totalClaims ?? investigation?.verificationStats?.totalClaims ?? (verifiedCount + rejectedCount);

  const divergenceCount = investigation?.findings.length ?? 0;
  const divergenceAlert = divergenceCount > 0;

  return (
    <div className="app-shell institutional-terminal">
      {/* 1. Header with Universal Autocomplete & Ticker Benchmark Row */}
      <InvestigationHeader
        investigation={investigation}
        ticker={ticker}
        liveQuery={liveQuery}
        searchError={searchError}
        loading={loading}
        streamProgress={streamProgress}
        onSearchChange={setLiveQuery}
        onSearchSubmit={handleCustomSearch}
        onSelectTicker={handleSelectTicker}
        onOpenExportModal={() => setShowExportModal(true)}
        onToggleDrawer={() => setShowRejectedDrawer(!showRejectedDrawer)}
        rejectedCount={rejectedCount}
        verifiedCount={verifiedCount}
        totalCount={totalCount}
      />

      {/* Rejection Audit Log Drawer */}
      <RejectedDrawer
        isOpen={showRejectedDrawer}
        onClose={() => setShowRejectedDrawer(false)}
        rejectedItems={investigation?.verificationStats?.rejectedItems ?? []}
        verifiedCount={verifiedCount}
      />

      {/* Institutional Tab Navigation Bar */}
      <nav className="workstation-tab-bar" aria-label="Terminal Workspaces">
        <button
          type="button"
          className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => handleTabChange("overview")}
        >
          <FileTextIcon size={14} />
          <span>Executive Overview</span>
        </button>

        <button
          type="button"
          className={`tab-button ${activeTab === "radar" ? "active" : ""}`}
          onClick={() => handleTabChange("radar")}
        >
          <ActivityIcon size={14} />
          <span>Forensic Radar</span>
          {divergenceCount > 0 && <span className="tab-pill-counter">{divergenceCount}</span>}
        </button>

        <button
          type="button"
          className={`tab-button ${activeTab === "debate" ? "active" : ""}`}
          onClick={() => handleTabChange("debate")}
        >
          <ShieldIcon size={14} />
          <span>Courtroom AI Debate</span>
        </button>

        <button
          type="button"
          className={`tab-button ${activeTab === "lineage" ? "active" : ""}`}
          onClick={() => handleTabChange("lineage")}
        >
          <TerminalIcon size={14} />
          <span>Evidence Lineage DAG</span>
        </button>

        <button
          type="button"
          className={`tab-button compliance-tab-button ${activeTab === "compliance" ? "active" : ""}`}
          onClick={() => handleTabChange("compliance")}
        >
          <AlertTriangleIcon size={14} />
          <span>Compliance &amp; Red-Team</span>
        </button>
      </nav>

      {/* Error Fallback Banner */}
      {error && (
        <section className="error-banner">
          <h3>Filing Ingestion Notice</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button type="button" onClick={() => handleSelectTicker("NVDA")}>NVIDIA (NVDA)</button>
            <button type="button" onClick={() => handleSelectTicker("AAPL")}>Apple (AAPL)</button>
            <button type="button" onClick={() => handleSelectTicker("INFY")}>Infosys (INFY)</button>
            <button type="button" onClick={() => handleSelectTicker("RELIANCE")}>Reliance (RELIANCE)</button>
          </div>
        </section>
      )}

      {/* Active Tab Content Area */}
      {investigation && (
        <main className="workstation-viewport">
          {activeTab === "overview" && (
            <ExecutiveOverviewTab
              investigation={investigation}
              activeStats={activeStats}
              scoreboardScope={scoreboardScope}
              onScopeChange={setScoreboardScope}
              onInspectCalculation={inspectCalculation}
              onNavigateToTab={handleTabChange}
            />
          )}

          {activeTab === "radar" && (
            <ForensicRadarTab
              investigation={investigation}
              onInspectCalculation={inspectCalculation}
            />
          )}

          {activeTab === "debate" && investigation.debate && (
            <div className="tab-pane debate-tab-pane">
              <DebatePanel
                debate={investigation.debate}
                company={investigation.company}
                onInspectCalculation={inspectCalculation}
              />
            </div>
          )}

          {activeTab === "lineage" && (
            <div className="tab-pane lineage-tab-pane">
              <EvidenceLineage
                company={investigation.company}
                calculations={investigation.calculations}
                facts={investigation.facts}
                selectedCalcId={selectedCalcId}
                onSelectCalcId={setSelectedCalcId}
                innerRef={evidencePanelRef}
              />
              <ClaimCheckerPanel claimChecks={investigation.claimChecks} />
            </div>
          )}

          {activeTab === "compliance" && (
            <div className="tab-pane compliance-tab-pane">
              <div className="compliance-hero-card">
                <div className="compliance-badge">
                  <ShieldIcon size={14} /> Auditor Console &amp; Adversarial Injection Testing
                </div>
                <h3>Adversarial Integrity Enforcement Console</h3>
                <p>
                  Demonstrates how Finvestigate intercepts adversarial prompt injections, hallucinated numeric claims, cross-company fact leakage, and sign-flip manipulations before they can reach the analytical file.
                </p>
              </div>

              <AttackCenter
                ticker={investigation.company}
                onAttackCompleted={() => fetchScoreboardData(investigation.company)}
              />

              <TrustScoreboard
                stats={activeStats}
                scope={scoreboardScope}
                ticker={investigation.company}
                onScopeChange={setScoreboardScope}
              />
            </div>
          )}

          {/* Printable Report Section (Rendered strictly during window.print()) */}
          <div className="printable-audit-report-container">
            <header className="print-report-header">
              <h1>FINVESTIGATE — Institutional Forensic Audit Dossier</h1>
              <p>Company: {investigation.displayName} ({investigation.company}) | CIK / Identifier: {investigation.cik}</p>
              <p>Generated: {new Date().toISOString()} | Grounding Standard: 100% Audited Regulatory Disclosures</p>
            </header>

            <ExecutiveOverviewTab
              investigation={investigation}
              activeStats={activeStats}
              scoreboardScope="company"
              onScopeChange={() => {}}
            />

            <ForensicRadarTab
              investigation={investigation}
            />

            {investigation.debate && (
              <DebatePanel
                debate={investigation.debate}
                company={investigation.company}
                onInspectCalculation={inspectCalculation}
              />
            )}
          </div>
        </main>
      )}

      {/* Export Committee Dossier Modal */}
      <DossierModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        investigation={investigation}
        divergenceAlert={divergenceAlert}
        verifiedCount={verifiedCount}
        rejectedCount={rejectedCount}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
