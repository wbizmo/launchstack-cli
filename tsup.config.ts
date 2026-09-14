import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as {
  version: string;
};

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/cli.ts"
  ],
  format: [
    "cjs",
    "esm"
  ],
  dts: true,
  sourcemap: true,
  clean: true,
  define: {
    __LAUNCHSTACK_VERSION__: JSON.stringify(packageJson.version)
  }
});
