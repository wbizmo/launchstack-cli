import { describe, expect, it } from "vitest";
import { LaunchStackClient, LaunchStackError } from "../src";

describe("LaunchStackClient", () => {
  it("throws if api key is missing", () => {
    expect(() => {
      new LaunchStackClient({
        apiKey: ""
      });
    }).toThrow(LaunchStackError);
  });

  it("creates client with default base url", () => {
    const client = new LaunchStackClient({
      apiKey: "ls_test_123"
    });

    expect(client).toBeInstanceOf(LaunchStackClient);
  });
});
