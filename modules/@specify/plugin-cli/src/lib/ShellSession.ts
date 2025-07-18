/**
 * ShellSession Module
 *
 * Wrapper for a Node child process, spawned using the system's `sh` binary.
 * Handles communication with the system via the child process' main IO methods.
 */

import { spawn } from "node:child_process";

import type { ChildProcessWithoutNullStreams, SpawnOptions } from "node:child_process";

import type { ISystemIOSession } from "@/interfaces/ISystemIOSession";

export class ShellSession implements ISystemIOSession {
    private childProcess: ChildProcessWithoutNullStreams;

    /**
     * Creates a new interactive shell session.
     *
     * @remarks
     *
     * If `userPath` is provided, it will override the default PATH
     * environment variable for this session.
     *
     * @param userPath - PATH to use for the session
     */
    constructor(userPath?: string) {
        const options: SpawnOptions = { "shell": true };

        if (userPath) {
            options.env = {
                ...process.env,
                "PATH": userPath,
            };
        }

        this.childProcess = spawn("sh", options);
    }

    /**
     * Gracefully terminates the shell session.
     */
    kill(): void {
        this.childProcess.kill();
    }

    /**
     * Registers a callback to be invoked when the shell session closes.
     *
     * @param callback - function to call when the shell session ends
     */
    onClose(callback: () => void): void {
        this.childProcess.on("close", callback);
    }

    /**
     * Registers a callback to handle error output from the shell session.
     *
     * @param callback - function that receives error data as a string
     */
    onError(callback: (data: string) => void): void {
        this.childProcess.stderr.on("data", (data: Buffer) => callback(data.toString("utf8")));
    }

    /**
     * Registers a callback to handle standard output from the shell session.
     *
     * @param callback - function that receives output data as a string.
     */
    onOutput(callback: (data: string) => void): void {
        this.childProcess.stdout.on("data", (data: Buffer) => callback(data.toString("utf8")));
    }

    /**
     * Writes (runs) a command to the shell session's stdin.
     *
     * @param command - the command to execute. `\n` is appended to simulate a
     *                  user pressing the "enter" key on their keyboard
     */
    write(command: string): void {
        this.childProcess.stdin.write(`${command}\n`);
    }
}
