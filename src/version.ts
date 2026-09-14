declare const __LAUNCHSTACK_VERSION__: string;
export function currentLaunchStackVersion(): string {
  if (process.env.LAUNCHSTACK_VERSION_OVERRIDE) return process.env.LAUNCHSTACK_VERSION_OVERRIDE;
  return typeof __LAUNCHSTACK_VERSION__ === "string" ? __LAUNCHSTACK_VERSION__ : "0.0.0-dev";
}
