/**
 * TestCommand class module
 *
 * Conduct tests by using Cucumber to translate Gherkin specifications into
 * actionable, automated tests.
 */

import merge              from "deepmerge";
import assert             from "node:assert/strict";
import fs                 from "node:fs";
import path               from "node:path";
import os                 from "node:os";
import { serializeError } from "serialize-error";

import { loadConfiguration, loadSupport, runCucumber } from "@cucumber/cucumber/api";

import { Command, CommandResultStatus } from "./Command";

import type { ParsedArgs } from "minimist";

import type {
    IConfiguration,
    IRunConfiguration,
    IRunEnvironment,
    IRunResult,
    ISupportCodeLibrary,
} from "@cucumber/cucumber/api";

import type { ICommandOptions, ICommandResult, ICommandResultDebugInfo } from "./Command";

export const TEST_COMMAND_DEFAULT_OPTS: ITestCommandOptions = {
    "cucumber": {
        "format": [],
        "import": [],
        "paths":  [],
        "tags":   "",
    },
    "debug":        false,
    "gherkinPaths": [],
    "logPath":      `./specify-test-log-${Date.now()}.json`,
};

export interface ITestCommandOptions extends ICommandOptions {
    cucumber: Partial<IConfiguration>;
    gherkinPaths: string[];
}

export interface ITestCommandResult extends ICommandResult {
    debug?: ITestCommandResultDebugInfo;
}

export interface ITestCommandResultDebugInfo extends ICommandResultDebugInfo {
    cucumber?: {
        runConfiguration?: IRunConfiguration;
        runEnvironment?: IRunEnvironment;
        runResult?: IRunResult;
    };
}

export class TestCommand extends Command {
    /**
     * A raw Cucumber configuration.
     */
    cucumber: Partial<IConfiguration>;

    /**
     * A list of paths to Gherkin feature files this Command should execute.
     */
    gherkinPaths: string[];

    /**
     * Cucumber support code, which must be reused across executions
     */
    support: ISupportCodeLibrary;

    /**
     * The file system temporary path to write result output to.
     */
    tmpPath: string;

    /**
     * Parse user arguments and options data to prepare operational parameters
     *
     * @param userOpts - User-supplied options
     */
    constructor(userOpts: Partial<ITestCommandOptions>) {
        const mergedOpts = merge.all([
            {},
            TEST_COMMAND_DEFAULT_OPTS,
            userOpts,
        ]) as ITestCommandOptions;

        super({ "debug": mergedOpts.debug, "logPath": mergedOpts.logPath });

        this.cucumber = mergedOpts.cucumber;
        this.gherkinPaths = mergedOpts.gherkinPaths;
        this.tmpPath = path.join(
            fs.mkdtempSync(path.join(os.tmpdir(), "specify-test-")),
            `${Date.now()}.json`,
        );

        // these Cucumber formatters ensure that test result details are logged in some permanent form; the former is
        // for users' purposes, while the latter is for internal use
        this.cucumber.format.push(["json", this.logPath]);
        this.cucumber.format.push(["json", this.tmpPath]);
    }

    /**
     * Execute tests with Cucumber.  Consider a no-op result from Cucumber to
     * be an error condition.
     *
     * @remarks
     * Cucumber's support code import logic doesn't work properly across
     * multiple executions due to Node.js's caching of module exports.  To work
     * around this, we need to pre-load support code and reuse it for all
     * executions or test runs after the first will fail with unsupported steps.
     *
     * @see {@link https://github.com/cucumber/cucumber-js/blob/main/docs/javascript_api.md#preloading-and-reusing-support-code|Cucumber.js Javascript API documentation}
     *
     * @param userArgs - User-supplied arguments
     *
     * @returns The Command result
     */
    async execute(userArgs: ParsedArgs): Promise<ITestCommandResult> {
        const testRes: ITestCommandResult = { "ok": false, "status": CommandResultStatus.error };

        if (this.debug) {
            testRes.debug = { "args": userArgs };
        }

        try {
            const cucumberConfig = await this.#buildCucumberConfig(userArgs);
            const cucumberEnv    = { "debug": this.debug };

            if (this.debug) {
                testRes.debug.cucumber = {
                    "runConfiguration": cucumberConfig,
                    "runEnvironment":   cucumberEnv,
                };
            }

            // it's important that we pre-load support code so it can be reused across multiple Cucumber runs
            this.support ??= await loadSupport(cucumberConfig);

            const cucumberRes = await runCucumber(
                {
                    ...cucumberConfig,
                    "support": this.support,
                },
                cucumberEnv,
            );

            if (this.debug) {
                testRes.debug.cucumber.runResult = cucumberRes;
            }

            testRes.result = JSON.parse(fs.readFileSync(this.tmpPath, { "encoding": "utf8" }));

            if (!Array.isArray(testRes.result) || !testRes.result.length) {
                throw new Error("No tests were executed.");
            }

            testRes.ok = cucumberRes.success;
            testRes.status = cucumberRes.success
                ? CommandResultStatus.success
                : CommandResultStatus.failure;

            fs.unlinkSync(this.tmpPath);
        } catch (err) {
            testRes.error = serializeError(err);
        }

        return testRes;
    }

    /**
     * Build a ready-to-use Cucumber configuration based on command line args
     * and initialized Command options.
     *
     * @param args - Command line arguments, as parsed by Minimist
     *
     * @returns The Cucumber configuration
     *
     * @throws {@link Error}
     * If any command line args are invalid for this Command.
     */
    async #buildCucumberConfig(args: ParsedArgs): Promise<IRunConfiguration> {
        const config = merge({}, this.cucumber);

        for (const optKey in args) {
            let optVal = args[optKey];

            switch (optKey) {
                case "tags":
                    optVal = Array.isArray(optVal) ? optVal : [optVal];
                    optVal.push(config.tags);
                    config.tags = this.#parseTagArgs(optVal);
                    break;
                case "_": // gherkin paths
                    config.paths = this.#parsePathArgs(optVal);
                    break;
                default:
                    throw new Error(`Invalid option: --${optKey}`);
            }
        }

        return loadConfiguration({ "provided": config }).then((loaded) => loaded.runConfiguration);
    }

    /**
     * Parse loose arguments as paths.  Any loose args that are not valid file
     * system paths will throw an error.
     *
     * @param pathArgs - The path arguments to parse
     *
     * @returns The list of parsed paths
     *
     * @throws {@link Error}
     * If any path argument does cannot be confirmed by node:fs to exist on the
     * file system.
     */
    #parsePathArgs(pathArgs: string[]): string[] {
        let paths = [];

        // parse path arguments and ensure all of them are valid
        for (const pathArg of pathArgs) {
            const [filePath, fileLine] = pathArg.split(":");
            const absFilePath          = path.resolve(filePath);
            const absFilePathLine      = fileLine ? `${absFilePath}:${fileLine}` : absFilePath;

            assert.ok(fs.existsSync(absFilePath), new Error(`Invalid path: ${pathArg}`));

            paths.push(absFilePathLine);
        }

        // if no path arguments were supplied, fall back to the default gherkin path
        if (!paths.length) {
            paths = this.gherkinPaths.map((gherkinPath) => path.resolve(gherkinPath));
        }

        return paths;
    }

    /**
     * Filter and join Cucumber tag expressions into a single conjunction.
     *
     * @param tags - The list of tags to parse
     *
     * @returns The unified tag expression
     */
    #parseTagArgs(tags: string[]): string {
        return tags
            .filter((tag) => tag.trim().length)
            .map((tag) => `(${tag})`)
            .join(" and ");
    }
}
