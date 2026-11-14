"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuntimeInfo = getRuntimeInfo;
const startedAt = new Date().toISOString();
function getRuntimeInfo() {
    return {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        startedAt
    };
}
