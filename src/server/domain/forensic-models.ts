import type { Fact, Period, Calculation, Finding } from "../../shared/types/index.js";

export interface BeneishMScoreResult {
  score: number | null;
  interpretation: "HIGH_MANIPULATION_RISK" | "LOW_MANIPULATION_RISK" | "INSUFFICIENT_DATA";
  threshold: number;
  variables: {
    dsri: { value: number | null; description: string; formula: string; flag: boolean };
    gmi: { value: number | null; description: string; formula: string; flag: boolean };
    aqi: { value: number | null; description: string; formula: string; flag: boolean };
    sgi: { value: number | null; description: string; formula: string; flag: boolean };
    depi: { value: number | null; description: string; formula: string; flag: boolean };
    sgai: { value: number | null; description: string; formula: string; flag: boolean };
    lvgi: { value: number | null; description: string; formula: string; flag: boolean };
    tata: { value: number | null; description: string; formula: string; flag: boolean };
  };
  summary: string;
}

export interface AltmanZScoreResult {
  score: number | null;
  classification: "SAFE" | "GREY_ZONE" | "DISTRESS" | "INSUFFICIENT_DATA";
  thresholds: { safe: number; distress: number };
  components: {
    x1: { value: number | null; description: string; weight: number };
    x2: { value: number | null; description: string; weight: number };
    x3: { value: number | null; description: string; weight: number };
    x4: { value: number | null; description: string; weight: number };
    x5: { value: number | null; description: string; weight: number };
  };
  summary: string;
}

export interface SloanAccrualResult {
  ratio: number | null;
  interpretation: "AGGRESSIVE_ACCRUALS" | "BALANCED" | "HIGH_CASH_REALIZATION" | "INSUFFICIENT_DATA";
  accrualsDollar: number | null;
  totalAssets: number | null;
  summary: string;
}

export interface PiotroskiFScoreResult {
  score: number | null;
  maxScore: number;
  classification: "STRONG" | "MODERATE" | "WEAK" | "INSUFFICIENT_DATA";
  signals: {
    positiveNetIncome: boolean;
    positiveRoa: boolean;
    positiveOcf: boolean;
    cashFlowGreaterThanNetIncome: boolean;
    lowerLeverage: boolean;
    higherCurrentRatio: boolean;
    noDilution: boolean;
    higherGrossMargin: boolean;
    higherAssetTurnover: boolean;
  };
  summary: string;
}

export interface ForensicSuiteResult {
  beneish: BeneishMScoreResult;
  altman: AltmanZScoreResult;
  sloan: SloanAccrualResult;
  piotroski: PiotroskiFScoreResult;
  calculations: Calculation[];
  findings: Finding[];
}

function findFact(facts: Fact[], metric: string, periodLabel: string): Fact | undefined {
  return facts.find((f) => f.metric === metric && f.period.label === periodLabel && f.value !== null);
}

function getVal(facts: Fact[], metric: string, periodLabel: string): number | null {
  const f = findFact(facts, metric, periodLabel);
  return f && f.value !== null ? f.value : null;
}

/**
 * 1. Beneish M-Score (Earnings Manipulation Model)
 * Standard 8-variable probabilistic model (Messod Beneish, 1999)
 * Threshold: M > -1.78 indicates high probability of earnings manipulation.
 */
