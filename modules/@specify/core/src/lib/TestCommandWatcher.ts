/**
 * TestCommandWatcher class module
 *
 * A decorator for TestCommand that provides file watching functionality with
 * debounced execution to run tests when files change.
 */

import _                    from "lodash";
import chalk                from "chalk";
import { watch            } from "chokidar";
import { clear, log       } from "node:console";
import fs                   from "node:fs";
import os                   from "node:os";
import path                 from "node:path";
import { deserializeError } from "serialize-error";
import { config           } from "@/config/all";

import type { ParsedArgs  } from "minimist";
import type { TestCommand } from "./TestCommand";

export interface ITestCommandWatcherOptions {
    debounceMs?: number;
    packageName?: string;
}

const DEBOUNCE_MS  = 500;
const PACKAGE_NAME = "@specify/core";

export class TestCommandWatcher {
    /**
     * The TestCommand instance to execute when files change.
     */
    #command: TestCommand;

    /**
     * Configuration object for accessing debug settings.
     */
    #config = config;

    /**
     * Whether or not debug mode is enabled.
     *
     * @remarks
     * The global debug setting is used, but it can be overridden by the watch
     * configuration.
     */
    #debug = this.#config.debug || this.#config.watch.debug;

    /**
     * Debounced execution function.
     */
    #debouncedExecution: ReturnType<typeof _.debounce>;

    /**
     * Flag to track if an execution is currently queued.
     */
    #executionQueued = false;

