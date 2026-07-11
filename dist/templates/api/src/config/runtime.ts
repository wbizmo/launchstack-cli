export type RuntimeInfo = {
  nodeVersion: string;
  platform: NodeJS.Platform;
  pid: number;
  startedAt: string;
};

const startedAt = new Date().toISOString();

export function getRuntimeInfo(): RuntimeInfo {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    startedAt
  };
}
