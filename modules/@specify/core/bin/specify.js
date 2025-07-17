#!/usr/bin/env node

// wrapper to silence install warnings about the bin target not existing prior to a build

import process from "node:process";
import { error } from "node:console";

import("../dist/main.js").catch((err) => {
    switch (err.code) {
        case "ERR_MODULE_NOT_FOUND":
            error(
                "Module not found. Have you built the project? Run `npm run build`.",
            );
            break;
        case "ERR_REQUIRE_ESM":
            error(
                "This module requires ESM support. Please ensure your Node.js version supports ESM.",
            );
            break;
        default:
            error("An unexpected error occurred:", err);
    }

    process.exit(1);
});