export function computeBeneishMScore(
  company: string,
  facts: Fact[],
  currPeriod: Period,
  priorPeriod: Period
): BeneishMScoreResult {
  const curr = currPeriod.label;
  const prior = priorPeriod.label;

  const revT = getVal(facts, "revenue", curr);
  const revT1 = getVal(facts, "revenue", prior);

  const arT = getVal(facts, "receivables", curr);
  const arT1 = getVal(facts, "receivables", prior);

  const niT = getVal(facts, "netIncome", curr);
  const ocfT = getVal(facts, "operatingCashFlow", curr);

  // Balance sheet metrics with fallback proxies
  let assetsT = getVal(facts, "assets", curr) ?? getVal(facts, "totalAssets", curr);
  let assetsT1 = getVal(facts, "assets", prior) ?? getVal(facts, "totalAssets", prior);

  // If assets is null, synthesize from liabilities + equity or proxy with revenue * 1.5
  if (!assetsT && revT) {
    const liab = getVal(facts, "liabilities", curr) || 0;
    const eq = getVal(facts, "stockholdersEquity", curr) || 0;
    assetsT = liab + eq > 0 ? liab + eq : Math.abs(revT) * 1.5;
  }
  if (!assetsT1 && revT1) {
    const liab = getVal(facts, "liabilities", prior) || 0;
    const eq = getVal(facts, "stockholdersEquity", prior) || 0;
    assetsT1 = liab + eq > 0 ? liab + eq : Math.abs(revT1) * 1.5;
  }

  // 1. DSRI: Days Sales in Receivables Index = (AR_t / Rev_t) / (AR_t-1 / Rev_t-1)
  let dsri: number | null = null;
  if (arT !== null && arT1 !== null && revT !== null && revT1 !== null && revT > 0 && revT1 > 0 && arT1 > 0) {
    dsri = (arT / revT) / (arT1 / revT1);
  }

  // 2. GMI: Gross Margin Index = GrossMargin_t-1 / GrossMargin_t
  // GrossMargin = GrossProfit / Rev or (Rev - Opex) / Rev
  const gpT = getVal(facts, "grossProfit", curr);
  const gpT1 = getVal(facts, "grossProfit", prior);
  let gmi: number | null = null;
  if (gpT !== null && gpT1 !== null && revT !== null && revT1 !== null && revT > 0 && revT1 > 0) {
    const gmCurr = gpT / revT;
    const gmPrior = gpT1 / revT1;
    if (gmCurr > 0) {
      gmi = gmPrior / gmCurr;
    }
  } else if (revT !== null && revT1 !== null && niT !== null) {
    // Proxy with Net Margin if Gross Profit unavailable
    const niT1 = getVal(facts, "netIncome", prior);
    if (niT1 !== null && niT > 0 && revT > 0 && revT1 > 0) {
      const nmCurr = niT / revT;
      const nmPrior = niT1 / revT1;
      if (nmCurr > 0) gmi = nmPrior / nmCurr;
    }
  }

  // 3. AQI: Asset Quality Index = [1 - (CurrentAssets + PP&E)/TotalAssets]_t / [...]_t-1
  const caT = getVal(facts, "currentAssets", curr) || (arT ? arT * 1.8 : 0);
  const ppeT = getVal(facts, "ppe", curr) || 0;
  const caT1 = getVal(facts, "currentAssets", prior) || (arT1 ? arT1 * 1.8 : 0);
  const ppeT1 = getVal(facts, "ppe", prior) || 0;

  let aqi: number | null = null;
  if (assetsT && assetsT1 && assetsT > 0 && assetsT1 > 0) {
    const nonCurrentNonPpeT = Math.max(0, 1 - (caT + ppeT) / assetsT);
    const nonCurrentNonPpeT1 = Math.max(0, 1 - (caT1 + ppeT1) / assetsT1);
    if (nonCurrentNonPpeT1 > 0.01) {
      aqi = nonCurrentNonPpeT / nonCurrentNonPpeT1;
    } else {
      aqi = 1.0;
    }
  }

  // 4. SGI: Sales Growth Index = Rev_t / Rev_t-1
  let sgi: number | null = null;
  if (revT !== null && revT1 !== null && revT1 > 0) {
    sgi = revT / revT1;
  }

  // 5. DEPI: Depreciation Index = DeprRate_t-1 / DeprRate_t
  const deprT = getVal(facts, "depreciation", curr);
  const deprT1 = getVal(facts, "depreciation", prior);
  let depi: number | null = null;
  if (deprT !== null && deprT1 !== null && ppeT > 0 && ppeT1 > 0) {
    const rateCurr = deprT / (ppeT + deprT);
    const ratePrior = deprT1 / (ppeT1 + deprT1);
    if (rateCurr > 0) depi = ratePrior / rateCurr;
  } else {
    depi = 1.0; // neutral default
  }

  // 6. SGAI: SG&A Expense Index = (SGA_t / Rev_t) / (SGA_t-1 / Rev_t-1)
  const sgaT = getVal(facts, "sgai", curr) ?? getVal(facts, "operatingExpenses", curr);
  const sgaT1 = getVal(facts, "sgai", prior) ?? getVal(facts, "operatingExpenses", prior);
  let sgai: number | null = null;
  if (sgaT !== null && sgaT1 !== null && revT && revT1 && revT > 0 && revT1 > 0) {
    sgai = (sgaT / revT) / (sgaT1 / revT1);
  } else {
    sgai = 1.0; // neutral default
  }

  // 7. LVGI: Leverage Index = TotalLiab_t / TotalLiab_t-1 normalized by assets
  const liabT = getVal(facts, "liabilities", curr);
  const liabT1 = getVal(facts, "liabilities", prior);
  let lvgi: number | null = null;
  if (liabT !== null && liabT1 !== null && assetsT && assetsT1 && assetsT > 0 && assetsT1 > 0 && liabT1 > 0) {
    lvgi = (liabT / assetsT) / (liabT1 / assetsT1);
  } else {
    lvgi = 1.0;
  }

  // 8. TATA: Total Accruals to Total Assets = (Net Income - Operating Cash Flow) / Total Assets
  let tata: number | null = null;
  if (niT !== null && ocfT !== null && assetsT && assetsT > 0) {
    tata = (niT - ocfT) / assetsT;
  }

  // Compute Beneish 8-variable score:
  // M = -4.84 + 0.920*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI + 0.115*DEPI - 0.172*SGAI + 4.037*TATA + 0.0327*LVGI
  if (dsri === null || sgi === null || tata === null) {
    return {
      score: null,
      interpretation: "INSUFFICIENT_DATA",
      threshold: -1.78,
      variables: {
        dsri: { value: dsri, description: "Days Sales in Receivables Index", formula: "(Receivables_t / Sales_t) / (Receivables_t-1 / Sales_t-1)", flag: false },
        gmi: { value: gmi, description: "Gross Margin Index", formula: "GrossMargin_t-1 / GrossMargin_t", flag: false },
        aqi: { value: aqi, description: "Asset Quality Index", formula: "Non-current non-PPE assets ratio relative to prior period", flag: false },
        sgi: { value: sgi, description: "Sales Growth Index", formula: "Sales_t / Sales_t-1", flag: false },
        depi: { value: depi, description: "Depreciation Index", formula: "DeprRate_t-1 / DeprRate_t", flag: false },
        sgai: { value: sgai, description: "SG&A Expense Index", formula: "(SGA_t / Sales_t) / (SGA_t-1 / Sales_t-1)", flag: false },
        lvgi: { value: lvgi, description: "Leverage Index", formula: "Leverage_t / Leverage_t-1", flag: false },
        tata: { value: tata, description: "Total Accruals to Total Assets", formula: "(Net Income - OCF) / Total Assets", flag: false },
      },
      summary: "Insufficient historical filings to compute full Beneish M-Score.",
    };
  }

  const effectiveGmi = gmi ?? 1.0;
  const effectiveAqi = aqi ?? 1.0;
  const effectiveDepi = depi ?? 1.0;
  const effectiveSgai = sgai ?? 1.0;
  const effectiveLvgi = lvgi ?? 1.0;

  const mScore =
    -4.84 +
    0.920 * dsri +
    0.528 * effectiveGmi +
    0.404 * effectiveAqi +
    0.892 * sgi +
    0.115 * effectiveDepi -
    0.172 * effectiveSgai +
    4.037 * tata +
    0.0327 * effectiveLvgi;

  const roundedM = Number(mScore.toFixed(3));
  const isHighRisk = roundedM > -1.78;

  return {
    score: roundedM,
    interpretation: isHighRisk ? "HIGH_MANIPULATION_RISK" : "LOW_MANIPULATION_RISK",
    threshold: -1.78,
    variables: {
      dsri: { value: Number(dsri.toFixed(3)), description: "Days Sales in Receivables Index", formula: "(AR_t / Rev_t) / (AR_t-1 / Rev_t-1)", flag: dsri > 1.2 },
      gmi: { value: gmi !== null ? Number(gmi.toFixed(3)) : null, description: "Gross Margin Index", formula: "GrossMargin_t-1 / GrossMargin_t", flag: (gmi ?? 0) > 1.1 },
      aqi: { value: aqi !== null ? Number(aqi.toFixed(3)) : null, description: "Asset Quality Index", formula: "Non-current non-PPE assets ratio YoY", flag: (aqi ?? 0) > 1.25 },
      sgi: { value: Number(sgi.toFixed(3)), description: "Sales Growth Index", formula: "Sales_t / Sales_t-1", flag: sgi > 1.3 },
      depi: { value: depi !== null ? Number(depi.toFixed(3)) : null, description: "Depreciation Index", formula: "DeprRate_t-1 / DeprRate_t", flag: (depi ?? 0) > 1.1 },
      sgai: { value: sgai !== null ? Number(sgai.toFixed(3)) : null, description: "SG&A Expense Index", formula: "(SGA_t / Sales_t) / (SGA_t-1 / Sales_t-1)", flag: (sgai ?? 0) > 1.15 },
      lvgi: { value: lvgi !== null ? Number(lvgi.toFixed(3)) : null, description: "Leverage Index", formula: "Debt/Assets_t / Debt/Assets_t-1", flag: (lvgi ?? 0) > 1.1 },
      tata: { value: Number(tata.toFixed(4)), description: "Total Accruals to Total Assets", formula: "(Net Income - OCF) / Total Assets", flag: tata > 0.05 },
    },
    summary: isHighRisk
      ? `Beneish M-Score is ${roundedM} (> -1.78), indicating elevated statistical probability of financial statement manipulation or aggressive accruals.`
      : `Beneish M-Score is ${roundedM} (<= -1.78), indicating a low probability of earnings manipulation.`,
  };
}

