"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const orval_1 = require("orval");
const path_1 = __importDefault(require("path"));
const root = path_1.default.resolve(__dirname, "..", "..");
const apiClientReactSrc = path_1.default.resolve(root, "lib", "api-client-react", "src");
const apiZodSrc = path_1.default.resolve(root, "lib", "api-zod", "src");
// Our exports make assumptions about the title of the API being "Api" (i.e. generated output is `api.ts`).
const titleTransformer = (config) => {
    config.info ??= {};
    config.info.title = "Api";
    return config;
};
exports.default = (0, orval_1.defineConfig)({
    "api-client-react": {
        input: {
            target: "./openapi.yaml",
            override: {
                transformer: titleTransformer,
            },
        },
        output: {
            workspace: apiClientReactSrc,
            target: "generated",
            client: "react-query",
            mode: "split",
            baseUrl: "/api",
            clean: true,
            override: {
                fetch: {
                    includeHttpResponseReturnType: false,
                },
                mutator: {
                    path: path_1.default.resolve(apiClientReactSrc, "custom-fetch.ts"),
                    name: "customFetch",
                },
            },
        },
        hooks: {
            afterAllFilesWrite: "prettier --write",
        },
    },
    zod: {
        input: {
            target: "./openapi.yaml",
            override: {
                transformer: titleTransformer,
            },
        },
        output: {
            workspace: apiZodSrc,
            client: "zod",
            target: "generated/api.ts",
            clean: true,
            override: {
                zod: {
                    coerce: {
                        query: ['boolean', 'number', 'string'],
                        param: ['boolean', 'number', 'string'],
                        body: ['bigint', 'date'],
                        response: ['bigint', 'date'],
                    },
                },
                useDates: true,
                useBigInt: true,
            },
        },
        hooks: {
            afterAllFilesWrite: "prettier --write",
        },
    },
});
