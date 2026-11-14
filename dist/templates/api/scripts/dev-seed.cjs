const { URL } = require("node:url");

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Refusing to seed production data.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const database = new URL(databaseUrl);
  if (
    !["localhost", "127.0.0.1", "::1"].includes(database.hostname.toLowerCase())
  )
    throw new Error("Refusing to seed a non-loopback database.");
  if (/(^|[_-])prod(uction)?($|[_-])/i.test(database.pathname))
    throw new Error("Refusing to seed a production-looking database name.");
  const email = process.env.LAUNCHSTACK_SEED_EMAIL;
  const password = process.env.LAUNCHSTACK_SEED_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "Set LAUNCHSTACK_SEED_EMAIL and a LAUNCHSTACK_SEED_PASSWORD of at least 12 characters.",
    );
  const bcrypt = require("bcryptjs");
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: { name: "Local Developer" },
      create: { email, name: "Local Developer", passwordHash },
    });
    console.log("Seeded the configured local development user.");
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
