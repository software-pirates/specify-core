import { mkdir, readFile, unlink } from "node:fs/promises";
import { tmpdir                  } from "node:os";
import { join                    } from "node:path";
import { JsonObject              } from "type-fest";

type Deleter = (path: string) => Promise<void>;
type DirMaker = (path: string) => Promise<string>;
type Reader = (path: string) => Promise<string>;

interface LoggerOptions {
    deleter?: Deleter;
    dirMaker?: DirMaker;
    reader?: Reader;
}

/**
 * Utility for working with temporary Cucumber JSON log files on disk.
 *
 * Provides functions for generating temp file paths, reading JSON logs,
 * and consuming (i.e., reading then deleting) logs. Internal file system
 * behavior can be customized for testing purposes via injected dependencies.
 */
export class Logger {
    /** Deletes a log file after it's read. */
    #deleter: Deleter;

    /** Ensures the log directory exists before writing. */
    #dirMaker: DirMaker;

    /** Reads file contents from disk. */
    #reader: Reader;

    /**
     * Create a Logger instance with file system behavior overrides.
     *
     * @param options - Overrides for reading, deleting, and creating directories
     */
    constructor({ deleter, dirMaker, reader }: LoggerOptions = {}) {
        this.#deleter = deleter ?? unlink;
        this.#dirMaker = dirMaker ?? ((path) => mkdir(path, { "recursive": true }));
        this.#reader = reader ?? ((path) => readFile(path, "utf-8"));
    }

    /**
     * Read a JSON log file from disk and delete it afterward.
     *
     * @param path - Absolute path to the log file
     *
     * @returns The parsed JSON contents of the log file
     *
     * @throws {@link SyntaxError}
     * If the file contents are not valid JSON.
     *
     * @throws {@link Error}
     * If the file does not exist or cannot be read/deleted.
     */
    async consumeTmpLog(path: string): Promise<JsonObject> {
        const json = await this.readTmpLog(path);

        await this.#deleter(path);

        return json;
    }

    /**
     * Read and parse a JSON log file from disk.
     *
     * @param path - Absolute path to the log file
     *
     * @returns The parsed JSON contents of the file
     *
     * @throws {@link SyntaxError}
     * If the file contents are not valid JSON.
     *
     * @throws {@link Error}
     * If the file does not exist or cannot be read.
     */
    async readTmpLog(path: string): Promise<JsonObject> {
        return JSON.parse(await this.#reader(path));
    }

    /**
     * Generate a unique file path in the system's temp directory
     * for writing a JSON log file. Ensures the parent directory exists.
     *
     * @remarks
     * This only creates a path to the file, its does not create the file itself
     *
     * @param prefix - File name prefix
     *
     * @returns The absolute path to the new temp log file
     *
     * @example
     * "/tmp/specify/cucumber-log-<random-uuid>.json"
     */
    async generateTmpLogPath(prefix: string = "cucumber-log"): Promise<string> {
        const filename = `${prefix}-${crypto.randomUUID()}.json`;
        const dirPath  = join(tmpdir(), "specify");

        await this.#dirMaker(dirPath);

        return join(dirPath, filename);
    }
}
