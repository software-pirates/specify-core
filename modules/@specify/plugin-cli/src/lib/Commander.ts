/**
 * Commander Module
 *
 * Provides an interface for executing interactive shell commands via
 * ISystemIOSession. Commands are tracked with delimiters and expose
 * output and status code results.
 */

import assert         from "node:assert/strict";
import { randomUUID } from "node:crypto";

import type { ISystemIOSession } from "@/interfaces/ISystemIOSession";

/**
 * Internal structure used to identify and match command boundaries in the
 * session output.
 */
interface Delimiter {
    command: string;
    regexp: RegExp;
    uuid: string;
}

export class Commander {
    #commandResolve: () => void;
    #curCommand = "";
    #delimiter: Delimiter;
    #output = "";
    #session: ISystemIOSession;
    #statusCode: number; // the result of the last completed command
    #statusCodeKey = "STATUS_CODE";

    /**
     * Creates a new Commander instance bound to a given session.
     *
     * Manages the lifecycle of a system process session. Ensures only
     * one command runs at a time, and tracks command output and exit status.
     *
     * @param session - An interactive system session (e.g. child process)
     */
    constructor(session: ISystemIOSession) {
        this.#session = session;

        this.#session.onOutput(this.#processOutput.bind(this));
    }

    /**
     * The output from the last executed command. Whitespace is trimmed from
     * both ends.
     */
    get output(): string {
        return this.#output.trim();
    }

    /**
     * The numeric exit status of the last completed command.
     */
    get statusCode(): number {
        return this.#statusCode;
    }

    /**
     * Gracefully terminates the session. Resolves once the session is fully
     * closed.
     */
    async kill(): Promise<void> {
        return new Promise((resolve) => {
            this.#session.onClose(resolve);
            this.#session.kill();
        });
    }

    /**
     * Executes a single command within the interactive session.
     *
     * Only one command may be active at a time. Output and status code are
     * available via `output` and `statusCode` once resolved.
     *
     * @remarks
     *
     * Multiple commands can be chained in a single command string
     * with "&" or ";". Ex: `echo first;echo second`
     *
     * @param command - The command to execute
     *
     * @throws If another command is already in progress
     */
    async run(command: string): Promise<void> {
        assert.ok(!this.#commandResolve, `A command is already running: ${this.#curCommand}`);

        this.#curCommand = command;
        this.#delimiter = this.#createDelimiter();
        this.#output = "";

        return new Promise((resolve) => {
            this.#commandResolve = resolve;
            this.#session.write(command + this.#delimiter.command);
        });
    }

    /**
     * Generates a unique delimiter command and matching regular expression.
     *
     * @returns the new delimiter
     */
    #createDelimiter(): Delimiter {
        const uuid   = randomUUID(); // used to prevent false delimits
        const prefix = "SPECIFY";

        return {
            "command": `;echo "${prefix} ${this.#statusCodeKey}=$? UUID=${uuid}"`,
            "regexp":  new RegExp(`${prefix} ${this.#statusCodeKey}=(\\d+) UUID=${uuid}`),
            uuid,
        };
    }

    /**
     * Extracts the value of the key from the output.
     *
     * @param output     - the session output to search
     * @param key        - the key to find the value of
     * @param parseAsInt - whether the found value should be parsed as an int
     *
     * @throws If the key/value pair is not found
     */
    #extractKeyedValue(output: string, key: string, parseAsInt?: boolean): string | number {
        const match = output.match(new RegExp(`${key}=${parseAsInt ? "(\\d+)" : "(\\w+)"}`));

        assert.ok(match, `Output does not contain a value for "${key}"`);

        return parseAsInt ? parseInt(match[1], 10) : match[1];
    }

    /**
     * Handles raw output received from the session.
     *
     * If the delimiter is found in the output, the command is considered
     * complete and its status code is recorded.
     *
     * @param output - the unmodified session output
     */
    #processOutput(output: string): void {
        this.#output += output.replace(this.#delimiter.regexp, "");

        if (output.includes(this.#delimiter.uuid)) {
            this.#statusCode = this.#extractKeyedValue(output, this.#statusCodeKey, true) as number;

            this.#resolveRun();
        }
    }

    /**
     * Resolves the running command's promise.
     */
    #resolveRun(): void {
        const resolve = this.#commandResolve;
        this.#commandResolve = null;

        resolve();
    }
}
