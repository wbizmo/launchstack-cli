import {
  describe,
  expect,
  it
} from "vitest";
import {
  successResponse
} from "../src/core/http/api-response";
import {
  createPaginationMeta
} from "../src/core/types/pagination";
import {
  ApplicationError
} from "../src/core/errors/application-error";

describe("application architecture utilities", () => {
  it("wraps successful responses consistently", () => {
    expect(
      successResponse({
        id: "user-1"
      })
    ).toEqual({
      data: {
        id: "user-1"
      }
    });
  });

  it("creates pagination metadata", () => {
    expect(
      createPaginationMeta(
        {
          page: 2,
          limit: 10
        },
        25
      )
    ).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3
    });
  });

  it("creates structured application errors", () => {
    const error =
      new ApplicationError({
        statusCode: 404,
        code:
          "RESOURCE_NOT_FOUND",
        message:
          "User not found."
      });

    expect(
      error.statusCode
    ).toBe(404);

    expect(
      error.code
    ).toBe(
      "RESOURCE_NOT_FOUND"
    );
  });
});
