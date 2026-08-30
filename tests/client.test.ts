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

  it("rejects plaintext remote API origins", () => {
    expect(() => new LaunchStackClient({
      apiKey: "ls_test_123",
      baseUrl: "http://example.com/v1"
    })).toThrow(LaunchStackError);
  });

  it("rejects base URLs containing credentials", () => {
    expect(() => new LaunchStackClient({
      apiKey: "ls_test_123",
      baseUrl: "https://user:password@example.com/v1"
    })).toThrow(LaunchStackError);
  });

  it("allows plaintext loopback endpoints for local development", () => {
    const client = new LaunchStackClient({
      apiKey: "ls_test_123",
      baseUrl: "http://127.0.0.1:8787/v1"
    });
    expect(client).toBeInstanceOf(LaunchStackClient);
  });
});
