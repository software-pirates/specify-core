import merge from "deepmerge";
import fs    from "node:fs";
import path  from "node:path";

import { TestCommand, ITestCommandOptions, TEST_COMMAND_DEFAULT_OPTS } from "./TestCommand";

describe("TestCommand", () => {
    const emptyArgs = { "_": [] };
    const emptyOpts = {};

    describe("constructor()", () => {
        describe("iniitializes options...", () => {
            it("...with defaults when no user options are provided", () => {
                const expOpts = merge({}, TEST_COMMAND_DEFAULT_OPTS);
                const cmd     = new TestCommand(emptyOpts);

                // default options get augmented with cucumber formatters for the log and tmp paths
                expOpts.cucumber.format.push(["json", cmd.logPath], ["json", cmd.tmpPath]);

                expect(cmd.cucumber).toEqual(expOpts.cucumber);
                expect(cmd.gherkinPaths).toEqual(expOpts.gherkinPaths);
            });

            it("...with merged values when user options are provided", () => {
                const userOpts = { "gherkinPaths": ["./fake/path"] };
                const cmd      = new TestCommand(userOpts);

                expect(cmd.gherkinPaths).toEqual(userOpts.gherkinPaths);
            });
        });
    });

    // these tests run Cucumber and are best understood as integration tests until the underlying code has been
    // refactored
    describe("execute()", () => {
        describe("parses command arguments", () => {
            describe("paths", () => {
                it("valid", async () => {
                    const featPath = "./assets/gherkin/binary/passing.feature:3";
                    const userArgs = { "_": [featPath] };
                    const userOpts = { "debug": true };
                    const cmd      = new TestCommand(userOpts);
                    const res      = await cmd.execute(userArgs);

                    expect(res.status).toBe(1); // no support code imported, so steps are undefined
                    expect(res.debug?.args).toBe(userArgs);
                    expect(res.debug?.cucumber?.runConfiguration?.sources?.paths).toEqual([
                        path.resolve(featPath),
                    ]);
                });

                it("invalid", async () => {
                    const userArgs = { "_": ["./path/that/doesnt/exist/"] };
                    const cmd      = new TestCommand(emptyOpts);
                    const res      = await cmd.execute(userArgs);

                    expect(res.error.message).toMatch(/Invalid path:/);
                });
            });

            it("tags", async () => {
                const userArgs = { "tags": ["@foo", "not @bar"], ...emptyArgs };
                const userOpts = { "debug": true };
                const cmd      = new TestCommand(userOpts);
                const res      = await cmd.execute(userArgs);

                expect(res.status).toBe(2); // no scenarios should match these tags
                expect(res.debug?.args).toBe(userArgs);
                expect(res.debug?.cucumber?.runConfiguration?.sources?.tagExpression).toBe(
                    "(@foo) and (not @bar)",
                );
            });
        });

        describe("runs tests", () => {
            let userOpts: Partial<ITestCommandOptions> = {};

            beforeAll(() => {
                userOpts = {
                    "cucumber": {
                        "import": [path.resolve(import.meta.dirname, "../../dist/cucumber")],
                    },
                    "logPath": path.resolve(`./logs/specify-test-vitest-log-${Date.now()}.json`),
                };
            });

            it("pass", async () => {
                const userArgs = { "_": ["./assets/gherkin/binary/passing.feature"] };
                const cmd      = new TestCommand(userOpts);
                const res      = await cmd.execute(userArgs);

                expect(fs.existsSync(cmd.logPath)).toBe(true);

                const logFileText = fs.readFileSync(cmd.logPath, { "encoding": "utf8" });
                const logFileJSON = JSON.parse(logFileText);

                expect(res.ok).toBe(true);
                expect(res.status).toBe(0);
                expect(res.result).toEqual(logFileJSON);
            });

            it("fail", async () => {
                const userArgs = { "_": ["./assets/gherkin/binary/failing.feature"] };
                const cmd      = new TestCommand(userOpts);
                const res      = await cmd.execute(userArgs);

                expect(fs.existsSync(cmd.logPath)).toBe(true);

                const logFileText = fs.readFileSync(cmd.logPath, { "encoding": "utf8" });
                const logFileJSON = JSON.parse(logFileText);

                expect(res.ok).toBe(false);
                expect(res.status).toBe(1);
                expect(res.result).toEqual(logFileJSON);
            });

            it("error", async () => {
                const userArgs = { "_": ["./assets/gherkin/empty"] };
                const cmd      = new TestCommand(userOpts);
                const res      = await cmd.execute(userArgs);

                expect(fs.existsSync(cmd.logPath)).toBe(true);

                const logFileText = fs.readFileSync(cmd.logPath, { "encoding": "utf8" });
                const logFileJSON = JSON.parse(logFileText);

                expect(res.ok).toBe(false);
                expect(res.status).toBe(2);
                expect(res.error).toBeTruthy();
                expect(res.result).toEqual(logFileJSON);
            });
        });
    });
});
