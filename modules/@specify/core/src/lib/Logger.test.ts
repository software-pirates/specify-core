import os         from "node:os";
import { Logger } from "./Logger";

const testFileFactory = (filename: string) => {
    const json = { filename };
    const path = `/${filename}.json`;

    return {
        [path]:{
            "content": JSON.stringify(json),
            json,
        },
    };
};

describe("Logger", () => {
    let deleter;
    let fakeUUID;
    let logger: Logger;
    let reader;
    let testFiles = {};

    beforeEach(() => {
        testFiles = {
            ...testFileFactory("test1"),
            ...testFileFactory("test2"),
        };

        fakeUUID = crypto.randomUUID();

        reader = vi.fn(async (path) => testFiles[path].content);
        deleter = vi.fn(async (path) => delete testFiles[path]);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe("readTmpLog", () => {
        beforeEach(() => {
            logger = new Logger({ reader });
        });

        it("reads and parses JSON file contents in given path", async () => {
            for (const key in testFiles) {
                expect(await logger.readTmpLog(key)).toEqual(testFiles[key].json);
            }
        });

        it("throws when reading invalid JSON", async () => {
            testFiles["/bad.json"] = { "content": "not-json" };

            logger = new Logger({ reader });

            await expect(logger.readTmpLog("/bad.json")).rejects.toThrow(SyntaxError);
        });
    });

    describe("generateTmpLogPath", () => {
        let expectedPath;

        beforeEach(() => {
            expectedPath = (prefix = "cucumber-log") =>
                `${os.tmpdir()}/specify/${prefix}-${fakeUUID}.json`;
        });

        it("generates a UUID'ed .json file path in the system's temp directory", async () => {
            vi.spyOn(crypto, "randomUUID").mockReturnValue(fakeUUID);

            const logger = new Logger();
            const path   = await logger.generateTmpLogPath();

            expect(path).toBe(expectedPath());
        });

        it("uses the provided prefix in the filename", async () => {
            vi.spyOn(crypto, "randomUUID").mockReturnValue(fakeUUID);

            const logger = new Logger();
            const prefix = "test-prefix";
            const path   = await logger.generateTmpLogPath(prefix);

            expect(path).toBe(expectedPath(prefix));
        });

        it("creates the specify subdirectory if it doesnt already exist", async () => {
            let dirExists = false;

            const dirMaker = (path) => {
                dirExists = true;
                return path;
            };

            const logger = new Logger({ dirMaker });

            await logger.generateTmpLogPath();

            expect(dirExists).toBeTruthy();
        });
    });

    describe("consumeTmpLog", () => {
        beforeEach(() => {
            logger = new Logger({ reader, deleter });
        });

        it("reads the JSON and deletes the file", async () => {
            for (const key in testFiles) {
                const file = testFiles[key];
                const json = await logger.consumeTmpLog(key);

                expect(json).toEqual(file.json);
                expect(deleter).toHaveBeenCalledWith(key);
                expect(Object.hasOwn(testFiles, key)).toBe(false);
            }
        });

        it("deletes the file *after* reading it", async () => {
            vi.useFakeTimers();

            let error;

            const delayedReader = vi.fn(async (path: string) => {
                await new Promise((res) => setTimeout(res, 100));

                if (!testFiles[path]) {
                    throw new Error("file deleted before it was read!");
                }

                return testFiles[path].content;
            });

            logger = new Logger({ "reader": delayedReader, deleter });

            const promise = logger.consumeTmpLog("/test1.json").catch((err) => (error = err));

            await vi.runAllTimersAsync();

            await promise;

            expect(error).toBeUndefined();
        });
    });
});
