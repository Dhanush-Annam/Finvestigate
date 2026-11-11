import type { Fact, Period } from "../../shared/types/index.js";
import type { Investigation } from "../types/index.js";
import { buildCoreCalculations } from "../domain/calculations.js";
import { detectAnomalies, generateFindingsFromAnomalies } from "../domain/findings.js";
import { runForensicSuite } from "../domain/forensic-models.js";
import { resolveCik } from "../infrastructure/sources/live-cik.js";
import { fetchLiveCompanyFacts } from "../infrastructure/sources/live-edgar.js";
import { isDomesticIndianCompany, fetchDomesticIndianFacts } from "../infrastructure/sources/live-india.js";
import { generateConstrainedAIDebate } from "../infrastructure/llm/orchestrator.js";

export type ProgressCallback = (stage: string, progress: number, message: string) => void;

export async function runFullPipeline(
  ticker: string,
  onProgress?: ProgressCallback
): Promise<Investigation> {
  onProgress?.("ingesting_facts", 15, `Resolving regulatory filing identity for "${ticker}"...`);

  const cikInfo = await resolveCik(ticker);
  if (!cikInfo) {
    throw new Error(`Could not resolve SEC ticker or CIK for "${ticker}". Please verify the symbol or try NVDA / AAPL / INFY / RELIANCE.`);
  }

  onProgress?.("ingesting_facts", 25, `Parsing statutory disclosures for ${cikInfo.displayName} (${cikInfo.ticker})...`);

  let liveFacts: Fact[] | null = null;
  const isIndian = isDomesticIndianCompany(cikInfo.ticker);
  if (isIndian) {
    liveFacts = fetchDomesticIndianFacts(cikInfo.ticker);
  } else {
    liveFacts = await fetchLiveCompanyFacts(cikInfo.cik, cikInfo.ticker, cikInfo.displayName);
  }

  if (!liveFacts || liveFacts.length === 0) {
    throw new Error(`Unable to retrieve verified financial facts for ${cikInfo.displayName} (${cikInfo.ticker}).`);
  }

  const periods: Period[] = [...new Map(liveFacts.map((fact) => [fact.period.label, fact.period])).values()]
    .sort((left, right) => right.endDate.localeCompare(left.endDate));

  if (periods.length < 2) {
    throw new Error(`${cikInfo.displayName} does not have sufficient multi-year filings to compute YoY growth.`);
  }

  onProgress?.("computing_forensics", 40, "Evaluating Beneish M-Score, Altman Z-Score, Sloan Accruals & Piotroski F-Score...");

  const coreCalculations = buildCoreCalculations(cikInfo.ticker, liveFacts, periods[0], periods[1]);
  const forensicSuite = runForensicSuite(cikInfo.ticker, liveFacts, periods);
  const calculations = [...coreCalculations, ...forensicSuite.calculations];
  const anomalies = detectAnomalies(cikInfo.ticker, calculations);
  const anomalyFindings = generateFindingsFromAnomalies(cikInfo.ticker, calculations, anomalies, isIndian);
  const findings = [...anomalyFindings, ...forensicSuite.findings];

  const partialInvestigation: Investigation = {
    company: cikInfo.ticker,
    displayName: cikInfo.displayName,
    cik: cikInfo.cik,
    facts: liveFacts,
    claimChecks: [],
    findings,
    calculations,
    anomalies,
    forensics: forensicSuite,
    isLiveMode: true,
  };

  onProgress?.("debating_bull", 60, "Synthesizing Bull thesis grounded in audited facts...");
  const debate = await generateConstrainedAIDebate(partialInvestigation, (stage, msg) => {
    if (stage === "bull") onProgress?.("debating_bull", 65, msg);
    else if (stage === "bear") onProgress?.("debating_bear", 80, msg);
    else if (stage === "judge") onProgress?.("debating_judge", 90, msg);
  });

  onProgress?.("verifying_citations", 95, "Validating citations through 3-surface verification gate...");

  return {
    ...partialInvestigation,
    debate,
  };
}
