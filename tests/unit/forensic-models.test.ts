import { describe, expect, it } from "vitest";
import type { Fact, Period } from "../../src/shared/types/index.js";
import {
  computeBeneishMScore,
  computeAltmanZScore,
  computeSloanAccruals,
  computePiotroskiFScore,
  runForensicSuite,
} from "../../src/server/domain/forensic-models.js";

describe("Forensic Quantitative Models Suite", () => {
  const pCurrent: Period = { label: "FY2025", endDate: "2025-12-31", kind: "annual" };
  const pPrior: Period = { label: "FY2024", endDate: "2024-12-31", kind: "annual" };

  const createFact = (
    metric: string,
    period: Period,
    value: number,
    company = "TESTCO"
  ): Fact => ({
    factId: `${company}-${metric.toUpperCase()}-${period.label}`,
    company,
    metric,
    period,
    value,
    unit: "USD",
    source: "Audited 10-K",
    sourceUrl: "https://www.sec.gov",
    type: "FACT",
    availability: "reported",
  });

  describe("Beneish M-Score (Earnings Manipulation)", () => {
    it("computes a safe Beneish M-Score (M <= -1.78) for a healthy company", () => {
      const facts: Fact[] = [
        createFact("revenue", pCurrent, 100_000_000),
        createFact("revenue", pPrior, 90_000_000),
        createFact("receivables", pCurrent, 10_000_000),
        createFact("receivables", pPrior, 9_500_000),
        createFact("netIncome", pCurrent, 15_000_000),
        createFact("operatingCashFlow", pCurrent, 20_000_000),
        createFact("grossProfit", pCurrent, 40_000_000),
        createFact("grossProfit", pPrior, 36_000_000),
        createFact("assets", pCurrent, 120_000_000),
        createFact("assets", pPrior, 110_000_000),
      ];

      const res = computeBeneishMScore("TESTCO", facts, pCurrent, pPrior);
      expect(res.score).not.toBeNull();
      expect(res.score!).toBeLessThan(-1.78);
      expect(res.interpretation).toBe("LOW_MANIPULATION_RISK");
      expect(res.variables.dsri.value).toBeCloseTo(0.95, 1);
    });

    it("flags high manipulation risk (M > -1.78) when receivables surge, accruals spike, and margins deteriorate", () => {
      const facts: Fact[] = [
        createFact("revenue", pCurrent, 150_000_000),
        createFact("revenue", pPrior, 100_000_000),
        // Receivables exploded 3x faster than revenue
        createFact("receivables", pCurrent, 60_000_000),
        createFact("receivables", pPrior, 15_000_000),
        // Huge net income with negligible cash flow (aggressive accruals)
        createFact("netIncome", pCurrent, 45_000_000),
        createFact("operatingCashFlow", pCurrent, 2_000_000),
        createFact("grossProfit", pCurrent, 30_000_000),
        createFact("grossProfit", pPrior, 45_000_000),
        createFact("assets", pCurrent, 100_000_000),
        createFact("assets", pPrior, 80_000_000),
      ];

      const res = computeBeneishMScore("TESTCO", facts, pCurrent, pPrior);
      expect(res.score).not.toBeNull();
      expect(res.score!).toBeGreaterThan(-1.78);
      expect(res.interpretation).toBe("HIGH_MANIPULATION_RISK");
      expect(res.variables.dsri.flag).toBe(true);
      expect(res.variables.tata.flag).toBe(true);
    });
  });

  describe("Altman Z-Score (Solvency & Bankruptcy Risk)", () => {
    it("classifies strong solvent balance sheet as SAFE (Z > 2.99)", () => {
      const facts: Fact[] = [
        createFact("revenue", pCurrent, 100_000_000),
        createFact("assets", pCurrent, 100_000_000),
        createFact("currentAssets", pCurrent, 60_000_000),
        createFact("currentLiabilities", pCurrent, 20_000_000),
        createFact("liabilities", pCurrent, 30_000_000),
        createFact("stockholdersEquity", pCurrent, 70_000_000),
        createFact("ebit", pCurrent, 25_000_000),
        createFact("netIncome", pCurrent, 20_000_000),
      ];

      const res = computeAltmanZScore("TESTCO", facts, pCurrent);
      expect(res.score).not.toBeNull();
      expect(res.score!).toBeGreaterThan(2.99);
      expect(res.classification).toBe("SAFE");
      expect(res.components.x1.value).toBe(0.4);
    });

    it("classifies heavily indebted, loss-making company as DISTRESS (Z < 1.81)", () => {
      const facts: Fact[] = [
        createFact("revenue", pCurrent, 50_000_000),
        createFact("assets", pCurrent, 100_000_000),
        createFact("currentAssets", pCurrent, 10_000_000),
        createFact("currentLiabilities", pCurrent, 35_000_000),
        createFact("liabilities", pCurrent, 95_000_000),
        createFact("stockholdersEquity", pCurrent, 5_000_000),
        createFact("ebit", pCurrent, -15_000_000),
        createFact("netIncome", pCurrent, -20_000_000),
      ];

      const res = computeAltmanZScore("TESTCO", facts, pCurrent);
      expect(res.score).not.toBeNull();
      expect(res.score!).toBeLessThan(1.81);
      expect(res.classification).toBe("DISTRESS");
    });
  });

  describe("Sloan Accrual Ratio (Earnings Quality)", () => {
    it("flags aggressive accruals when Net Income far exceeds OCF", () => {
      const facts: Fact[] = [
        createFact("netIncome", pCurrent, 50_000_000),
        createFact("operatingCashFlow", pCurrent, 10_000_000),
        createFact("assets", pCurrent, 200_000_000),
      ];

      const res = computeSloanAccruals("TESTCO", facts, pCurrent);
      expect(res.ratio).toBe(0.20);
      expect(res.interpretation).toBe("AGGRESSIVE_ACCRUALS");
    });

    it("identifies high cash realization when OCF exceeds Net Income", () => {
      const facts: Fact[] = [
        createFact("netIncome", pCurrent, 20_000_000),
        createFact("operatingCashFlow", pCurrent, 60_000_000),
        createFact("assets", pCurrent, 200_000_000),
      ];

      const res = computeSloanAccruals("TESTCO", facts, pCurrent);
      expect(res.ratio).toBe(-0.20);
      expect(res.interpretation).toBe("HIGH_CASH_REALIZATION");
    });
  });

  describe("Piotroski F-Score (9-Point Fundamental Test)", () => {
    it("awards high score (STRONG >= 8) to profitable, liquid, expanding firm", () => {
      const facts: Fact[] = [
        createFact("revenue", pCurrent, 120_000_000),
        createFact("revenue", pPrior, 100_000_000),
        createFact("netIncome", pCurrent, 25_000_000),
        createFact("netIncome", pPrior, 20_000_000),
        createFact("operatingCashFlow", pCurrent, 30_000_000),
        createFact("assets", pCurrent, 100_000_000),
        createFact("assets", pPrior, 95_000_000),
        createFact("currentAssets", pCurrent, 40_000_000),
        createFact("currentLiabilities", pCurrent, 20_000_000),
        createFact("currentAssets", pPrior, 35_000_000),
        createFact("currentLiabilities", pPrior, 20_000_000),
        createFact("grossProfit", pCurrent, 60_000_000),
        createFact("grossProfit", pPrior, 48_000_000),
        createFact("longTermDebt", pCurrent, 10_000_000),
        createFact("longTermDebt", pPrior, 12_000_000),
        createFact("shares", pCurrent, 10_000_000),
        createFact("shares", pPrior, 10_000_000),
      ];

      const res = computePiotroskiFScore("TESTCO", facts, pCurrent, pPrior);
      expect(res.score).toBeGreaterThanOrEqual(8);
      expect(res.classification).toBe("STRONG");
    });
  });

  describe("runForensicSuite Pipeline Integration", () => {
    it("creates verifiable calculations and generates findings for distress or manipulation", () => {
      const facts: Fact[] = [
        createFact("revenue", pCurrent, 150_000_000),
        createFact("revenue", pPrior, 100_000_000),
        createFact("receivables", pCurrent, 60_000_000),
        createFact("receivables", pPrior, 15_000_000),
        createFact("netIncome", pCurrent, 45_000_000),
        createFact("operatingCashFlow", pCurrent, 2_000_000),
        createFact("assets", pCurrent, 100_000_000),
        createFact("assets", pPrior, 80_000_000),
        createFact("liabilities", pCurrent, 90_000_000),
        createFact("stockholdersEquity", pCurrent, 10_000_000),
      ];

      const suite = runForensicSuite("TESTCO", facts, [pCurrent, pPrior]);
      expect(suite.calculations.length).toBeGreaterThanOrEqual(3);

      const beneishCalc = suite.calculations.find((c) => c.metric === "beneish_m_score");
      expect(beneishCalc).toBeDefined();
      expect(beneishCalc?.calcId).toBe("CALC-TESTCO-beneish-m-score-FY2025");

      const altmanCalc = suite.calculations.find((c) => c.metric === "altman_z_score");
      expect(altmanCalc).toBeDefined();

      // Because Beneish was high risk, a finding should have been generated
      const beneishFinding = suite.findings.find((f) => f.category === "earnings_manipulation_risk");
      expect(beneishFinding).toBeDefined();
      expect(beneishFinding?.calculationRefs).toContain("CALC-TESTCO-beneish-m-score-FY2025");
    });
  });
});
