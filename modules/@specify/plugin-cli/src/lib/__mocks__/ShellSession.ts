import { vi } from "vitest";
import assert from "node:assert/strict";

export class ShellSession {
    #curCommand: string;
    #closeCallbacks: (() => void)[] = [];
    #errorCallbacks: ((data: string) => void)[] = [];
    #outputCallbacks: ((data: string) => void)[] = [];

    emitClose = vi.fn(() => {
        this.#closeCallbacks.forEach((cb) => cb());
    });

    emitDelimiter = vi.fn((statusCode: number, malformed?: boolean) => {
        const match = this.#curCommand.match(/;echo\s"(.+)"$/);

        assert.ok(match, "Delimiter not found in command!");

        const delimiter = match[1].replace(/\$\?/, malformed ? "badvalue" : statusCode.toString());

        this.emitOutput(delimiter);
    });

    emitError = vi.fn((err: string) => {
        this.#errorCallbacks.forEach((cb) => cb(err + "\n"));
    });

    emitOutput = vi.fn((output: string) => {
        this.#outputCallbacks.forEach((cb) => cb(output + "\n"));
    });

    kill = vi.fn();

    onClose = vi.fn((callback: () => void) => this.#closeCallbacks.push(callback));

    onError = vi.fn((callback: () => void) => this.#errorCallbacks.push(callback));

    onOutput = vi.fn((callback: () => void) => this.#outputCallbacks.push(callback));

    write = vi.fn((command: string) => {
        this.#curCommand = command;
    });
}