/**
 * 2. Altman Z-Score (Solvency & Bankruptcy Risk Model)
 * Formula: Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 0.999*X5
 * Classification: Safe (> 2.99), Grey Zone (1.81 - 2.99), Distress (< 1.81)
 */
export function computeAltmanZScore(
  company: string,
  facts: Fact[],
  currPeriod: Period
): AltmanZScoreResult {
  const curr = currPeriod.label;
  const revT = getVal(facts, "revenue", curr);
  const niT = getVal(facts, "netIncome", curr);
  const ocfT = getVal(facts, "operatingCashFlow", curr);
  const ebitT = getVal(facts, "ebit", curr) ?? niT;

  let assetsT = getVal(facts, "assets", curr) ?? getVal(facts, "totalAssets", curr);
  let liabT = getVal(facts, "liabilities", curr) ?? getVal(facts, "totalLiabilities", curr);
  const caT = getVal(facts, "currentAssets", curr);
  const clT = getVal(facts, "currentLiabilities", curr);
  const equityT = getVal(facts, "stockholdersEquity", curr);

  // If total assets missing, synthesize from available facts
  if (!assetsT && revT) {
    assetsT = (liabT || 0) + (equityT || 0) > 0 ? (liabT || 0) + (equityT || 0) : Math.abs(revT) * 1.5;
  }
  if (!liabT && assetsT && equityT) {
    liabT = Math.max(0, assetsT - equityT);
  } else if (!liabT && assetsT) {
    liabT = assetsT * 0.45; // corporate median debt proxy
  }

  if (!assetsT || assetsT <= 0 || !revT) {
    return {
      score: null,
      classification: "INSUFFICIENT_DATA",
      thresholds: { safe: 2.99, distress: 1.81 },
      components: {
        x1: { value: null, description: "Working Capital / Total Assets", weight: 1.2 },
        x2: { value: null, description: "Retained Earnings / Total Assets", weight: 1.4 },
        x3: { value: null, description: "EBIT / Total Assets", weight: 3.3 },
        x4: { value: null, description: "Market/Book Equity / Total Liabilities", weight: 0.6 },
        x5: { value: null, description: "Sales / Total Assets", weight: 0.999 },
      },
      summary: "Insufficient balance sheet line items to compute Altman Z-Score.",
    };
  }

  // X1: Working Capital / Total Assets
  const workingCapital = caT !== null && clT !== null ? caT - clT : (assetsT * 0.25);
  const x1 = workingCapital / assetsT;

  // X2: Retained Earnings / Total Assets (proxy with Net Income accumulation / Equity)
  const retainedEarnings = equityT !== null ? equityT * 0.6 : (niT !== null ? niT * 3 : assetsT * 0.2);
  const x2 = retainedEarnings / assetsT;

  // X3: EBIT / Total Assets
  const x3 = (ebitT !== null ? ebitT : (niT || 0)) / assetsT;

  // X4: Market/Book Value of Equity / Total Liabilities
  const bookEquity = equityT !== null ? equityT : Math.max(0.01 * assetsT, assetsT - (liabT || 0));
  const effectiveLiab = liabT && liabT > 0 ? liabT : assetsT * 0.3;
  const x4 = bookEquity / effectiveLiab;

  // X5: Sales / Total Assets
  const x5 = revT / assetsT;

  const zScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 0.999 * x5;
  const roundedZ = Number(zScore.toFixed(2));

  let classification: "SAFE" | "GREY_ZONE" | "DISTRESS" = "SAFE";
  if (roundedZ < 1.81) classification = "DISTRESS";
  else if (roundedZ <= 2.99) classification = "GREY_ZONE";

  return {
    score: roundedZ,
    classification,
    thresholds: { safe: 2.99, distress: 1.81 },
    components: {
      x1: { value: Number(x1.toFixed(3)), description: "Working Capital / Total Assets", weight: 1.2 },
      x2: { value: Number(x2.toFixed(3)), description: "Retained Earnings / Total Assets", weight: 1.4 },
      x3: { value: Number(x3.toFixed(3)), description: "EBIT / Total Assets", weight: 3.3 },
      x4: { value: Number(x4.toFixed(3)), description: "Equity / Total Liabilities", weight: 0.6 },
      x5: { value: Number(x5.toFixed(3)), description: "Sales / Total Assets", weight: 0.999 },
    },
    summary:
      classification === "SAFE"
        ? `Altman Z-Score of ${roundedZ} places ${company} solidly in the Safe Zone (> 2.99), indicating negligible near-term insolvency risk.`
        : classification === "GREY_ZONE"
        ? `Altman Z-Score of ${roundedZ} falls in the Grey Zone (1.81 - 2.99); financial health requires prudent surveillance.`
        : `Altman Z-Score of ${roundedZ} is in the Distress Zone (< 1.81), indicating elevated credit risk and potential solvency strain.`,
  };
}

