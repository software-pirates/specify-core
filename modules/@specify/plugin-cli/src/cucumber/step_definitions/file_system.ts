/**
 * File System Step Definitions Module
 *
 * Cucumber step definitions covering interactions with a file system.
 */

// import { Given, When } from "@cucumber/cucumber";
// import fs              from "node:fs/promises";
// import path            from "node:path";

// import type { FileParam } from "~/types/params";

// Given("(that )a(n) {ref:file} file exists at {path}", copyFile);

// When("a/the user puts a(n) {ref:file} file in {path}", copyFile);

/**
 * Copies an existing file to a specific file system location. Will not overwrite
 * or throw if the destination path already exists.
 *
 * @param file     - The referenced file object to copy
 * @param destPath - The location to copy the file to
 */
// async function copyFile(file: FileParam, destPath: string): Promise<void> {
//     try {
//         await fs.copyFile(
//             path.resolve(file.sourcePath),
//             path.resolve(destPath),
//             fs.constants.COPYFILE_EXCL,
//         );
//     } catch (error) {
//         if (!error.message.includes("EEXIST")) {
//             throw error;
//         }
//     }
// }

/**
 * Writes a defined file's contents to a specific file system location.
 *
 * @param file     - The referenced file object to write
 * @param destPath - The location to write the file to
 */
// async function writeFile(file: FileParam, destPath: string): Promise<void> {
//     const opts = {
//         "encoding": file.encoding || "utf8",
//         "mode": file.mode || 0o644,
//     } as Partial<ObjectEncodingOptions>;

//     await fs.writeFile(destPath, file.name), file.content, opts);
// }
