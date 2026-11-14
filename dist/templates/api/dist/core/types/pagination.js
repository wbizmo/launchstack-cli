"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaginationMeta = createPaginationMeta;
function createPaginationMeta(input, total) {
    return {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: total === 0
            ? 0
            : Math.ceil(total / input.limit)
    };
}
