import type { InvestigationRepository } from "./repository-interface.js";

let repoInstance: InvestigationRepository | null = null;

export async function getRepository(): Promise<InvestigationRepository> {
  if (repoInstance) {
    return repoInstance;
  }

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    try {
      const { TursoAdapter } = await import("./turso-adapter.js");
      const tursoRepo = new TursoAdapter({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      await tursoRepo.init();
      await tursoRepo.seedCuratedData();
      repoInstance = tursoRepo;
      return repoInstance;
    } catch (err) {
      if (process.env.TURSO_STRICT === "true") {
        throw err;
      }
      console.warn(
        `[Repository Warning] Turso Cloud initialization failed (${err instanceof Error ? err.message : String(err)}). Falling back to local SQLite repository to preserve service availability.`
      );
    }
  }

  const { SqliteAdapter } = await import("./sqlite-adapter.js");
  const sqliteRepo = new SqliteAdapter();
  await sqliteRepo.init();
  await sqliteRepo.seedCuratedData();
  repoInstance = sqliteRepo;
  return repoInstance;
}

export function setRepositoryForTest(repo: InvestigationRepository | null): void {
  repoInstance = repo;
}
