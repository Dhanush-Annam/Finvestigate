/**
 * Comprehensive Production E2E Verification
 */
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const PORT = 8080;
const TEST_API_KEY = "prod-verification-secret-key-9988";

function startServer(): Promise<ChildProcess> {
  return new Promise<ChildProcess>((resolvePromise, rejectPromise) => {
    const serverPath = resolve(process.cwd(), "server-dist", "server", "api", "server.js");
    const child = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(PORT),
        API_SECRET_KEY: TEST_API_KEY,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let started = false;

    child.stdout.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes(`listening on http://localhost:${PORT}`) && !started) {
        started = true;
        resolvePromise(child);
      }
    });

    child.stderr.on("data", (data) => {
      console.log("[SERVER STDERR]", data.toString().trim());
    });

    child.on("error", (err) => {
      if (!started) rejectPromise(err);
    });

    child.on("exit", (code) => {
      if (!started) rejectPromise(new Error(`Server exited prematurely with code ${code}`));
    });

    setTimeout(async () => {
      if (!started) {
        try {
          const res = await fetch(`http://localhost:${PORT}/health`);
          if (res.ok) {
            started = true;
            resolvePromise(child);
            return;
          }
        } catch (_e) {}
        rejectPromise(new Error("Server start timeout"));
      }
    }, 10000);
  });
}

async function stopServer(child: ChildProcess): Promise<void> {
  return new Promise<void>((resolvePromise) => {
    if (child.killed || child.exitCode !== null) {
      resolvePromise();
      return;
    }
    child.on("exit", () => resolvePromise());
    child.kill("SIGTERM");
    setTimeout(() => {
      try { child.kill("SIGKILL"); } catch (_e) {}
      resolvePromise();
    }, 3000);
  });
}

async function run() {
  console.log("===============================================================");
  console.log("RUNNING PRODUCTION END-TO-END VERIFICATION SUITE (PORT " + PORT + ")");
  console.log("===============================================================");

  const server = await startServer();
  console.log("Production server successfully started!");

  const checks = [];

  try {
    // 1. Health checks
    const h1 = await fetch(`http://localhost:${PORT}/health`);
    const h1Json = await h1.json();
    checks.push({
      name: "GET /health responds 200 with service info",
      pass: h1.status === 200 && h1Json.status === "ok",
    });

    const h2 = await fetch(`http://localhost:${PORT}/api/health`);
    const h2Json = await h2.json();
    checks.push({
      name: "GET /api/health responds 200 with service info",
      pass: h2.status === 200 && h2Json.status === "ok",
    });

    // 2. Frontend SPA serving from dist
    const rootRes = await fetch(`http://localhost:${PORT}/`);
    const rootText = await rootRes.text();
    checks.push({
      name: "GET / serves compiled index.html",
      pass: rootRes.status === 200 && rootText.toLowerCase().includes("<title>finvestigate") && rootText.includes("<div id=\"root\">"),
    });

    // Check static asset (extract asset url from index.html)
    const assetMatch = rootText.match(/\/assets\/[^"]+\.js/);
    if (assetMatch) {
      const assetRes = await fetch(`http://localhost:${PORT}${assetMatch[0]}`);
      checks.push({
        name: `Static JS asset ${assetMatch[0]} serves 200`,
        pass: assetRes.status === 200 && assetRes.headers.get("content-type")?.includes("javascript"),
      });
    }

    // 3. API investigations
    const nvdaRes = await fetch(`http://localhost:${PORT}/api/investigations/NVDA`);
    const nvdaJson = await nvdaRes.json();
    checks.push({
      name: "GET /api/investigations/NVDA returns complete investigation data",
      pass: nvdaRes.status === 200 && nvdaJson.company === "NVDA" && nvdaJson.facts?.length > 0 && nvdaJson.calculations?.length > 0 && !!nvdaJson.debate,
    });

    const aaplRes = await fetch(`http://localhost:${PORT}/api/investigations/AAPL`);
    const aaplJson = await aaplRes.json();
    checks.push({
      name: "GET /api/investigations/AAPL returns complete investigation data",
      pass: aaplRes.status === 200 && aaplJson.company === "AAPL" && aaplJson.facts?.length > 0,
    });

    // 4. Verification stats
    const statsRes = await fetch(`http://localhost:${PORT}/api/verification-stats?ticker=NVDA`);
    const statsJson = await statsRes.json();
    checks.push({
      name: "GET /api/verification-stats?ticker=NVDA returns segregated production & adversarial stats",
      pass: statsRes.status === 200 && statsJson.production?.totalClaims > 0 && typeof statsJson.production?.verificationRate === "string",
    });

    // 5. Unknown API route returns 404 JSON
    const notFoundRes = await fetch(`http://localhost:${PORT}/api/nonexistent-route-12345`);
    const notFoundJson = await notFoundRes.json();
    checks.push({
      name: "GET /api/nonexistent-route returns HTTP 404 JSON",
      pass: notFoundRes.status === 404 && notFoundJson.error !== undefined,
    });

    // 6. Adversarial Attack Endpoint Security in Production
    // A: Unauthorized request fails with 401
    const unauthAttack = await fetch(`http://localhost:${PORT}/api/investigations/NVDA/attack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "fabricated_id" }),
    });
    checks.push({
      name: "POST /api/investigations/NVDA/attack without API key returns 401 Unauthorized in production",
      pass: unauthAttack.status === 401,
    });

    // B: Authenticated request succeeds and intercepts injection
    const authAttack = await fetch(`http://localhost:${PORT}/api/investigations/NVDA/attack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TEST_API_KEY,
      },
      body: JSON.stringify({ scenario: "fabricated_id" }),
    });
    const authJson = await authAttack.json();
    checks.push({
      name: "POST /api/investigations/NVDA/attack with valid API key intercepts attack with atomic fallback",
      pass: authAttack.status === 200 && authJson.scenario === "fabricated_id" && authJson.atomicFallbackEngaged === true,
    });

    // C: Cross-company attack scenario
    const crossAttack = await fetch(`http://localhost:${PORT}/api/investigations/NVDA/attack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TEST_API_KEY,
      },
      body: JSON.stringify({ scenario: "cross_company" }),
    });
    const crossJson = await crossAttack.json();
    checks.push({
      name: "POST /api/investigations/NVDA/attack cross_company attack triggers fail_cross_company",
      pass: crossAttack.status === 200 && crossJson.resultCode === "fail_cross_company",
    });

  } finally {
    console.log("Shutting down production server...");
    await stopServer(server);
    console.log("Server stopped.");
  }

  console.log("\n===============================================================");
  console.log("VERIFICATION RESULTS:");
  console.log("===============================================================");
  let allPassed = true;
  for (const c of checks) {
    const status = c.pass ? "[PASS]" : "[FAIL]";
    if (!c.pass) allPassed = false;
    console.log(`${status} ${c.name}`);
  }
  console.log("===============================================================");

  if (!allPassed) {
    process.exit(1);
  }
  console.log("ALL PRODUCTION CHECKS PASSED!");
}

run().catch((err) => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
