import { loadConfiguration, loadSupport, runCucumber } from "@cucumber/cucumber/api";

import type {
    IConfiguration,
    IRunConfiguration,
    IRunEnvironment,
    IRunOptions,
    IRunResult,
    ISupportCodeLibrary,
} from "@cucumber/cucumber/api";

import { Logger } from "./Logger";

/**
 * Encapsulates the lifecycle of configuring, loading support, and running
 * Cucumber test executions, with result logging handled by Logger.
 *
 * Handles caching of support code to work around Node.js module caching,
 * and manages temporary log files to record and validate test execution output.
 */
export class CucumberTool {
    /**
     * Path to the temporary JSON log file that stores Cucumber test run results.
     */
    static #logPath: string;

    /**
     * Cached Cucumber support code to be reused across multiple executions.
     *
     * @remarks
     * Cucumber's support code import logic doesn't work properly across
     * multiple executions due to Node.js's caching of module exports.  To work
     * around this, we need to pre-load support code and reuse it for all
     * executions or test runs after the first will fail with unsupported steps.
     *
     * @see {@link https://github.com/cucumber/cucumber-js/blob/main/docs/javascript_api.md#preloading-and-reusing-support-code|Cucumber.js Javascript API documentation}
     */
    static #supportCode: ISupportCodeLibrary;

    /**
     * Logger instance used for managing temporary log file path generation,
     * reading, and deletion.
     */
    static #logger: Logger = new Logger();

    /**
     * Inject custom Logger instance (for alternative behavior or testing).
     */
    static set logger(logger: Logger) {
        this.#logger = logger;
    }

    /**
     * Load and prepare Cucumber run configuration, including setting up
     * the JSON log output path and preloading support code.
     *
     * @param config - Partial Cucumber configuration provided by the user
     *
     * @returns A fully resolved and prepared Cucumber run configuration object
     */
    static async loadConfiguration(config: Partial<IConfiguration>): Promise<IRunConfiguration> {
        CucumberTool.#logPath = await this.#logger.generateTmpLogPath("specify-test");

        // Append JSON output formatter for Cucumber run results
        config.format.push(["json", this.#logPath]);

        const runConfig = (await loadConfiguration({ "provided": config })).runConfiguration;

        await this.#loadSupport(runConfig);

        return runConfig;
    }

    /**
     * Preload and cache Cucumber support code library.
     *
     * @param runConfig - The Cucumber run configuration for which support
     *                    code should be loaded.
     */
    static async #loadSupport(runConfig: IRunConfiguration): Promise<void> {
        this.#supportCode ??= await loadSupport(runConfig);
    }

    /**
     * Execute the Cucumber test run. No tests run is considered an error.
     *
     * @param options     - The run options for the test execution
     * @param environment - Environment configuration
     *
     * @returns The result of the Cucumber test run.
     *
     * @throws Will throw if no tests were executed or other internal errors occur.
     */
    static async runCucumber(
        options: IRunOptions,
        environment?: IRunEnvironment,
    ): Promise<IRunResult> {
        const finalConfig = {
            ...options,
            "support": this.#supportCode,
        };

        const runResult = await runCucumber(finalConfig, environment);

        await this.#checkForRunErrors();

        return runResult;
    }

    /**
     * Checks the temporary log file for valid test run results.
     *
     * @throws Throws if no tests were executed or results
     *         cannot be parsed properly.
     */
    static async #checkForRunErrors(): Promise<void> {
        const scenarioResults = await this.#logger.consumeTmpLog(this.#logPath);

        if (!Array.isArray(scenarioResults) || scenarioResults.length === 0) {
            throw new Error("No tests were executed.");
        }
    }
}
