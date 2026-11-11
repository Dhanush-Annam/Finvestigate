import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { secRateLimiter } from "./live-edgar.js";
import { INDIAN_DOMESTIC_DATA } from "./live-india.js";

type CompanyTickerEntry = {
  cik_str: number;
  ticker: string;
  title: string;
};

interface TickersCacheData {
  timestamp: number;
  entries: Record<string, { cik: string; title: string }>;
}

let memoryTickersCache: Map<string, { cik: string; title: string }> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days disk cache for SEC company_tickers.json

const CACHE_FILE = resolve(process.cwd(), "data", "cache", "company_tickers.json");

const SEC_USER_AGENT = process.env.SEC_USER_AGENT || "Finvestigate Research contact@finvestigate.dev";

const SEC_HEADERS = {
  "User-Agent": SEC_USER_AGENT,
  "Accept-Encoding": "gzip, deflate",
  "Host": "www.sec.gov",
};

async function loadDiskCache(): Promise<Map<string, { cik: string; title: string }> | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw) as TickersCacheData;
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.entries) {
      const map = new Map<string, { cik: string; title: string }>();
      for (const [ticker, info] of Object.entries(parsed.entries)) {
        map.set(ticker, info);
      }
      return map;
    }
  } catch (_err) {
    // Disk cache missing or expired
  }
  return null;
}

async function saveDiskCache(cacheMap: Map<string, { cik: string; title: string }>): Promise<void> {
  if (process.env.VERCEL) {
    return; // Read-only serverless environment
  }
  try {
    await mkdir(resolve(process.cwd(), "data", "cache"), { recursive: true });
    const entriesObj: Record<string, { cik: string; title: string }> = {};
    for (const [ticker, info] of cacheMap.entries()) {
      entriesObj[ticker] = info;
    }
    const payload: TickersCacheData = {
      timestamp: Date.now(),
      entries: entriesObj,
    };
    await writeFile(CACHE_FILE, JSON.stringify(payload), "utf8");
  } catch (err: any) {
    if (err && (err.code === "EROFS" || err.code === "EACCES" || err.code === "EPERM")) {
      return; // Gracefully continue with memory cache
    }
    console.warn("Failed to write SEC tickers disk cache:", err instanceof Error ? err.message : err);
  }
}

const SMART_ALIASES: Record<string, { ticker: string; cik: string; displayName: string }> = {
  NVDA: { ticker: "NVDA", cik: "0001045810", displayName: "NVIDIA CORP" },
  AAPL: { ticker: "AAPL", cik: "0000320193", displayName: "Apple Inc." },
  MSFT: { ticker: "MSFT", cik: "0000789019", displayName: "MICROSOFT CORP" },
  HDFC: { ticker: "HDFCBANK", cik: "BSE-500180", displayName: "HDFC Bank Limited" },
  HDFCBANK: { ticker: "HDFCBANK", cik: "BSE-500180", displayName: "HDFC Bank Limited" },
  HDB: { ticker: "HDB", cik: "0001144967", displayName: "HDFC Bank Limited (ADR)" },
  INFOSYS: { ticker: "INFY", cik: "BSE-500209", displayName: "Infosys Limited" },
  INFY: { ticker: "INFY", cik: "BSE-500209", displayName: "Infosys Limited" },
  WIPRO: { ticker: "WIPRO", cik: "BSE-507685", displayName: "Wipro Limited" },
  WIT: { ticker: "WIT", cik: "0001123799", displayName: "Wipro Limited (ADR)" },
  ICICI: { ticker: "ICICIBANK", cik: "BSE-532174", displayName: "ICICI Bank Limited" },
  ICICIBANK: { ticker: "ICICIBANK", cik: "BSE-532174", displayName: "ICICI Bank Limited" },
  IBN: { ticker: "IBN", cik: "0001103838", displayName: "ICICI Bank Limited (ADR)" },
  ITC: { ticker: "ITC", cik: "BSE-500875", displayName: "ITC Limited" },
  LT: { ticker: "LT", cik: "BSE-500510", displayName: "Larsen & Toubro Limited" },
  BHARTIARTL: { ticker: "BHARTIARTL", cik: "BSE-532454", displayName: "Bharti Airtel Limited" },
  SBIN: { ticker: "SBIN", cik: "BSE-500112", displayName: "State Bank of India" },
  RELIANCE: { ticker: "RELIANCE", cik: "BSE-500325", displayName: "Reliance Industries Limited" },
  TCS: { ticker: "TCS", cik: "BSE-532540", displayName: "Tata Consultancy Services Ltd" },
  TATAMOTORS: { ticker: "TATAMOTORS", cik: "BSE-500570", displayName: "Tata Motors Limited" },
};

