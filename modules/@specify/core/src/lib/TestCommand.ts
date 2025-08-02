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
import { serializeError } from "serialize-error";

import { Command, CommandResultStatus, SPECIFY_ARGS } from "./Command";
import { CucumberTool                               } from "./CucumberTool";

import type { ParsedArgs } from "minimist";

import type {
    IConfiguration,
    IRunConfiguration,
    IRunEnvironment,
    IRunResult,
} from "@cucumber/cucumber/api";

import type { CommandOptions, CommandResult, CommandResultDebugInfo } from "./Command";

export const TEST_COMMAND_DEFAULT_OPTS: TestCommandOptions = {
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

export interface TestCommandOptions extends CommandOptions {
    cucumber?: Partial<IConfiguration>;
    gherkinPaths?: string[];
    plugins?: string[];
}

export interface TestCommandResult extends CommandResult {
    debug?: TestCommandResultDebugInfo;
}

export interface TestCommandResultDebugInfo extends CommandResultDebugInfo {
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
     * Parse user arguments and options data to prepare operational parameters
     *
     * @param userOpts - User-supplied options
     */
    constructor(userOpts: TestCommandOptions = {}) {
        const mergedOpts = merge.all([
            {},
            TEST_COMMAND_DEFAULT_OPTS,
            userOpts,
        ]) as TestCommandOptions;

        super({
            "debug":   mergedOpts.debug,
            "logPath": mergedOpts.logPath,
        });

        this.cucumber = mergedOpts.cucumber;
        this.gherkinPaths = mergedOpts.gherkinPaths;

        // Cucumber formatters ensure that user's test result details are logged
        // in some permanent form
        this.cucumber.format.push(["json", this.logPath]);
    }

    /**
     * Execute tests with Cucumber.  Consider a no-op result from Cucumber to
     * be an error condition.
     *
     * @param userArgs - User-supplied arguments
     *
     * @returns The Command result
     */
    async execute(userArgs: ParsedArgs): Promise<TestCommandResult> {
        const testRes: TestCommandResult = {
            "ok":     false,
            "status": CommandResultStatus.error,
        };

        if (this.debug) {
            testRes.debug = { "args": userArgs };
        }

        try {
            const cucumberConfig    = this.#buildCucumberConfig(userArgs);
            const cucumberRunConfig = await CucumberTool.loadConfiguration(cucumberConfig);
            const cucumberEnv       = { "debug": this.debug };

            if (this.debug) {
                testRes.debug.cucumber = {
                    "runConfiguration": cucumberRunConfig,
                    "runEnvironment":   cucumberEnv,
                };
            }

            const cucumberRes = await CucumberTool.runCucumber(cucumberRunConfig, cucumberEnv);

            if (this.debug) {
                testRes.debug.cucumber.runResult = cucumberRes;
            }

            testRes.ok = cucumberRes.success;
            testRes.status = cucumberRes.success
                ? CommandResultStatus.success
                : CommandResultStatus.failure;
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
    #buildCucumberConfig(args: ParsedArgs): IConfiguration {
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
                    // only throw for non-Cucumber args that are not our own custom execution args
                    if (!SPECIFY_ARGS.includes(optKey)) {
                        throw new Error(`Invalid option: --${optKey}`);
                    }
            }
        }

        return config;
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
