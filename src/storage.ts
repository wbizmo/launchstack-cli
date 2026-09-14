import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export function atomicWriteText(
  path: string,
  content: string,
  mode?: number
): void {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true });

  const temporaryPath = join(
    directory,
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`
  );

  try {
    writeFileSync(temporaryPath, content, {
      encoding: "utf8",
      flag: "wx",
      ...(mode === undefined ? {} : { mode })
    });

    if (mode !== undefined) {
      chmodSync(temporaryPath, mode);
    }

    renameSync(temporaryPath, path);

    if (mode !== undefined) {
      chmodSync(path, mode);
    }
  } finally {
    if (existsSync(temporaryPath)) {
      rmSync(temporaryPath, { force: true });
    }
  }
}

export function readJsonFile<T>(
  path: string,
  fallback: T
): T {
  if (!existsSync(path)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    throw new Error(`Invalid JSON in ${basename(path)}.`);
  }
}
