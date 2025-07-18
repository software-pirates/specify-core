import deepmerge         from "deepmerge";
import fs                from "node:fs";
import path              from "node:path";
import { globbySync    } from "globby";
import { pathToFileURL } from "node:url";

import type { CoreConfig } from "~/types";

// the user's override file should be in the *current working directory*
const configPath = `${process.cwd()}/specify.config.json`;

let userConfig = {} as Partial<CoreConfig>;

if (fs.existsSync(configPath)) {
    userConfig = (
        await import(pathToFileURL(configPath).href, {
            "with": { "type": "json" },
        })
    ).default as Partial<CoreConfig>;
}

export const entries = await Promise.all(
    globbySync(path.join(import.meta.dirname, "*.config.*"), {
        "absolute":  true,
        "ignore":    ["**/*.d.ts"],
        "onlyFiles": true,
    }).map(async (modulePath) => {
        const module = await import(pathToFileURL(modulePath).href);
        const keys   = Object.keys(module);

        if (keys.length > 1) {
            throw new Error(
                `Config modules should only have 1 export, but ${modulePath} has ${keys.length}.`,
            );
        }

        const key = keys.shift();

        return [key, module[key]];
    }),
);

export const config = deepmerge(Object.fromEntries(entries), userConfig) as CoreConfig;
