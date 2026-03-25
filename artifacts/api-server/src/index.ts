import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { ingestNews } from "./routes/ingest";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Ingest news immediately on startup, then every 4 hours
  try {
    await ingestNews();
  } catch (e) {
    logger.warn({ err: e }, "Initial news ingestion failed");
  }

  cron.schedule("0 */4 * * *", async () => {
    try {
      await ingestNews();
    } catch (e) {
      logger.warn({ err: e }, "Scheduled news ingestion failed");
    }
  });
});
