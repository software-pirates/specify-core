import { existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir                            } from "node:os";
import { join                              } from "node:path";
import { Logger                            } from "./Logger";

describe("Logger (integration)", () => {
    const logger = new Logger();
    let path: string;

    beforeEach(async () => {
        path = await logger.generateTmpLogPath("integration-test");
    });

    afterEach(async () => {
        if (existsSync(path)) {
            rmSync(path);
        }
    });

    describe("generateTmpLogPath()", () => {
        it("creates a unique path in temp directory", async () => {
            expect(path.startsWith(tmpdir())).toBeTruthy();
            expect(path).toMatch(/specify\/integration-test-[\w-]+\.json$/);
        });

        it("creates the specify directory if it doesn't already exist", async () => {
            const path = join(tmpdir(), "specify");

            if (existsSync(path)) {
                rmSync(path, { "recursive": true, "force": true });
            }

            expect(existsSync(path)).toBeFalsy();

            await logger.generateTmpLogPath("integration-test");

            expect(existsSync(path)).toBeTruthy();
        });

        it("throws when reading a non-existent file", async () => {
            await expect(logger.readTmpLog("/fake/path.json")).rejects.toThrow();
        });
    });

    describe("readTmpLog()", () => {
        it("returns json object when JSON is valid", async () => {
            const json = { "hello": "world" };

            writeFileSync(path, JSON.stringify(json), "utf-8");

            const result = await logger.readTmpLog(path);

            expect(result).toEqual(json);
        });

        it("throws on invalid JSON", async () => {
            writeFileSync(path, "not-json", "utf-8");

            await expect(logger.readTmpLog(path)).rejects.toThrow(SyntaxError);
        });
    });

    it("consumeTmpLog() reads JSON and deletes the file", async () => {
        const json = { "test": "data" };

        writeFileSync(path, JSON.stringify(json), "utf-8");

        const result = await logger.consumeTmpLog(path);

        expect(result).toEqual(json);
        expect(existsSync(path)).toBeFalsy();
    });
});
