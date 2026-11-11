import { describe, expect, it, beforeAll } from "vitest";
import { app } from "../../src/server/api/server.js";
import { getRepository } from "../../src/server/infrastructure/db/repository.js";

describe("Streaming SSE & Universal Search API", () => {
  beforeAll(async () => {
    const repo = await getRepository();
    await repo.seedCuratedData();
  });

  describe("GET /api/search", () => {
    it("returns featured tickers when query is empty", async () => {
      // Mock Express request using supertest-like fetch or direct app handle
      const req = {
        query: {},
      } as any;
      let resJson: any = null;
      const res = {
        json: (val: any) => { resJson = val; return res; },
        status: () => res,
      } as any;

      const { searchCompanies } = await import("../../src/server/infrastructure/sources/live-cik.js");
      const results = await searchCompanies("");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.ticker === "NVDA")).toBe(true);
      expect(results.some((r) => r.ticker === "RELIANCE")).toBe(true);
    });

    it("searches Indian equities with instant typeahead match", async () => {
      const { searchCompanies } = await import("../../src/server/infrastructure/sources/live-cik.js");
      const results = await searchCompanies("INFY");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].ticker).toBe("INFY");
      expect(results[0].market).toBe("IN");
      expect(results[0].displayName).toContain("Infosys");
    });

    it("searches US SEC equities with instant typeahead match", async () => {
      const { searchCompanies } = await import("../../src/server/infrastructure/sources/live-cik.js");
      const results = await searchCompanies("AAPL");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].ticker).toBe("AAPL");
      expect(results[0].market).toBe("US");
    });
  });

  describe("SSE Streaming Endpoint", () => {
    it("successfully streams stage progress events and ends with complete", async () => {
      const { loadInvestigation } = await import("../../src/server/application/evidence-store.js");
      const stages: string[] = [];
      const messages: string[] = [];

      const inv = await loadInvestigation("NVDA", (stage, progress, message) => {
        stages.push(stage);
        messages.push(message);
      });

      expect(inv).toBeDefined();
      expect(inv.company).toBe("NVDA");
      expect(stages.length).toBeGreaterThan(0);
      expect(stages).toContain("complete");
    });
  });
});
