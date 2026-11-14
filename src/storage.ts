import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  readSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export type SafeFileSnapshot = {
  content: string;
  bytes: Buffer;
  size: number;
  mode: number;
  dev: number;
  ino: number;
};

export function readRegularFileNoFollow(
  path: string,
  maxBytes: number,
): SafeFileSnapshot {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0)
    throw new Error("File size limit must be a non-negative safe integer.");
  let descriptor: number;
  try {
    descriptor = openSync(
      path,
      constants.O_RDONLY |
        (constants.O_NOFOLLOW ?? 0) |
        (constants.O_NONBLOCK ?? 0),
      0o600,
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ELOOP")
      throw new Error("Expected a regular file without following links.");
    throw error;
  }
  try {
    const before = fstatSync(descriptor);
    const pathStat = lstatSync(path);
    if (
      !before.isFile() ||
      pathStat.isSymbolicLink() ||
      !pathStat.isFile() ||
      before.dev !== pathStat.dev ||
      before.ino !== pathStat.ino
    )
      throw new Error("Expected a regular file without following links.");
    if (before.size > maxBytes)
      throw new Error("File exceeds the configured size limit.");

    const chunks: Buffer[] = [];
    const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, maxBytes + 1));
    let total = 0;
    while (total <= maxBytes) {
      const length = Math.min(chunk.length, maxBytes + 1 - total);
      const bytesRead = readSync(descriptor, chunk, 0, length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > maxBytes)
        throw new Error("File exceeds the configured size limit.");
      chunks.push(Buffer.from(chunk.subarray(0, bytesRead)));
    }
    const after = fstatSync(descriptor);
    if (after.dev !== before.dev || after.ino !== before.ino)
      throw new Error("Opened file identity changed while reading.");
    const bytes = Buffer.concat(chunks, total);
    return {
      content: bytes.toString("utf8"),
      bytes,
      size: after.size,
      mode: after.mode,
      dev: after.dev,
      ino: after.ino,
    };
  } finally {
    closeSync(descriptor);
  }
}

export function atomicWriteText(
  path: string,
  content: string,
  mode?: number,
): void {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true });

  const temporaryPath = join(
    directory,
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    writeFileSync(temporaryPath, content, {
      encoding: "utf8",
      flag: "wx",
      ...(mode === undefined ? {} : { mode }),
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

export function readJsonFile<T>(path: string, fallback: T): T {
  if (!existsSync(path)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    throw new Error(`Invalid JSON in ${basename(path)}.`);
  }
}
