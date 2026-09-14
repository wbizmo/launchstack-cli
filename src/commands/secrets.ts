import { Command } from "commander";
import {
  readSecrets,
  removeSecret,
  setSecret,
  validateSecretKey
} from "../secrets-store";

async function readSecretFromStdin(): Promise<string> {
  let value = "";

  for await (const chunk of process.stdin) {
    value += String(chunk);
  }

  return value.replace(/\r?\n$/, "");
}

async function promptHiddenSecret(): Promise<string> {
  if (
    !process.stdin.isTTY ||
    typeof process.stdin.setRawMode !== "function"
  ) {
    throw new Error(
      "Interactive secret entry requires a TTY. Pipe the value and use --stdin instead."
    );
  }

  return new Promise<string>((resolve, reject) => {
    let value = "";
    const input = process.stdin;

    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };

    const onData = (chunk: Buffer | string) => {
      const text = String(chunk);

      for (const character of text) {
        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }

        if (character === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Secret entry cancelled."));
          return;
        }

        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }

        value += character;
      }
    };

    process.stdout.write("Secret value: ");
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

export const secretsCommand = new Command("secrets")
  .description("Manage local LaunchStack secrets");

secretsCommand
  .command("add")
  .description("Add or update a local secret without exposing it in process arguments")
  .argument("<key>", "Secret key")
  .option("--stdin", "Read the secret value from standard input")
  .action(async (key: string, options: { stdin?: boolean }) => {
    try {
      validateSecretKey(key);
      const value = options.stdin
        ? await readSecretFromStdin()
        : await promptHiddenSecret();

      setSecret(key, value);
      console.log(`Secret saved: ${key}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Could not save secret.");
      process.exitCode = 1;
    }
  });

secretsCommand
  .command("list")
  .description("List local secret keys")
  .action(() => {
    try {
      const keys = Object.keys(readSecrets());

      if (keys.length === 0) {
        console.log("No secrets found");
        return;
      }

      keys.forEach((key) => {
        console.log(`${key}=********`);
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Could not read secrets.");
      process.exitCode = 1;
    }
  });

secretsCommand
  .command("remove")
  .description("Remove a local secret")
  .argument("<key>", "Secret key")
  .action((key: string) => {
    try {
      if (!removeSecret(key)) {
        console.log(`Secret not found: ${key}`);
        return;
      }

      console.log(`Secret removed: ${key}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Could not remove secret.");
      process.exitCode = 1;
    }
  });
