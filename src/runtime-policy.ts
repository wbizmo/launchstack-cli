export const SUPPORTED_NODE_RANGE = ">=24.22.0 <25 || >=26.13.0 <27";

function isSupportedNode(runtimeVersion: string): boolean {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(runtimeVersion);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return (major === 24 && minor >= 22) || (major === 26 && minor >= 13);
}

export function isRuntimeVersionRequest(args: string[]): boolean {
  return args.length === 1 && (args[0] === "--version" || args[0] === "-V");
}

export function isRuntimeHelpRequest(args: string[]): boolean {
  return (
    args.length === 0 ||
    args[0] === "help" ||
    (args.length === 1 && (args[0] === "--help" || args[0] === "-h"))
  );
}

export function unsupportedRuntimeMessage(
  runtimeVersion: string,
  args: string[],
): string | undefined {
  if (isSupportedNode(runtimeVersion)) return undefined;
  if (isRuntimeHelpRequest(args) || isRuntimeVersionRequest(args))
    return undefined;

  return `LaunchStack CLI requires Node.js ${SUPPORTED_NODE_RANGE}. Current runtime: ${runtimeVersion}. Install a supported Node.js 24 or 26 release and retry.`;
}