export async function resolveCik(tickerOrName: string): Promise<{ cik: string; displayName: string; ticker: string } | null> {
  const query = tickerOrName.trim().toUpperCase();
  if (!query) return null;

  if (SMART_ALIASES[query]) {
    return SMART_ALIASES[query];
  }

  try {
    const now = Date.now();

    // 1. Memory cache hit check
    if (!memoryTickersCache || now - lastFetchTime > CACHE_TTL_MS) {
      // 2. Try loading from disk cache first
      const diskMap = await loadDiskCache();
      if (diskMap) {
        memoryTickersCache = diskMap;
        lastFetchTime = now;
      } else {
        // 3. Fetch from SEC with rate limiting and exponential retry
        let response: Response | null = null;
        let attempt = 0;
        const maxRetries = 3;

        while (attempt <= maxRetries) {
          await secRateLimiter.throttle();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          try {
            response = await fetch("https://www.sec.gov/files/company_tickers.json", {
              headers: SEC_HEADERS,
              signal: controller.signal as any,
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              break;
            }

            if (response.status === 429 || response.status >= 500) {
              attempt++;
              if (attempt <= maxRetries) {
                const backoff = Math.pow(2, attempt) * 500;
                await new Promise((r) => setTimeout(r, backoff));
                continue;
              }
            }
            break;
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            attempt++;
            if (attempt <= maxRetries) {
              const backoff = Math.pow(2, attempt) * 500;
              await new Promise((r) => setTimeout(r, backoff));
              continue;
            }
            throw fetchErr;
          }
        }

        if (response && response.ok) {
          const rawData = (await response.json()) as Record<string, CompanyTickerEntry>;
          const newMap = new Map<string, { cik: string; title: string }>();

          for (const item of Object.values(rawData)) {
            const sym = item.ticker.toUpperCase();
            const paddedCik = String(item.cik_str).padStart(10, "0");
            newMap.set(sym, { cik: paddedCik, title: item.title });
          }

          memoryTickersCache = newMap;
          lastFetchTime = now;
          await saveDiskCache(newMap);
        }
      }
    }

    if (memoryTickersCache) {
      // Direct ticker lookup
      const direct = memoryTickersCache.get(query);
      if (direct) {
        return {
          cik: direct.cik,
          displayName: direct.title,
          ticker: query,
        };
      }

      // If user passed a 10-digit CIK directly
      if (/^\d{1,10}$/.test(query)) {
        const paddedTarget = query.padStart(10, "0");
        for (const [sym, info] of memoryTickersCache.entries()) {
          if (info.cik === paddedTarget) {
            return {
              cik: info.cik,
              displayName: info.title,
              ticker: sym,
            };
          }
        }
      }

      // Substring title search as fallback
      for (const [sym, info] of memoryTickersCache.entries()) {
        if (info.title.toUpperCase().includes(query)) {
          return {
            cik: info.cik,
            displayName: info.title,
            ticker: sym,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error resolving CIK from SEC directory:", error instanceof Error ? error.message : error);
    return null;
  }
}

export interface SearchResultItem {
  ticker: string;
  displayName: string;
  market: "US" | "IN";
  cik: string;
}

const FEATURED_TICKERS: SearchResultItem[] = [
  { ticker: "NVDA", displayName: "NVIDIA Corp", market: "US", cik: "0001045810" },
  { ticker: "AAPL", displayName: "Apple Inc.", market: "US", cik: "0000320193" },
  { ticker: "MSFT", displayName: "Microsoft Corp", market: "US", cik: "0000789019" },
  { ticker: "AMZN", displayName: "Amazon.com Inc.", market: "US", cik: "0001018724" },
  { ticker: "GOOGL", displayName: "Alphabet Inc.", market: "US", cik: "0001652044" },
  { ticker: "TSLA", displayName: "Tesla, Inc.", market: "US", cik: "0001318605" },
  { ticker: "INTC", displayName: "Intel Corp", market: "US", cik: "0000050863" },
  { ticker: "RELIANCE", displayName: "Reliance Industries Limited", market: "IN", cik: "BSE-500325" },
  { ticker: "TCS", displayName: "Tata Consultancy Services Ltd", market: "IN", cik: "BSE-532540" },
  { ticker: "INFY", displayName: "Infosys Limited", market: "IN", cik: "BSE-500209" },
  { ticker: "HDFCBANK", displayName: "HDFC Bank Limited", market: "IN", cik: "BSE-500180" },
  { ticker: "ICICIBANK", displayName: "ICICI Bank Limited", market: "IN", cik: "BSE-532174" },
  { ticker: "TATAMOTORS", displayName: "Tata Motors Limited", market: "IN", cik: "BSE-500570" },
  { ticker: "ITC", displayName: "ITC Limited", market: "IN", cik: "BSE-500875" },
  { ticker: "LT", displayName: "Larsen & Toubro Limited", market: "IN", cik: "BSE-500510" },
  { ticker: "WIPRO", displayName: "Wipro Limited", market: "IN", cik: "BSE-507685" },
  { ticker: "BHARTIARTL", displayName: "Bharti Airtel Limited", market: "IN", cik: "BSE-532454" },
  { ticker: "SBIN", displayName: "State Bank of India", market: "IN", cik: "BSE-500112" },
];

export async function searchCompanies(query: string): Promise<SearchResultItem[]> {
  const cleanQ = query.trim().toUpperCase();
  if (!cleanQ) {
    return FEATURED_TICKERS.slice(0, 8);
  }

  const results: SearchResultItem[] = [];
  const added = new Set<string>();

  // 1. Check Indian domestic companies first
  for (const [sym, data] of Object.entries(INDIAN_DOMESTIC_DATA)) {
    if (sym.includes(cleanQ) || data.displayName.toUpperCase().includes(cleanQ)) {
      results.push({
        ticker: sym,
        displayName: data.displayName,
        market: "IN",
        cik: `BSE-${data.bseScrip}`,
      });
      added.add(sym);
    }
  }

  // 2. Check featured list
  for (const item of FEATURED_TICKERS) {
    if (!added.has(item.ticker)) {
      if (item.ticker.includes(cleanQ) || item.displayName.toUpperCase().includes(cleanQ)) {
        results.push(item);
        added.add(item.ticker);
      }
    }
  }

  // 3. Search SEC memory cache if available
  if (memoryTickersCache && results.length < 10) {
    for (const [sym, info] of memoryTickersCache.entries()) {
      if (results.length >= 10) break;
      if (!added.has(sym)) {
        if (sym.startsWith(cleanQ) || info.title.toUpperCase().includes(cleanQ)) {
          results.push({
            ticker: sym,
            displayName: info.title,
            market: "US",
            cik: info.cik,
          });
          added.add(sym);
        }
      }
    }
  }

  return results.slice(0, 10);
}
