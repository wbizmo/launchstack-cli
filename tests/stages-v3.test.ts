import { describe, expect, test } from "vitest";
import { stageResourceId, validateStageName } from "../src/stages/manager";
describe("v3 stage identity", () => {
  test("uses deterministic isolated resource identities", () => { const one = stageResourceId("/tmp/project-a", "my-api", "pr-42"); const two = stageResourceId("/tmp/project-a", "my-api", "pr-42"); const other = stageResourceId("/tmp/project-b", "my-api", "pr-42"); expect(one).toBe(two); expect(one).not.toBe(other); expect(one.length).toBeLessThanOrEqual(63); });
  test("keeps a collision-resistant suffix when long project and stage names are truncated", () => { const one = stageResourceId("/tmp/project-a", "very-long-project-name-that-is-shared-a", "very-long-preview-stage-name-a"); const two = stageResourceId("/tmp/project-a", "very-long-project-name-that-is-shared-b", "very-long-preview-stage-name-b"); expect(one).not.toBe(two); expect(one.length).toBeLessThanOrEqual(63); expect(one).toMatch(/-[a-f0-9]{8}$/); });
  test("rejects unsafe stage names", () => { expect(() => validateStageName("../prod")).toThrow(); expect(() => validateStageName("UPPER")).toThrow(); expect(validateStageName("pr-142")).toBe("pr-142"); });
});
