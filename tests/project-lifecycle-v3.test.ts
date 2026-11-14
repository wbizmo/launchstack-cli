import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { describe, expect, test } from "vitest";
import {
  createProjectManifest,
  parseProjectManifest,
  serializeProjectManifest,
} from "../src/project/manifest";
import { resolveProjectPath } from "../src/project/paths";
import { emptyProjectState } from "../src/project/types";
import {
  applyFileMutations,
  recoverInterruptedMutation,
} from "../src/project/transaction";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "launchstack-v3-project-"));
  writeFileSync(
    join(root, "launchstack.json"),
    serializeProjectManifest(
      createProjectManifest({ name: "fixture", templateVersion: "3.0.0" }),
    ),
  );
  return root;
}

describe("v3 project lifecycle primitives", () => {
  test("rejects unknown managed manifest keys", () => {
    expect(() =>
      parseProjectManifest({
        ...createProjectManifest({ name: "fixture", templateVersion: "3.0.0" }),
        typo: true,
      }),
    ).toThrow(/unrecognized|invalid/i);
  });

  test("rejects traversal and symbolic-link mutation targets", () => {
    const root = fixture();
    expect(() => resolveProjectPath(root, "../escape")).toThrow(
      /unsafe|escape/i,
    );
    const outside = mkdtempSync(join(tmpdir(), "outside-"));
    symlinkSync(outside, join(root, "linked"), "dir");
    expect(() => resolveProjectPath(root, "linked/file.txt")).toThrow(
      /symbolic-link/i,
    );
  });

  test("applies staged writes atomically and records hashes", () => {
    const root = fixture();
    const state = emptyProjectState("3.0.0", "3.0.0");
    const next = applyFileMutations({
      projectDirectory: root,
      state,
      mutations: [
        {
          type: "write",
          path: "src/managed.ts",
          content: "export const value = 1;\n",
          owner: "test",
          version: "1.0.0",
          expectedSha256: null,
        },
      ],
    });
    expect(readFileSync(join(root, "src/managed.ts"), "utf8")).toContain(
      "value = 1",
    );
    expect(next.managedFiles["src/managed.ts"]?.sha256).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  test("never expires a lock owned by a live process merely because it is old", () => {
    const root = fixture();
    mkdirSync(join(root, ".launchstack"), { recursive: true });
    writeFileSync(
      join(root, ".launchstack", "mutation.lock"),
      JSON.stringify({ pid: process.pid, createdAt: 0 }),
    );
    expect(() =>
      applyFileMutations({
        projectDirectory: root,
        state: emptyProjectState("3.0.0", "3.0.0"),
        mutations: [],
      }),
    ).toThrow(/already running/i);
  });

  test("cleans staging directories when preflight validation fails", () => {
    const root = fixture();
    writeFileSync(join(root, "owned.txt"), "user data\n");
    expect(() =>
      applyFileMutations({
        projectDirectory: root,
        state: emptyProjectState("3.0.0", "3.0.0"),
        mutations: [
          {
            type: "write",
            path: "owned.txt",
            content: "replacement\n",
            owner: "test",
            version: "1.0.0",
            expectedSha256: null,
          },
        ],
      }),
    ).toThrow(/unmanaged file/i);
    const metadata = join(root, ".launchstack");
    expect(
      readdirSync(metadata).filter(
        (name) => name.startsWith(".stage-") || name.startsWith(".backup-"),
      ),
    ).toEqual([]);
  });

  test("rejects an untrusted recovery journal without touching external paths", () => {
    const root = fixture();
    const outside = mkdtempSync(join(tmpdir(), "launchstack-outside-"));
    const victim = join(outside, "keep.txt");
    writeFileSync(victim, "must survive\n");
    mkdirSync(join(root, ".launchstack"), { recursive: true });
    writeFileSync(
      join(root, ".launchstack", "mutation-journal.json"),
      JSON.stringify({
        version: 1,
        id: "2c13b7b8-72c0-4db6-ae5c-9f2b776d6b31",
        stageDirectory: outside,
        backupDirectory: outside,
        mutations: [
          { type: "delete", path: "../../outside/keep.txt", hadOriginal: true },
        ],
      }),
    );

    expect(() => recoverInterruptedMutation(root)).toThrow(
      /invalid mutation|unknown/i,
    );
    expect(existsSync(victim)).toBe(true);
    expect(readFileSync(victim, "utf8")).toBe("must survive\n");
  });

  test("rejects a traversal path in a versioned recovery journal", () => {
    const root = fixture();
    const outside = mkdtempSync(join(tmpdir(), "launchstack-outside-"));
    const victim = join(outside, "keep.txt");
    writeFileSync(victim, "must survive\n");
    mkdirSync(join(root, ".launchstack"), { recursive: true });
    writeFileSync(
      join(root, ".launchstack", "mutation-journal.json"),
      JSON.stringify({
        version: 1,
        id: "2c13b7b8-72c0-4db6-ae5c-9f2b776d6b31",
        state: "committing",
        mutations: [
          { type: "delete", path: "../../outside/keep.txt", hadOriginal: true },
        ],
      }),
    );

    expect(() => recoverInterruptedMutation(root)).toThrow(/unsafe|escape/i);
    expect(readFileSync(victim, "utf8")).toBe("must survive\n");
  });

  test("recovers an interrupted rename idempotently and retains committed output", () => {
    const root = fixture();
    const metadata = join(root, ".launchstack");
    const id = "2c13b7b8-72c0-4db6-ae5c-9f2b776d6b31";
    const backup = join(metadata, `.backup-${id}`, "src", "managed.txt");
    const stage = join(metadata, `.stage-${id}`);
    const target = join(root, "src", "managed.txt");
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(target, "new\n");
    mkdirSync(join(metadata, `.backup-${id}`, "src"), { recursive: true });
    writeFileSync(backup, "old\n");
    mkdirSync(stage, { recursive: true });
    writeFileSync(
      join(metadata, "mutation-journal.json"),
      JSON.stringify({
        version: 1,
        id,
        state: "committing",
        mutations: [
          { type: "write", path: "src/managed.txt", hadOriginal: true },
        ],
      }),
    );

    expect(recoverInterruptedMutation(root)).toBe(true);
    expect(readFileSync(target, "utf8")).toBe("old\n");
    expect(recoverInterruptedMutation(root)).toBe(false);

    const committedId = "3c13b7b8-72c0-4db6-ae5c-9f2b776d6b32";
    mkdirSync(join(metadata, `.backup-${committedId}`), { recursive: true });
    writeFileSync(
      join(metadata, "mutation-journal.json"),
      JSON.stringify({
        version: 1,
        id: committedId,
        state: "committed",
        mutations: [
          { type: "write", path: "src/managed.txt", hadOriginal: true },
        ],
      }),
    );
    expect(recoverInterruptedMutation(root)).toBe(true);
    expect(readFileSync(target, "utf8")).toBe("old\n");
  });

  test("serializes 8 and 32 independent writer processes without losing updates", async () => {
    const transactionModule = resolve(
      process.cwd(),
      "src/project/transaction.ts",
    );
    const typesModule = resolve(process.cwd(), "src/project/types.ts");
    for (const count of [8, 32]) {
      const root = fixture();
      if (count === 8) {
        const metadata = join(root, ".launchstack");
        mkdirSync(metadata, { recursive: true });
        writeFileSync(
          join(metadata, "mutation.lock"),
          JSON.stringify({
            version: 1,
            id: "2c13b7b8-72c0-4db6-ae5c-9f2b776d6b31",
            pid: 2_147_483_647,
            createdAt: Date.now(),
          }),
        );
      }
      const writers = Array.from(
        { length: count },
        (_, index) =>
          new Promise<void>((resolvePromise, rejectPromise) => {
            const code = `const { applyFileMutations } = require(${JSON.stringify(transactionModule)}); const { emptyProjectState } = require(${JSON.stringify(typesModule)}); const projectDirectory = ${JSON.stringify(root)}; const index = ${index}; applyFileMutations({ projectDirectory, state: emptyProjectState("3.0.0", "3.0.0"), mutations: [{ type: "write", path: "writers/writer-" + index + ".txt", content: "writer-" + index + "\\n", owner: "test", version: "1", expectedSha256: null }] });`;
            const child = spawn(
              process.execPath,
              ["--import", "tsx", "--eval", code],
              { cwd: process.cwd(), stdio: ["ignore", "ignore", "pipe"] },
            );
            let stderr = "";
            child.stderr?.on("data", (chunk: Buffer) => {
              stderr += chunk.toString();
            });
            child.once("error", rejectPromise);
            child.once("exit", (codeValue) =>
              codeValue === 0
                ? resolvePromise()
                : rejectPromise(
                    new Error(`writer exited with ${codeValue}: ${stderr}`),
                  ),
            );
          }),
      );
      await Promise.all(writers);
      for (let index = 0; index < count; index += 1)
        expect(
          readFileSync(join(root, "writers", `writer-${index}.txt`), "utf8"),
        ).toBe(`writer-${index}\n`);
    }
  }, 30_000);

  test("rejects overlapping targets before staging either write", () => {
    const root = fixture();
    const state = emptyProjectState("3.0.0", "3.0.0");
    expect(() =>
      applyFileMutations({
        projectDirectory: root,
        state,
        mutations: [
          {
            type: "write",
            path: "nested",
            content: "file",
            owner: "test",
            version: "1",
            expectedSha256: null,
          },
          {
            type: "write",
            path: "nested/child",
            content: "child",
            owner: "test",
            version: "1",
            expectedSha256: null,
          },
        ],
      }),
    ).toThrow(/overlapping paths/i);
  });
});
