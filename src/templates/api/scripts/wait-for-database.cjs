const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const maxAttempts = Number(process.env.DB_WAIT_ATTEMPTS ?? 30);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS ?? 2000);

async function waitForDatabase() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      console.log("Database is ready.");
      await prisma.$disconnect();
      return;
    } catch (error) {
      console.log(
        `Database not ready. Attempt ${attempt}/${maxAttempts}.`
      );

      if (attempt === maxAttempts) {
        await prisma.$disconnect();
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }
}

waitForDatabase().catch((error) => {
  console.error("Database readiness check failed.");
  console.error(error);
  process.exit(1);
});
