
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

// Load environment variables before importing worker
loadEnvConfig(process.cwd());

async function startWorker() {
  await import("./reminder-worker");
}

startWorker().catch((error) => {
  console.error("[Worker Startup Error]:", error);
  process.exit(1);
});
