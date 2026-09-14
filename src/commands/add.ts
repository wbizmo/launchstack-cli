import { Command } from "commander";
import { FIRST_PARTY_EXTENSIONS, listFirstPartyExtensions } from "../extensions/first-party";
import { applyExtensionInstall, planExtensionInstall } from "../extensions/engine";

type AddOptions = { list?: boolean; dryRun?: boolean; json?: boolean; directory?: string };
export const addCommand = new Command("add").description("Add a production capability to an existing LaunchStack project").argument("[capability]", "Capability ID").argument("[provider]", "Optional provider, for example google for oauth").option("--list").option("--dry-run").option("--json").option("-d, --directory <path>").action((capability: string | undefined, provider: string | undefined, options: AddOptions) => {
  try {
    if (options.list) { const capabilities = listFirstPartyExtensions().map((item) => ({ id: item.id, version: item.version, dependencies: item.dependencies ?? [] })); if (options.json) console.log(JSON.stringify(capabilities, null, 2)); else for (const item of capabilities) console.log(`${item.id}\t${item.version}${item.dependencies.length ? `\tdepends: ${item.dependencies.join(",")}` : ""}`); return; }
    if (!capability) throw new Error("Provide a capability ID or use --list.");
    if (provider && capability !== "oauth" && capability !== "storage") throw new Error(`Capability ${capability} does not accept a provider argument.`);
    const plan = planExtensionInstall({ projectDirectory: options.directory ?? process.cwd(), requested: [capability], registry: FIRST_PARTY_EXTENSIONS }); if (provider && plan.nextManifest.capabilities[capability]) plan.nextManifest.capabilities[capability] = { ...plan.nextManifest.capabilities[capability], provider }; if (!options.dryRun) applyExtensionInstall(plan); const output = { dryRun: Boolean(options.dryRun), noop: plan.noop, extensions: plan.extensionIds, provider: provider ?? null, actions: plan.actions, warnings: plan.warnings }; if (options.json) console.log(JSON.stringify(output, null, 2)); else { if (plan.noop) console.log(`${capability} is already up to date.`); else for (const action of plan.actions) console.log(`${options.dryRun ? "PLAN" : "APPLY"} ${action.kind} ${action.target}: ${action.detail}`); }
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
});
