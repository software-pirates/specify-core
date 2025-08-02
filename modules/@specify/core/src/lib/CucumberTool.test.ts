import { IConfiguration, IRunEnvironment, IRunOptions } from "@cucumber/cucumber/api";
import { CucumberTool                                 } from "./CucumberTool";
import { Logger                                       } from "./Logger";

const { mockRunCucumber, mockLoadConfiguration, mockLoadSupport } = vi.hoisted(() => {
    return {
        "mockRunCucumber":       vi.fn(),
        "mockLoadConfiguration": vi.fn(() => ({ "runConfiguration": {} })),
        "mockLoadSupport":       vi.fn(),
    };
});

vi.mock("@cucumber/cucumber/api", () => {
    return {
        "loadConfiguration": mockLoadConfiguration,
        "loadSupport":       mockLoadSupport,
        "runCucumber":       mockRunCucumber,
    };
});

describe("CucumberTool", () => {
    const fakeTmpLogPath = "/fake/path.json";
    const fakeLogger     = {
        "generateTmpLogPath": vi.fn(() => fakeTmpLogPath),
        "consumeTmpLog":      vi.fn().mockResolvedValue([{ "id": 1, "result": "passed" }]),
    };

    CucumberTool.logger = fakeLogger as unknown as Logger;

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("loadConfiguration", () => {
        it("calls Cucumber API with given config", async () => {
            const config: Partial<IConfiguration> = { "tags": "test", "format": [] };

            await CucumberTool.loadConfiguration(config);

            expect(mockLoadConfiguration).toBeCalledWith({ "provided": config });
        });

        it("mutates the given config by adding a temp log format", async () => {
            const config: Partial<IConfiguration> = { "format": [] };

            await CucumberTool.loadConfiguration(config);

            expect(config.format[0][0]).toBe("json");
            expect(config.format[0][1]).toBe(fakeTmpLogPath);
        });

        it("returns the processed config", async () => {
            const config: Partial<IConfiguration> = { "format": [] };
            const mockRunConfig                   = { "test": "test value" };
            const mockResolvedConfig              = { "runConfiguration": mockRunConfig };

            mockLoadConfiguration.mockResolvedValueOnce(mockResolvedConfig);

            const runConfig = await CucumberTool.loadConfiguration(config);

            expect(runConfig).toBe(mockRunConfig);
        });

        it("reuses loaded support code across multiple calls", async () => {
            const options     = {};
            const environment = {};
            const supportCode = { "support": "test" };

            mockLoadSupport.mockResolvedValueOnce(supportCode);

            await CucumberTool.loadConfiguration({ "format": [] });

            await CucumberTool.runCucumber(
                options as unknown as IRunOptions,
                environment as unknown as IRunEnvironment,
            );

            await CucumberTool.runCucumber(
                options as unknown as IRunOptions,
                environment as unknown as IRunEnvironment,
            );

            expect(mockLoadSupport).toHaveBeenCalledTimes(1);
        });
    });

    describe("runCucumber", () => {
        it("calls Cucumber API with given arguments", async () => {
            const environment = { "environment": "test" };
            const options     = { "option": "test" };

            await CucumberTool.runCucumber(
                options as unknown as IRunOptions,
                environment as unknown as IRunEnvironment,
            );

            expect(mockRunCucumber).toBeCalledWith(expect.objectContaining(options), environment);
        });

        it("consumes the correct log file after execution", async () => {
            const config: Partial<IConfiguration> = { "format": [] };

            await CucumberTool.loadConfiguration(config);
            await CucumberTool.runCucumber({} as IRunOptions);

            expect(fakeLogger.consumeTmpLog).toHaveBeenCalledWith(fakeTmpLogPath);
        });

        it("throws if the temp log file is missing or empty", async () => {
            fakeLogger.consumeTmpLog.mockImplementationOnce(() => []);

            await CucumberTool.loadConfiguration({ "format": [] });

            await expect(CucumberTool.runCucumber({} as IRunOptions)).rejects.toThrow(
                "No tests were executed.",
            );
        });
    });
});
