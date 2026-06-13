import { LaunchStackClient } from "../src";

const client = new LaunchStackClient({
  apiKey: "ls_test_your_api_key",
  baseUrl: "https://api.launchstack.dev/v1"
});

async function main() {
  const launches = await client.listLaunches();

  console.log("Launches:", launches);
}

main().catch((error) => {
  console.error(error);
});
