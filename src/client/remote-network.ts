import { BlockList } from "node:net";
import type { Agent } from "node:https";

const nonPublicIPv4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  nonPublicIPv4.addSubnet(network, prefix, "ipv4");
const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");
const nonPublicIPv6 = new BlockList();
for (const [network, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["::", 96],
] as const)
  nonPublicIPv6.addSubnet(network, prefix, "ipv6");

function isPublicAddress(address: string, family: number): boolean {
  if (family === 4) return !nonPublicIPv4.check(address, "ipv4");
  return (
    family === 6 &&
    globalIPv6.check(address, "ipv6") &&
    !nonPublicIPv6.check(address, "ipv6")
  );
}

export function validateRemoteAddresses(
  addresses: Array<{ address: string; family: number }>,
): Array<{ address: string; family: number }> {
  if (
    addresses.length === 0 ||
    addresses.some(({ address, family }) => !isPublicAddress(address, family))
  )
    throw new Error(
      "Remote OpenAPI schema host resolves to a non-public address.",
    );
  return addresses;
}

export function createPinnedLookup(
  addresses: Array<{ address: string; family: number }>,
): NonNullable<ConstructorParameters<typeof Agent>[0]>["lookup"] {
  return (_requestedHostname, options, callback) => {
    if (options?.all) {
      callback(null, addresses);
    } else {
      const selected = addresses[0];
      if (!selected)
        callback(new Error("Remote host has no usable address."), "", 0);
      else callback(null, selected.address, selected.family);
    }
  };
}
