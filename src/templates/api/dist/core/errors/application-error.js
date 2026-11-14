"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationError = void 0;
class ApplicationError extends Error {
    constructor(options) {
        super(options.message);
        this.name = "ApplicationError";
        this.statusCode = options.statusCode;
        this.code = options.code;
        this.details = options.details;
    }
}
exports.ApplicationError = ApplicationError;