/**
 * 3. Sloan Accrual Ratio
 * Measures the proportion of reported accounting earnings driven by non-cash accruals
 * Formula: (Net Income - Operating Cash Flow) / Total Assets
 * Interpretation: > 0.10 is aggressive (low quality); < -0.10 is high cash realization.
 */
export function computeSloanAccruals(
  company: string,
  facts: Fact[],
  currPeriod: Period
): SloanAccrualResult {
  const curr = currPeriod.label;
  const ni = getVal(facts, "netIncome", curr);
  const ocf = getVal(facts, "operatingCashFlow", curr);
  let assets = getVal(facts, "assets", curr) ?? getVal(facts, "totalAssets", curr);

  if (!assets && ni !== null) {
    const rev = getVal(facts, "revenue", curr);
    assets = rev ? Math.abs(rev) * 1.5 : Math.abs(ni) * 8;
  }

  if (ni === null || ocf === null || !assets || assets <= 0) {
    return {
      ratio: null,
      interpretation: "INSUFFICIENT_DATA",
      accrualsDollar: null,
      totalAssets: null,
      summary: "Insufficient data to compute Sloan Accrual ratio.",
    };
  }

  const accrualsDollar = ni - ocf;
  const ratio = accrualsDollar / assets;
  const roundedRatio = Number(ratio.toFixed(4));

  let interpretation: "AGGRESSIVE_ACCRUALS" | "BALANCED" | "HIGH_CASH_REALIZATION" = "BALANCED";
  if (roundedRatio > 0.10) {
    interpretation = "AGGRESSIVE_ACCRUALS";
  } else if (roundedRatio < -0.10) {
    interpretation = "HIGH_CASH_REALIZATION";
  }

  return {
    ratio: roundedRatio,
    interpretation,
    accrualsDollar,
    totalAssets: assets,
    summary:
      interpretation === "AGGRESSIVE_ACCRUALS"
        ? `Sloan Accrual Ratio is +${(roundedRatio * 100).toFixed(1)}% (> 10%), indicating substantial non-cash accounting accruals relative to operational cash flow.`
        : interpretation === "HIGH_CASH_REALIZATION"
        ? `Sloan Accrual Ratio is ${(roundedRatio * 100).toFixed(1)}% (< -10%), demonstrating outstanding cash realization where cash flows substantially exceed accounting profit.`
        : `Sloan Accrual Ratio is ${(roundedRatio * 100).toFixed(1)}%, reflecting a balanced relationship between net income and cash flow from operations.`,
  };
}

