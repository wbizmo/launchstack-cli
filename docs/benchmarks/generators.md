# Generator query and SDK verification

Implementation: [`b5cf167`](https://github.com/wbizmo/launchstack-cli/commit/b5cf167defb475caf7d50fab79093d88df4cc66b)

## Environment and workload

The generated-project integration ran on Node.js 24.22.3 and npm 11.19.1 in Linux 6.18.57 x86_64. It used PostgreSQL 16 Alpine and Prisma 6.19.3. The smoke created one resource, ran two concurrent updates (one owned, one cross-owner), then inserted five rows with the same timestamp and paginated them in pages of two while deleting a row between pages. Prisma query events supplied the statement counts. This was one functional run, not a latency benchmark.

## Observed database work

| Operation                                |                          Observed statements | Result                                                                                                         |
| ---------------------------------------- | -------------------------------------------: | -------------------------------------------------------------------------------------------------------------- |
| Owned and cross-owner concurrent updates | 2 `UPDATE` statements, 0 pre-read statements | One owned update succeeded; the cross-owner update returned no row. Both updates included the owner predicate. |
| Each pagination request                  |                           1 bounded `SELECT` | Uses `take = limit + 1`, then returns at most `limit` rows and computes `hasNext`.                             |
| Keyset order                             |                  `(createdAt DESC, id DESC)` | Five tied timestamps paged without duplication; deleting a row between pages did not return the deleted row.   |

The generated Prisma model adds `@@index([ownerId, createdAt, id])`. Direct owner-scoped reads use one `findFirst` query, and deletes use one `deleteMany` mutation. The list response contains `items`, `hasNext` and `nextCursor`; the default limit is 50 and the accepted range is 1–100. Cursor input is limited to 256 characters and malformed cursors return a 400 error.

## SDK fixture verification

The OpenAPI tests cover 3.0.3 and 3.1.0 documents, local parameter/request/response/schema references, enum and composed types, optional and nullable fields, safe property emission, deterministic names, invalid inline schemas, invalid pointers, external-reference rejection, cyclic input, and the 1 MiB document limit. Generated TypeScript, React and React Native targets were compiled with strict TypeScript settings. A fixture request asserted URL path escaping, repeated query parameters, bearer auth, JSON request body, parsed response and cancellation signal.

The loader enforces HTTPS for remote sources, a 10 second timeout, a 1 MiB transfer limit, a 64-level / 100,000-node document bound, at most 1,000 paths and schemas, at most 3,000 operations, and a 2 MiB generated-client bound. External `$ref` targets are rejected. These are input/output safety limits, not claims about arbitrary remote service behavior.

## Verification result

The focused suite passed 13 tests across two files. The generated project passed typecheck, its build, 28 tests across nine files and the production dependency audit (zero high or critical findings). The smoke script performs `npm ci` to build the isolated project; package download duration is excluded from the query-count observations.

Machine-readable observations are in [`generators.json`](generators.json). No response-time, throughput or scale claim is made from this workload.
