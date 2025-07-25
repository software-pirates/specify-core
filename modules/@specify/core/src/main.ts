#!/usr/bin/env node

/**
 * Core Module
 *
 * A Cucumber-based testing tool built to support behavior-driven development.
 */

import merge                from "deepmerge";
import minimist             from "minimist";
import { log              } from "node:console";
import path                 from "node:path";
import { deserializeError } from "serialize-error";

import { config                } from "@/config/all";
import { Command, SPECIFY_ARGS } from "./lib/Command";
import { TestCommandWatcher    } from "./lib/TestCommandWatcher";

import type { ISpecifyArgs } from "./lib/Command";

import { TestCommand, TEST_COMMAND_DEFAULT_OPTS } from "./lib/TestCommand";

const getSpecifyArgs = (args: minimist.ParsedArgs): ISpecifyArgs => {
    return Object.entries(args)
        .filter(([key]) => SPECIFY_ARGS.includes(key))
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
};

const minOpts     = { "boolean": SPECIFY_ARGS };
const args        = minimist(process.argv.slice(2), minOpts);
const specifyArgs = getSpecifyArgs(args);

let cucumberCfg = config.cucumber;
let cmd: Command;

// resolve plugins
for (const plugin of config.plugins) {
    const mod = await import(plugin);

    for (const prop in mod.default) {
        switch (prop) {
            case "cucumber":
                cucumberCfg = merge(cucumberCfg, mod.default.cucumber);
                break;
        }
    }
}

// add core cucumber support code path
cucumberCfg.import.push(path.resolve(import.meta.dirname, "cucumber"));

switch (args._[0]?.toLowerCase()) {
    case "test":
        args._.shift();
    // fall through to default
    default:
        cmd = new TestCommand({
            "cucumber":     cucumberCfg,
            "debug":        config.debug,
            "gherkinPaths": [path.resolve(config.paths.gherkin)],
            "logPath":      path.resolve(config.paths.logs, TEST_COMMAND_DEFAULT_OPTS.logPath),
        });
}

if (specifyArgs.watch) {
    const watcher = new TestCommandWatcher(cmd as TestCommand);

    await watcher.start(args);
} else {
    const res = await cmd.execute(args);

    if (res.error) {
        log(res.debug ? deserializeError(res.error) : deserializeError(res.error).message);
    }

    process.exit(res.status);
}
