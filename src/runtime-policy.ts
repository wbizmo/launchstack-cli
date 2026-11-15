import { satisfies } from "semver";

export const SUPPORTED_NODE_RANGE = ">=24.22.0 <25 || >=26.13.0 <27";

const informationalArguments = new Set(["--help", "-h", "--version", "-V"]);

export function unsupportedRuntimeMessage(
  runtimeVersion: string,
  args: string[],
): string | undefined {
  if (satisfies(runtimeVersion, SUPPORTED_NODE_RANGE)) return undefined;
  if (
    args.length === 0 ||
    args[0] === "help" ||
    args.some((argument) => informationalArguments.has(argument))
  )
    return undefined;

  return `LaunchStack CLI requires Node.js ${SUPPORTED_NODE_RANGE}. Current runtime: ${runtimeVersion}. Install a supported Node.js 24 or 26 release and retry.`;
}
