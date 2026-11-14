const { cpSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const { resolve, sep } = require("node:path");

const sourceDirectory = resolve(process.cwd(), "src", "templates");

const destinationDirectory = resolve(process.cwd(), "dist", "templates");

if (!existsSync(sourceDirectory)) {
  throw new Error(`Template source directory not found: ${sourceDirectory}`);
}

rmSync(destinationDirectory, {
  recursive: true,
  force: true,
});

mkdirSync(destinationDirectory, {
  recursive: true,
});

cpSync(sourceDirectory, destinationDirectory, {
  recursive: true,
  force: true,
  filter: (source) => !source.split(sep).includes("node_modules"),
});

console.log("Copied project templates to dist/templates");
