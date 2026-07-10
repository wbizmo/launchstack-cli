import { buildApp } from "./app";

async function start(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "Shutting down server");

    await app.close();

    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  try {
    await app.listen({
      host: app.config.host,
      port: app.config.port
    });

    app.log.info(
      {
        host: app.config.host,
        port: app.config.port,
        environment: app.config.nodeEnv
      },
      "{{PROJECT_DISPLAY_NAME}} API started"
    );
  } catch (error) {
    app.log.error(error, "Failed to start API");
    process.exit(1);
  }
}

void start();