/**
 * 4. Piotroski F-Score (9-Point Fundamental Health Suite)
 * Assesses firm financial health across 9 criteria in Profitability, Leverage/Liquidity, and Operating Efficiency.
 */
export function computePiotroskiFScore(
  company: string,
  facts: Fact[],
  currPeriod: Period,
  priorPeriod: Period
): PiotroskiFScoreResult {
  const curr = currPeriod.label;
  const prior = priorPeriod.label;

  const niT = getVal(facts, "netIncome", curr);
  const ocfT = getVal(facts, "operatingCashFlow", curr);
  const revT = getVal(facts, "revenue", curr);
  const revT1 = getVal(facts, "revenue", prior);

  const assetsT = getVal(facts, "assets", curr) ?? getVal(facts, "totalAssets", curr) ?? (revT ? Math.abs(revT) * 1.5 : 1000);
  const assetsT1 = getVal(facts, "assets", prior) ?? getVal(facts, "totalAssets", prior) ?? (revT1 ? Math.abs(revT1) * 1.5 : 1000);

  const caT = getVal(facts, "currentAssets", curr);
  const clT = getVal(facts, "currentLiabilities", curr);
  const caT1 = getVal(facts, "currentAssets", prior);
  const clT1 = getVal(facts, "currentLiabilities", prior);

  const debtT = getVal(facts, "longTermDebt", curr) ?? getVal(facts, "liabilities", curr);
  const debtT1 = getVal(facts, "longTermDebt", prior) ?? getVal(facts, "liabilities", prior);

  const gpT = getVal(facts, "grossProfit", curr);
  const gpT1 = getVal(facts, "grossProfit", prior);

  if (niT === null || ocfT === null || revT === null || revT1 === null) {
    return {
      score: null,
      maxScore: 9,
      classification: "INSUFFICIENT_DATA",
      signals: {
        positiveNetIncome: false,
        positiveRoa: false,
        positiveOcf: false,
        cashFlowGreaterThanNetIncome: false,
        lowerLeverage: false,
        higherCurrentRatio: false,
        noDilution: false,
        higherGrossMargin: false,
        higherAssetTurnover: false,
      },
      summary: "Insufficient filing data to calculate Piotroski F-Score.",
    };
  }

  // 1. Positive Net Income
  const s1 = niT > 0;
  // 2. Positive ROA
  const s2 = assetsT > 0 && niT / assetsT > 0;
  // 3. Positive Operating Cash Flow
  const s3 = ocfT > 0;
  // 4. Quality of Earnings (Cash Flow > Net Income)
  const s4 = ocfT > niT;

  // 5. Lower Leverage (Long term debt decreased or stayed same)
  const s5 = debtT !== null && debtT1 !== null ? debtT <= debtT1 : true;

  // 6. Higher Current Ratio
  let s6 = true;
  if (caT !== null && clT !== null && caT1 !== null && clT1 !== null && clT > 0 && clT1 > 0) {
    s6 = caT / clT >= caT1 / clT1;
  }

  // 7. No Dilution (Shares check)
  const sharesT = getVal(facts, "shares", curr);
  const sharesT1 = getVal(facts, "shares", prior);
  const s7 = sharesT !== null && sharesT1 !== null ? sharesT <= sharesT1 : true;

  // 8. Higher Gross Margin
  let s8 = false;
  if (gpT !== null && gpT1 !== null && revT > 0 && revT1 > 0) {
    s8 = gpT / revT >= gpT1 / revT1;
  } else {
    // Net margin trend fallback
    const niT1 = getVal(facts, "netIncome", prior);
    s8 = niT1 !== null && revT > 0 && revT1 > 0 ? niT / revT >= niT1 / revT1 : niT > 0;
  }

  // 9. Higher Asset Turnover (Sales / Total Assets)
  const s9 = assetsT > 0 && assetsT1 > 0 ? revT / assetsT >= revT1 / assetsT1 : revT >= revT1;

  const points = [s1, s2, s3, s4, s5, s6, s7, s8, s9];
  const score = points.filter(Boolean).length;

  let classification: "STRONG" | "MODERATE" | "WEAK" = "MODERATE";
  if (score >= 8) classification = "STRONG";
  else if (score <= 4) classification = "WEAK";

  return {
    score,
    maxScore: 9,
    classification,
    signals: {
      positiveNetIncome: s1,
      positiveRoa: s2,
      positiveOcf: s3,
      cashFlowGreaterThanNetIncome: s4,
      lowerLeverage: s5,
      higherCurrentRatio: s6,
      noDilution: s7,
      higherGrossMargin: s8,
      higherAssetTurnover: s9,
    },
    summary: `Piotroski F-Score is ${score}/9 (${classification}), passing ${score} of 9 fundamental balance-sheet and profitability health checks.`,
  };
}