    /**
     * Patterns to ignore when watching files.
     */
    #ignoredPatterns = this.#config.watch.ignore.map(
        (ignorePattern) => new RegExp(ignorePattern),
    );

    /**
     * Flag to track if this is the initial execution.
     */
    #initialExecution = true;

    /**
     * Path to the lock file used to prevent concurrent executions.
     */
    #lockFilePath: string;

    /**
     * Prompt prefix for console output.
     */
    #promptPrefix: string;

    /**
     * Flag to indicate if a restart is required due to configuration changes.
     */
    #restartRequired = false;

    /**
     * Events to watch for file system changes.
     */
    #watchEvents: string[] = this.#config.watch.events ?? [
        "add",
        "change",
        "unlink",
    ];

    /**
     * Initialize the TestCommandWatcher.
     *
     * @param command - The TestCommand instance to watch and execute
     */
    constructor(command: TestCommand) {
        this.#command = command;
        this.#lockFilePath = path.join(os.tmpdir(), `specify-core-watch.lock`);
        this.#promptPrefix =
            chalk.cyan("[") + chalk.greenBright(PACKAGE_NAME) + chalk.cyan("]");

        this.#debouncedExecution = _.debounce(
            this.#executeCommand.bind(this),
            DEBOUNCE_MS,
        );
    }

    /**
     * Log debug messages when debug mode is enabled.
     *
     * @param message - The debug message to log
     * @param data    - Optional additional data to log
     * @param force   - Whether to force logging even if debug is disabled
     */
    #debugLog(message: string, data?: unknown, force?: boolean): void {
        if (!this.#debug && !force) {
            return;
        }

        const debugMessage = `${this.#promptPrefix}${chalk.gray("[DEBUG]")} ${message}`;

        log(debugMessage);

        if (data !== undefined) {
            log(chalk.gray(JSON.stringify(data, null, 2)));
        }
    }

    /**
     * Execute the TestCommand with proper error handling and lock file management.
     *
     * @param args - Command line arguments to pass to the TestCommand
     */
    async #executeCommand(args: ParsedArgs): Promise<void> {
        try {
            this.#debugLog(
                `Creating lock file (${chalk.gray(this.#lockFilePath)})...`,
            );

            fs.writeFileSync(this.#lockFilePath, "");

            this.#debugLog(
                `Executing test command (initial execution? ${this.#initialExecution ? "yes" : "no"})...`,
            );

            const res = await this.#command.execute(args);

            if (res.error) {
                throw deserializeError(res.error);
            }
        } catch (error) {
            this.#debugLog(
                `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
                error,
                true,
            );
        } finally {
            this.#debugLog(
                `Removing lock file (${chalk.gray(this.#lockFilePath)}) and resetting state...`,
            );
            fs.unlinkSync(this.#lockFilePath);

            log(`\n${this.#promptPrefix} Watching for changes...\n`);

            this.#executionQueued = false;
            this.#initialExecution = false;
        }
    }

    /**
     * Check if the configuration file has changed based on the file path.
     */
    #hasConfigChanged(filePath: string): boolean {
        if (!this.#initialExecution) {
            const projectRoot = path.resolve(process.cwd());
            const configPath  = path.join(projectRoot, "specify.config.json");

            if (path.resolve(filePath) === configPath) {
                return true;
            }
        }

        return false;
    }

    /**
     * Notify the user that the configuration file has changed and the watcher needs to be restarted.
     */
    #notifyConfigChange(): void {
        const warningMessage = `${this.#promptPrefix}${chalk.yellow("[Notice]")} specify.config.json has been modified.`;
        const restartMessage = `${this.#promptPrefix}${chalk.yellow("[Notice]")} Please restart the watcher to pick up the configuration changes.`;

        log(`${warningMessage}\n${restartMessage}`);
    }

    /**
     * Queue the execution of the command, setting the flag to prevent multiple executions.
     */
    #queueExecution(): void {
        this.#executionQueued = true;

        if (this.#initialExecution) {
            this.#debugLog("Skipping queue: initial execution running.");

            return;
        }

        this.#debugLog(
            `Execution queued: waiting for lock file removal (${chalk.gray(this.#lockFilePath)})...`,
        );
    }

    /**
     * Start watching for file changes and execute the command when changes occur.
     *
     * @param args - Command line arguments to pass to the TestCommand
     */
    async start(args: ParsedArgs): Promise<void> {
        clear();

        const watchPaths = config.watch.paths.map((watchPath) =>
            path.resolve(watchPath),
        );

        if (watchPaths.length === 0) {
            log(
                `${this.#promptPrefix} No watch paths configured. Please set "watch.paths" in specify.config.json.`,
            );
            log(`${this.#promptPrefix} Exiting...`);

            process.exit(1);
        }

        // remove the lock file if it exists (to ensure a clean start)
        if (fs.existsSync(this.#lockFilePath)) {
            fs.unlinkSync(this.#lockFilePath);
        }

        watch(watchPaths, {
            "ignored":    this.#ignoredPatterns,
            "persistent": true,
        }).on("all", async (event, filePath) => {
            this.#debugLog(`Detected ${event} event for ${filePath}`);

            if (this.#restartRequired || this.#hasConfigChanged(filePath)) {
                this.#restartRequired = true;

                this.#notifyConfigChange();

                return;
            }

            if (this.#executionQueued) {
                this.#debugLog("Execution prevented: already queued.");

                return;
            }

            if (this.#watchEvents.includes(event)) {
                if (
                    fs.existsSync(this.#lockFilePath) &&
                    !this.#executionQueued
                ) {
                    this.#queueExecution();

                    await this.#waitForLockFileRemoval();
                }

                this.#debugLog(
                    `Triggering debounced execution (debounced ${DEBOUNCE_MS}ms)...`,
                );

                void this.#debouncedExecution(args);
            }
        });
    }

    /**
     * Wait for the lock file to be removed before proceeding with execution.
     */
    async #waitForLockFileRemoval(): Promise<void> {
        return new Promise<void>((resolve) => {
            const watcher = fs.watch(
                this.#lockFilePath,
                { "persistent": true },
                (eventType) => {
                    // there are only 2 event types here: rename and change
                    // rename indicates the file was deleted, moved, or otherwise isn't there anymore
                    if (eventType === "rename") {
                        this.#debugLog(
                            "Lock file removed, proceeding with queued execution.",
                        );

                        watcher.close();
                        resolve();
                    }
                },
            );
        });
    }
}
