#!/usr/bin/env node

/**
 * Core Module
 *
 * A Cucumber-based testing tool built to support behavior-driven development.
 */

import chalk                from "chalk";
import { watch            } from "chokidar";
import minimist             from "minimist";
import { clear, log       } from "node:console";
import fs                   from "node:fs";
import os                   from "node:os";
import path                 from "node:path";
import { deserializeError } from "serialize-error";

import { config                } from "@/config/all";
import { Command, SPECIFY_ARGS } from "./lib/Command";

import type { ISpecifyArgs } from "./lib/Command";

import { TestCommand, TEST_COMMAND_DEFAULT_OPTS } from "./lib/TestCommand";

const PACKAGE_NAME = "@specify/core";

const getSpecifyArgs = (args: minimist.ParsedArgs): ISpecifyArgs => {
    return Object.entries(args)
        .filter(([key]) => SPECIFY_ARGS.includes(key))
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
};

const minOpts     = {};
const args        = minimist(process.argv.slice(2), minOpts);
const specifyArgs = getSpecifyArgs(args);

let cmd: Command;

switch (args._[0]?.toLowerCase()) {
    case "test":
        args._.shift();
    // fall through to default
    default:
        cmd = new TestCommand({
            "cucumber":     config.cucumber,
            "debug":        config.debug,
            "gherkinPaths": [path.resolve(config.paths.gherkin)],
            "logPath":      path.resolve(
                config.paths.logs,
                TEST_COMMAND_DEFAULT_OPTS.logPath,
            ),
            "plugins": [
                ...config.plugins,
                path.resolve(import.meta.dirname, "../dist/cucumber"),
            ],
        });
}

if (specifyArgs.watch) {
    clear();

    const promptPrefix =
        chalk.cyan("[") + chalk.greenBright(PACKAGE_NAME) + chalk.cyan("]");
    const lockFilePath = path.join(os.tmpdir(), `specify-core-watch.lock`);
    const watchPaths   = config.paths.watch?.paths.map((watchPath) =>
        path.resolve(watchPath),
    );

    if (!watchPaths || watchPaths.length === 0) {
        log(
            `${promptPrefix} No watch paths configured. Please set "paths.watch.paths" in specify.config.json.`,
        );
        log(`${promptPrefix} Exiting...`);

        process.exit(1);
    }

    // remove the lock file if it exists (to ensure a clean start)
    if (fs.existsSync(lockFilePath)) {
        fs.unlinkSync(lockFilePath);
    }

    let executionQueued  = false;
    let initialExecution = true;

    watch(
        config.paths.watch?.paths.map((watchPath) => path.resolve(watchPath)),
        {
            "ignored": config.paths.watch?.ignore.map(
                (ignorePattern) => new RegExp(ignorePattern),
            ) ?? [/\/node_modules\//, /\/dist\//],
            "persistent": true,
        },
    ).on("all", async (event) => {
        if (executionQueued) {
            return;
        }

        if (["add", "change", "unlink"].includes(event)) {
            if (fs.existsSync(lockFilePath) && !executionQueued) {
                // if a lock file exists, queue the execution and await the removal of the lock file
                executionQueued = true;

                // the initial execution is already running; don't queue it again
                if (initialExecution) {
                    return;
                }

                await new Promise((resolve) => {
                    const watcher = fs.watch(
                        lockFilePath,
                        { "persistent": true },
                        (eventType) => {
                            // there are only 2 event types: rename and change
                            // rename indicates the file was deleted or moved or otherwise isn't there anymore
                            if (eventType === "rename") {
                                watcher.close();

                                resolve(null);
                            }
                        },
                    );
                });
            }

            try {
                // create the lock file in the temporary directory
                fs.writeFileSync(lockFilePath, "");

                const res = await cmd.execute(args);

                if (res.error) {
                    throw deserializeError(res.error);
                }
            } catch (error) {
                log("Error executing command:", error);
            } finally {
                // remove the lock file after executionasd
                fs.unlinkSync(lockFilePath);

                log(`\n${promptPrefix} Watching for changes...\n`);

                executionQueued = false;
                initialExecution = false;
            }
        }
    });
} else {
    const res = await cmd.execute(args);

    if (res.error) {
        log((res.debug)
            ? deserializeError(res.error)
            : deserializeError(res.error).message
        )
    }

    process.exit(res.status);
}
