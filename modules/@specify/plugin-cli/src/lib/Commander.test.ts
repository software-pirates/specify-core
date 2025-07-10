import { Commander    } from "./Commander";
import { ShellSession } from "./ShellSession";
import { vi           } from "vitest";

import type { ShellSession as MockShellSession } from "./__mocks__/ShellSession";

vi.mock("./ShellSession");

describe("Commander", () => {
    let session: MockShellSession;
    let commander: Commander;

    beforeEach(() => {
        session = new ShellSession() as unknown as MockShellSession;
        commander = new Commander(session);
    });

    it("writes command to session and resolves after delimiter", async () => {
        const output  = "test";
        const command = `echo ${output}`;
        const promise = commander.run(command);

        session.emitOutput(output);
        session.emitDelimiter(0);

        await promise;

        expect(session.write).toHaveBeenCalledWith(
            expect.stringContaining(command),
        );
    });

    it("resolves run() when delimiter output is received", async () => {
        let resolved = false;

        const promise = commander
            .run("echo test")
            .then(() => (resolved = true));

        session.emitOutput("test");

        // wait arbitrary time to ensure promise hasn't resolved
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(resolved).toBeFalsy();

        session.emitDelimiter(0);

        await promise;

        expect(resolved).toBeTruthy();
    });

    it("captures command output", async () => {
        const output  = "test";
        const command = `echo ${output}`;
        const promise = commander.run(command);

        session.emitOutput(output);
        session.emitDelimiter(0);

        await promise;

        expect(commander.output).toBe(output);
    });

    it("captures multiple lines of command output", async () => {
        const output  = ["test 1", "test 2"];
        const promise = commander.run("some-command");

        session.emitOutput(output[0]);
        session.emitOutput(output[1]);
        session.emitDelimiter(0);

        await promise;

        expect(commander.output).toBe(output.join("\n"));
    });

    it("captures command's status code", async () => {
        const promise = commander.run("echo test");

        session.emitDelimiter(0);

        await promise;

        expect(commander.statusCode).toBe(0);
    });

    it("resolves kill() on session close", async () => {
        let resolved = false;

        const promise = commander.kill().then(() => (resolved = true));

        // wait arbitrary time to ensure promise hasn't resolved
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(resolved).toBeFalsy();

        session.emitClose();

        await promise;

        expect(session.kill).toHaveBeenCalled();
        expect(resolved).toBeTruthy();
    });

    it("ignores delimiter-only output", async () => {
        const promise = commander.run("cd .");

        session.emitDelimiter(0);

        await promise;

        expect(commander.output).toBe("");
    });

    it("throws if output contains malformed delimiter", async () => {
        // this promise will never resolve because malformed delimiter doesn't trigger resolution
        void commander.run("echo bad");

        expect(() => {
            session.emitDelimiter(0, true);
        }).toThrow(/^Output does not contain a value for ".+"$/);
    });

    it("throws if run() is called while another command is in progress", async () => {
        const command = 'echo "long-running command"';

        // this promise will never resolve due to the throw
        void commander.run(command);

        await expect(
            commander.run('echo "overlapping command"'),
        ).rejects.toThrow(`A command is already running: ${command}`);
    });

    it("overwrites the output and status code when output is cucumber no-op", async () => {
        const promise = commander.run("echo test");

        session.emitOutput("0 scenarios\n0 steps");
        session.emitDelimiter(0);

        await promise;

        expect(commander.output).toBe("No scenarios found");
        expect(commander.statusCode).toBe(2);
    })
});
