import fs        from "node:fs";
import path      from "node:path";
import os        from "node:os";
import { watch } from "chokidar";

import { DEBOUNCE_MS, TestCommandWatcher } from "./TestCommandWatcher";
import { TestCommand                     } from "./TestCommand";

// test constants
const MOCK_ARGS        = { "_": [] };
const LOCK_FILE_NAME   = "specify-core-watch.lock";
const TEST_FILE_PATH   = "/some/file.ts";
const CONFIG_FILE_NAME = "specify.config.json";

// helper functions
const mockDebouncedExecution = () =>
    new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 100));

const createMockConfig = (paths: string[] = ["./src", "./features"]) => ({
    "config": {
        "cucumber": {
            "format": [],
            "import": [],
            "paths":  [],
            "tags":   "",
        },
        "debug":        false,
        "gherkinPaths": [],
        "logPath":      path.join(os.tmpdir(), `specify-test-log-${Date.now()}.json`),
        "watch":        {
            "debug":  false,
            "events": ["add", "change", "unlink"],
            "ignore": ["node_modules", ".git"],

            paths,
        },
    },
});

// mocks
const mockWatch         = vi.mocked(watch);
const mockFs            = vi.mocked(fs);
const mockExistsSync    = vi.fn();
const mockWriteFileSync = vi.fn();
const mockUnlinkSync    = vi.fn();
const mockWatchFs       = vi.fn();
const mockMkdtempSync   = vi.fn();

mockFs.existsSync = mockExistsSync;
mockFs.writeFileSync = mockWriteFileSync;
mockFs.unlinkSync = mockUnlinkSync;
mockFs.watch = mockWatchFs;
mockFs.mkdtempSync = mockMkdtempSync;

vi.mock("chokidar");
vi.mock("node:fs");
vi.mock("node:console", () => ({
    "clear": vi.fn(),
    "log":   vi.fn(),
}));
vi.mock("@/config/all", () => ({
    "config": {
        "cucumber": {
            "format": [],
            "import": [],
            "paths":  [],
            "tags":   "",
        },
        "debug":        false,
        "gherkinPaths": [],
        "logPath":      path.join(os.tmpdir(), `specify-test-log-${Date.now()}.json`),
        "watch":        {
            "debug":  false,
            "events": ["add", "change", "unlink"],
            "ignore": ["node_modules", ".git"],
            "paths":  ["./src", "./features"],
        },
    },
}));

