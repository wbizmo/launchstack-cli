"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
function successResponse(data, meta) {
    return meta
        ? {
            data,
            meta
        }
        : {
            data
        };
}
