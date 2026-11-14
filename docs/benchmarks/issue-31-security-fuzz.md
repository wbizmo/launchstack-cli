# Issue #31 bounded security fuzz run

Run `npm run security:fuzz`. The launcher gives the worker a 128 MiB V8 heap ceiling and a 15 second wall-clock timeout. The worker uses a fixed seed so the cases can be reproduced. It does not access the network or invoke external commands.

The recorded Linux run used Node v24.22.3 and completed 1,290 adversarial cases. It rejected 512 cross-platform traversal/absolute paths, 256 malformed recovery journals, 256 malformed project manifests, 128 malicious plugin manifests, 128 symlink path attempts, four encoded path forms that remained confined, two oversized inputs, one cyclic OpenAPI object, and three hostile OpenAPI URLs. The outside-project sentinel remained unchanged. Peak observed RSS was 91.8 MiB; the enforced memory ceiling is the V8 heap limit, not an OS-level RSS cap. The same corpus also passed on Node v26.13.1 with 110.7 MiB observed peak RSS.

The input-class iteration counts and run metadata are in [issue-31-security-fuzz.json](issue-31-security-fuzz.json). The harness is deterministic corpus mutation, not coverage-guided fuzzing, and the counts are test iterations rather than code-coverage percentages. Unit and integration tests separately cover transaction fault recovery, lock contention, file identity and generated API authorization.