describe("TestCommandWatcher", () => {
    let mockCommand: TestCommand;
    let watcher: TestCommandWatcher;
    let mockWatcherInstance: { on: ReturnType<typeof vi.fn> };

    // helper functions for tests
    const getFileChangeHandler = () => {
        const calls   = mockWatcherInstance.on.mock.calls;
        const allCall = calls.find((call: [string, unknown]) => call[0] === "all");
        return allCall?.[1] as (event: string, filePath: string) => Promise<void>;
    };

    const expectLockFile = () => expect.stringContaining(LOCK_FILE_NAME);

    beforeEach(() => {
        const { config } = createMockConfig();

        vi.clearAllMocks();

        mockMkdtempSync.mockReturnValue(path.join(os.tmpdir(), "specify-test-mocked"));

        mockCommand = new TestCommand(config);

        vi.spyOn(mockCommand, "execute").mockResolvedValue({ "ok": true, "status": 0 });

        mockWatcherInstance = {
            "on": vi.fn().mockReturnThis(),
        };

        mockWatch.mockReturnValue(mockWatcherInstance as unknown as ReturnType<typeof watch>);

        watcher = new TestCommandWatcher(mockCommand);
    });

    describe("start()", () => {
        it("clears console and starts watching configured paths", async () => {
            const { clear } = await import("node:console");

            await watcher.start(MOCK_ARGS);

            expect(clear).toHaveBeenCalled();
            expect(mockWatch).toHaveBeenCalledWith(
                [path.resolve("./src"), path.resolve("./features")],
                expect.objectContaining({
                    "ignored":    expect.any(Array),
                    "persistent": true,
                }),
            );
        });

        it("defaults to current working directory if no watch paths are specified", async () => {
            vi.doMock("@/config/all", () => createMockConfig([]));

            // clear modules to force reimport with new mock
            vi.resetModules();

            const { "TestCommandWatcher": emptyPathWatcher } = await import("./TestCommandWatcher");

            const emptyWatcher = new emptyPathWatcher(mockCommand);

            await emptyWatcher.start(MOCK_ARGS);

            expect(mockWatch).toHaveBeenCalledWith(
                [process.cwd()],
                expect.objectContaining({
                    "ignored":    expect.any(Array),
                    "persistent": true,
                }),
            );
        });

        it("removes existing lock file on start", async () => {
            mockExistsSync.mockReturnValueOnce(true);

            await watcher.start(MOCK_ARGS);

            expect(mockUnlinkSync).toHaveBeenCalledWith(expectLockFile());
        });

        it("sets up file system watcher with correct event handler", async () => {
            await watcher.start(MOCK_ARGS);

            expect(mockWatcherInstance.on).toHaveBeenCalledWith("all", expect.any(Function));
        });
    });

    describe("file change handling", () => {
        let changeHandler: (event: string, filePath: string) => Promise<void>;

        beforeEach(async () => {
            await watcher.start(MOCK_ARGS);

            changeHandler = getFileChangeHandler();
        });

        it("executes command on valid file change event", async () => {
            await changeHandler("change", TEST_FILE_PATH);
            await mockDebouncedExecution();

            expect(mockCommand.execute).toHaveBeenCalledWith(MOCK_ARGS);
        });

        it("ignores events not in watchEvents list", async () => {
            await changeHandler("addDir", "/some/directory");
            await mockDebouncedExecution();

            expect(mockCommand.execute).not.toHaveBeenCalled();
        });

        it("handles config file changes", async () => {
            const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
            const { log } = await import("node:console");

            await changeHandler("change", "/some/other/file.ts");
            await mockDebouncedExecution();
            await changeHandler("change", configPath);

            expect(log).toHaveBeenCalledWith(
                expect.stringContaining(`${CONFIG_FILE_NAME} has been modified`),
            );
        });

        it("queues execution when lock file exists", async () => {
            mockExistsSync.mockReturnValueOnce(true);

            const mockWatcherClose = vi.fn();

            // mock fs.watch to immediately call the callback with "rename" event
            mockWatchFs.mockImplementation((_filePath, _options, callback) => {
                // simulate lock file being removed after a short delay
                setTimeout(() => {
                    callback("rename");
                }, 50);

                return { "close": mockWatcherClose };
            });

            // wait for the change to process
            await changeHandler("change", TEST_FILE_PATH);

            expect(mockWatchFs).toHaveBeenCalledWith(
                expect.stringContaining("specify-core-watch.lock"),
                expect.any(Object),
                expect.any(Function),
            );

            expect(mockWatcherClose).toHaveBeenCalled();
        });
    });

    describe("command execution", () => {
        beforeEach(async () => {
            await watcher.start(MOCK_ARGS);
        });

        it("creates and removes lock file during execution", async () => {
            const expectation   = expect.stringContaining("specify-core-watch.lock");
            const changeHandler = getFileChangeHandler();

            await changeHandler("change", TEST_FILE_PATH);
            await mockDebouncedExecution();

            expect(mockWriteFileSync).toHaveBeenCalledWith(expectation, "");
            expect(mockUnlinkSync).toHaveBeenCalledWith(expectation);
        });

        it("handles command execution errors gracefully", async () => {
            const error = new Error("Test execution error");

            mockCommand.execute = vi.fn().mockRejectedValue(error);

            const changeHandler = getFileChangeHandler();

            await changeHandler("change", TEST_FILE_PATH);
            await mockDebouncedExecution();

            // expect the lock file to be cleaned up even on error
            expect(mockUnlinkSync).toHaveBeenCalled();
        });

        it("handles command result errors", async () => {
            const errorResult = {
                "ok":    false,
                "error": { "message": "Command failed" },
            };

            mockCommand.execute = vi.fn().mockResolvedValue(errorResult);

            const changeHandler = getFileChangeHandler();

            await changeHandler("change", TEST_FILE_PATH);
            await mockDebouncedExecution();

            expect(mockCommand.execute).toHaveBeenCalled();
            expect(mockUnlinkSync).toHaveBeenCalled();
        });
    });

    describe("lock file watching", () => {
        it("resolves when lock file is removed", async () => {
            const mockWatcherClose  = vi.fn();
            const mockEventCallback = vi.fn();

            mockWatchFs.mockImplementation((_filePath, _options, callback) => {
                mockEventCallback.mockImplementation(callback);

                return { "close": mockWatcherClose };
            });

            // start the watcher
            await watcher.start(MOCK_ARGS);

            // simulate file change with lock file present
            mockExistsSync.mockReturnValueOnce(true);

            const onChangeHandler = getFileChangeHandler();

            // start the change handler (don't await to test the lock waiting)
            const changePromise = onChangeHandler("change", "/some/file.ts");

            // simulate lock file removal
            setTimeout(() => {
                mockEventCallback("rename");
            }, 100);

            await changePromise;

            expect(mockWatcherClose).toHaveBeenCalled();
        });
    });
});