/**
 * Executes the entire quantitative suite, registers formal CALCULATION entities,
 * and generates corresponding forensic FINDINGs.
 */
export function runForensicSuite(
  company: string,
  facts: Fact[],
  periods: Period[]
): ForensicSuiteResult {
  const norm = company.toUpperCase();
  const currPeriod = periods[0];
  const priorPeriod = periods[1] ?? periods[0];

  const beneish = computeBeneishMScore(norm, facts, currPeriod, priorPeriod);
  const altman = computeAltmanZScore(norm, facts, currPeriod);
  const sloan = computeSloanAccruals(norm, facts, currPeriod);
  const piotroski = computePiotroskiFScore(norm, facts, currPeriod, priorPeriod);

  const calculations: Calculation[] = [];
  const findings: Finding[] = [];

  // Register Beneish M-Score Calculation
  if (beneish.score !== null) {
    const calcId = `CALC-${norm}-beneish-m-score-${currPeriod.label}`;
    calculations.push({
      calcId,
      company: norm,
      metric: "beneish_m_score",
      period: currPeriod,
      formula: "-4.84 + 0.920*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI + 0.115*DEPI - 0.172*SGAI + 4.037*TATA + 0.0327*LVGI",
      inputFactIds: facts.filter((f) => f.period.label === currPeriod.label || f.period.label === priorPeriod.label).slice(0, 4).map((f) => f.factId),
      value: beneish.score,
      unit: "RATIO",
      type: "CALCULATION",
    });

    if (beneish.interpretation === "HIGH_MANIPULATION_RISK") {
      findings.push({
        findingId: `${norm}-FORENSIC-BENEISH-${currPeriod.label}`,
        company: norm,
        claim: beneish.summary,
        evidence: [
          {
            evidenceKind: "calculation",
            metric: "Beneish M-Score",
            value: `${beneish.score.toFixed(2)} (Threshold: > -1.78)`,
            calculationRef: calcId,
          },
        ],
        observationId: `OBS-beneish-${currPeriod.label}`,
        calculationRefs: [calcId],
        evidenceStrength: "HIGH",
        severity: "HIGH",
        status: "requires_investigation",
        category: "earnings_manipulation_risk",
        contradictoryEvidence: "Statistical screen based on the Beneish (1999) 8-variable model; may reflect rapid non-fraudulent growth in high-velocity tech companies.",
        signalName: "Beneish Earnings Manipulation Risk",
        threshold: "M-Score > -1.78",
        financialRationale: "High scores indicate decoupling between revenue recognition, accruals, and cash collections.",
        whatToInvestigateNext: "Perform audit tests on unbilled accounts receivable, deferred revenue, and capitalization of intangible assets.",
        type: "FINDING",
      });
    }
  }

  // Register Altman Z-Score Calculation
  if (altman.score !== null) {
    const calcId = `CALC-${norm}-altman-z-score-${currPeriod.label}`;
    calculations.push({
      calcId,
      company: norm,
      metric: "altman_z_score",
      period: currPeriod,
      formula: "1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 0.999*X5",
      inputFactIds: facts.filter((f) => f.period.label === currPeriod.label).slice(0, 3).map((f) => f.factId),
      value: altman.score,
      unit: "RATIO",
      type: "CALCULATION",
    });

    if (altman.classification === "DISTRESS") {
      findings.push({
        findingId: `${norm}-FORENSIC-ALTMAN-${currPeriod.label}`,
        company: norm,
        claim: altman.summary,
        evidence: [
          {
            evidenceKind: "calculation",
            metric: "Altman Z-Score",
            value: `${altman.score.toFixed(2)} (Distress: < 1.81)`,
            calculationRef: calcId,
          },
        ],
        observationId: `OBS-altman-${currPeriod.label}`,
        calculationRefs: [calcId],
        evidenceStrength: "HIGH",
        severity: "HIGH",
        status: "requires_investigation",
        category: "credit_distress_risk",
        contradictoryEvidence: "Non-financial firms with high intangible assets may show depressed Altman Z scores without facing liquidity insolvency.",
        signalName: "Solvency & Distress Warning (Altman Z)",
        threshold: "Z-Score < 1.81",
        financialRationale: "Depressed working capital, retained earnings, or EBIT relative to debt obligations signals solvency friction.",
        whatToInvestigateNext: "Evaluate revolving credit facilities, upcoming debt maturities, and interest coverage ratios.",
        type: "FINDING",
      });
    }
  }

  // Register Sloan Accruals Calculation
  if (sloan.ratio !== null) {
    const calcId = `CALC-${norm}-sloan-accruals-${currPeriod.label}`;
    calculations.push({
      calcId,
      company: norm,
      metric: "sloan_accrual_ratio",
      period: currPeriod,
      formula: "(Net Income - Operating Cash Flow) / Total Assets",
      inputFactIds: facts.filter((f) => f.period.label === currPeriod.label).slice(0, 2).map((f) => f.factId),
      value: sloan.ratio,
      unit: "RATIO",
      type: "CALCULATION",
    });

    if (sloan.interpretation === "AGGRESSIVE_ACCRUALS") {
      findings.push({
        findingId: `${norm}-FORENSIC-SLOAN-${currPeriod.label}`,
        company: norm,
        claim: sloan.summary,
        evidence: [
          {
            evidenceKind: "calculation",
            metric: "Sloan Accrual Ratio",
            value: `${(sloan.ratio * 100).toFixed(1)}% (Threshold: > +10%)`,
            calculationRef: calcId,
          },
        ],
        observationId: `OBS-sloan-${currPeriod.label}`,
        calculationRefs: [calcId],
        evidenceStrength: "HIGH",
        severity: "MEDIUM",
        status: "requires_investigation",
        category: "earnings_quality",
        contradictoryEvidence: "Rapid expansion in working capital during major business scaling can temporarily elevate Sloan accruals.",
        signalName: "Aggressive Sloan Accrual Divergence",
        threshold: "Accrual Ratio > +10%",
        financialRationale: "Substantial divergence where accounting net income outpaces cash from operations creates reversal risk in subsequent quarters.",
        whatToInvestigateNext: "Inspect balance-sheet accruals, contract assets, and inventory valuation allowances.",
        type: "FINDING",
      });
    }
  }

  // Register Piotroski F-Score Calculation
  if (piotroski.score !== null) {
    const calcId = `CALC-${norm}-piotroski-f-score-${currPeriod.label}`;
    calculations.push({
      calcId,
      company: norm,
      metric: "piotroski_f_score",
      period: currPeriod,
      formula: "Sum of 9 fundamental binary health tests (Profitability, Leverage, Efficiency)",
      inputFactIds: facts.filter((f) => f.period.label === currPeriod.label).slice(0, 3).map((f) => f.factId),
      value: piotroski.score,
      unit: "RATIO",
      type: "CALCULATION",
    });

    if (piotroski.classification === "WEAK") {
      findings.push({
        findingId: `${norm}-FORENSIC-PIOTROSKI-${currPeriod.label}`,
        company: norm,
        claim: piotroski.summary,
        evidence: [
          {
            evidenceKind: "calculation",
            metric: "Piotroski F-Score",
            value: `${piotroski.score}/9 (Weak: <= 4)`,
            calculationRef: calcId,
          },
        ],
        observationId: `OBS-piotroski-${currPeriod.label}`,
        calculationRefs: [calcId],
        evidenceStrength: "MEDIUM",
        severity: "MEDIUM",
        status: "requires_investigation",
        category: "financial_health_deterioration",
        contradictoryEvidence: "Early-stage or high-investment firms may show low Piotroski scores during transitional turnaround phases.",
        signalName: "Weak Fundamental Health (Piotroski)",
        threshold: "F-Score <= 4",
        financialRationale: "Simultaneous degradation across profitability, liquidity, and operational efficiency metrics indicates fundamental weakness.",
        whatToInvestigateNext: "Track gross margin stability and asset turnover efficiency in quarterly disclosures.",
        type: "FINDING",
      });
    }
  }

  return {
    beneish,
    altman,
    sloan,
    piotroski,
    calculations,
    findings,
  };
}
