import { describe, expect, test } from "vitest";
import { normalizeManagedPath } from "../src/project/paths";

describe("managed project paths", () => {
  test("rejects absolute paths from either platform", () => {
    for (const path of [
      "/etc/passwd",
      "\\etc\\passwd",
      "C:\\Windows\\system.ini",
      "D:/outside/file",
    ])
      expect(() => normalizeManagedPath(path)).toThrow(/unsafe managed path/i);
  });
});
