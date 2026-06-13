import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STORE_DIR = ".launchstack";
const HISTORY_FILE = "history.json";

export type DeploymentRecord = {
  id: string;
  appName: string;
  environment: string;
  provider: string;
  deployTarget: string;
  outputDirectory: string;
  status: "success" | "failed";
  createdAt: string;
};

function getStorePath() {
  return resolve(process.cwd(), STORE_DIR);
}

function getHistoryPath() {
  return resolve(getStorePath(), HISTORY_FILE);
}

function ensureStore() {
  if (!existsSync(getStorePath())) {
    mkdirSync(getStorePath(), { recursive: true });
  }
}

export function readHistory(): DeploymentRecord[] {
  ensureStore();

  if (!existsSync(getHistoryPath())) {
    return [];
  }

  return JSON.parse(readFileSync(getHistoryPath(), "utf-8")) as DeploymentRecord[];
}

export function writeHistory(records: DeploymentRecord[]) {
  ensureStore();
  writeFileSync(getHistoryPath(), JSON.stringify(records, null, 2));
}

export function addDeploymentRecord(record: DeploymentRecord) {
  const records = readHistory();
  records.unshift(record);
  writeHistory(records.slice(0, 50));
}