import { resolve } from "node:path";
import { atomicWriteText, readJsonFile } from "./storage";

const STORE_DIR = ".launchstack";
const HISTORY_FILE = "history.json";

export type DeploymentRecord = {
  id: string;
  appName: string;
  environment: string;
  provider: string;
  deployTarget: string;
  outputDirectory: string;
  status: "prepared" | "success" | "failed";
  createdAt: string;
  git?: {
    branch: string;
    commitHash: string;
    commitMessage: string;
    dirty: boolean;
  } | null;
};

function getHistoryPath(
  projectDirectory = process.cwd()
): string {
  return resolve(
    projectDirectory,
    STORE_DIR,
    HISTORY_FILE
  );
}

export function readHistory(
  projectDirectory = process.cwd()
): DeploymentRecord[] {
  const records = readJsonFile<unknown>(
    getHistoryPath(projectDirectory),
    []
  );

  if (!Array.isArray(records)) {
    throw new Error("history.json must contain a JSON array.");
  }

  return records as DeploymentRecord[];
}

export function writeHistory(
  records: DeploymentRecord[],
  projectDirectory = process.cwd()
): void {
  atomicWriteText(
    getHistoryPath(projectDirectory),
    `${JSON.stringify(records, null, 2)}\n`
  );
}

export function addDeploymentRecord(
  record: DeploymentRecord,
  projectDirectory = process.cwd()
): void {
  const records = readHistory(projectDirectory);
  records.unshift(record);
  writeHistory(records.slice(0, 50), projectDirectory);
}
