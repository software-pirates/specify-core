import path                 from "node:path";
import { deserializeError } from "serialize-error";

import { TestCommand, TestCommandOptions } from "./TestCommand";
import { CucumberTool                    } from "./CucumberTool";

const { mockRunCucumber, mockLoadConfiguration, mockLoadSupport } = vi.hoisted(() => {
    return {
        "mockRunCucumber":       vi.fn(),
        "mockLoadConfiguration": vi.fn(async (config) => ({
            "sources": config,
        })),
        "mockLoadSupport": vi.fn(),
    };
});

vi.mock("./CucumberTool", () => ({
    "CucumberTool": {
        "loadConfiguration": mockLoadConfiguration,
        "loadSupport":       mockLoadSupport,
        "runCucumber":       mockRunCucumber,
    },
}));

describe("TestCommand", () => {
    const emptyArgs = { "_": [] };

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("execute()", () => {
        describe("parses command arguments", () => {
            it("paths", async () => {
                const featPath = "./assets/gherkin/binary/passing.feature";
                const userArgs = { "_": [featPath] };
                const cmd      = new TestCommand();

                await cmd.execute(userArgs);

                expect(CucumberTool.loadConfiguration).toHaveBeenCalledWith(
                    expect.objectContaining({
                        "paths": [path.resolve(featPath)],
                    }),
                );
            });

            it("tags", async () => {
                const userArgs = { "tags": ["@foo", "not @bar"], ...emptyArgs };
                const userOpts = { "debug": true };
                const cmd      = new TestCommand(userOpts);

                await cmd.execute(userArgs);

                expect(CucumberTool.loadConfiguration).toHaveBeenCalledWith(
                    expect.objectContaining({
                        "tags": "(@foo) and (not @bar)",
                    }),
                );
            });
        });

        describe("returns", () => {
            const userOpts: Partial<TestCommandOptions> = {
                "cucumber": {
                    "import": [path.resolve(import.meta.dirname, "../../dist/cucumber")],
                },
                "logPath": path.resolve(`./logs/specify-test-vitest-log-${Date.now()}.json`),
            };

            describe("test results", () => {
                it("passing", async () => {
                    const userArgs = { "_": ["./assets/gherkin/binary/passing.feature"] };
                    const cmd      = new TestCommand(userOpts);

                    mockRunCucumber.mockResolvedValueOnce({
                        "success": true,
                    });

                    const res = await cmd.execute(userArgs);

                    expect(res.ok).toBe(true);
                    expect(res.status).toBe(0);
                });

                it("failing", async () => {
                    const userArgs = { "_": ["./assets/gherkin/binary/failing.feature"] };
                    const cmd      = new TestCommand(userOpts);

                    mockRunCucumber.mockResolvedValueOnce({
                        "success": false,
                    });

                    const res = await cmd.execute(userArgs);

                    expect(res.ok).toBe(false);
                    expect(res.status).toBe(1);
                });
            });

            describe("errors", () => {
                it("any error reports error status", async () => {
                    mockRunCucumber.mockRejectedValueOnce(Error("test"));

                    const res = await new TestCommand().execute(emptyArgs);

                    expect(res.ok).toBe(false);
                    expect(res.status).toBe(2);
                });

                it("no executed tests", async () => {
                    const error    = Error("No tests were executed.");
                    const userArgs = { "_": ["./assets/gherkin/empty"] };

                    mockRunCucumber.mockRejectedValueOnce(error);

                    const res = await new TestCommand().execute(userArgs);

                    expect(deserializeError(res.error)).toEqual(error);
                });

                it("unsupported command option", async () => {
                    const error    = Error("Invalid option: --bad");
                    const userArgs = { ...emptyArgs, "bad": "test" };

                    const res = await new TestCommand().execute(userArgs);

                    expect(deserializeError(res.error)).toEqual(error);
                });

                it("invalid test file path", async () => {
                    const error    = Error("Invalid path: ./path/that/doesnt/exist/");
                    const userArgs = { "_": ["./path/that/doesnt/exist/"] };

                    const res = await new TestCommand().execute(userArgs);

                    expect(deserializeError(res.error)).toEqual(error);
                });
            });
        });
    });
});
