import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { hashFile } from "../src/project/state";

const mode = process.argv[2];
const file = process.argv[3];
if (!file || (mode !== "stream" && mode !== "read-all")) throw new Error("Usage: hash-worker.ts <stream|read-all> <file>");
const digest = mode === "stream" ? hashFile(file) : createHash("sha256").update(readFileSync(file)).digest("hex");
process.stdout.write(JSON.stringify({ mode, digest, max_rss_bytes: process.resourceUsage().maxRSS * 1024, memory: process.memoryUsage() }) + "\n");
