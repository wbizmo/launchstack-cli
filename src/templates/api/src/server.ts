import { buildApp } from "./app";

async function start(): Promise<void> {
  const app = await buildApp();
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    app.log.info(
      {
        signal
      },
      "Shutting down server"
    );

    const forceShutdownTimer = setTimeout(() => {
      app.log.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);

    forceShutdownTimer.unref();

    try {
      await app.close();
      clearTimeout(forceShutdownTimer);
      process.exit(0);
    } catch (error) {
      app.log.error(error, "Graceful shutdown failed");
      process.exit(1);
    }
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("unhandledRejection", (reason) => {
    app.log.error(
      {
        reason
      },
      "Unhandled rejection"
    );

    void shutdown("unhandledRejection");
  });

  process.on("uncaughtException", (error) => {
    app.log.error(error, "Uncaught exception");
    void shutdown("uncaughtException");
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
