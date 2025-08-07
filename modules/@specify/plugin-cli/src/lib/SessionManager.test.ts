import { vi } from "vitest";

import { SessionManager, IOStream } from "./SessionManager";
import { ShellSession             } from "./ShellSession";

import type { ShellSession as MockShellSession } from "./__mocks__/ShellSession";
import type { CommandMeta                      } from "./SessionManager";

vi.mock("./ShellSession");

describe("SessionManager", () => {
    let session: MockShellSession;
    let sessionManager: SessionManager;

    beforeEach(() => {
        session = new ShellSession() as unknown as MockShellSession;
        sessionManager = new SessionManager();
    });

    describe("activeSession", () => {
        it("returns undefined when there are no managed sessions", () => {
            expect(sessionManager.activeSession).toBeNull();
        });
    });

    describe("exitCode", () => {
        it("returns the last command's exit code", async () => {
            sessionManager.addSession(session);
            sessionManager.run("echo test");

            session.emitDelimiter(0);

            await sessionManager.waitForReturn();

            expect(sessionManager.exitCode).toBe(0);
        });

        describe("returns undefined when...", () => {
            it("...there are no managed sessions", () => {
                expect(sessionManager.exitCode).toBeUndefined();
            });

            it("...the active session has not executed any commands", () => {
                sessionManager.addSession(session);

                expect(sessionManager.exitCode).toBeUndefined();
            });
        });
    });

    describe("output", () => {
        describe("returns the last command's output string when...", () => {
            beforeEach(() => {
                sessionManager.addSession(session);
            });

            it("...the output is a single line", async () => {
                const output  = "test";
                const command = `echo ${output}`;

                sessionManager.run(command);

                session.emitOutput(output);
                session.emitDelimiter(0);

                await sessionManager.waitForReturn();

                expect(sessionManager.output).toBe(output);
            });

            it("...the output is multiple lines", async () => {
                const output = ["test 1", "test 2"];

                sessionManager.run("some-command");

                session.emitOutput(output[0]);
                session.emitOutput(output[1]);
                session.emitDelimiter(0);

                await sessionManager.waitForReturn();

                expect(sessionManager.output).toBe(output.join("\n"));
            });

            it("...there is no output", async () => {
                sessionManager.run("cd .");

                session.emitDelimiter(0);

                await sessionManager.waitForReturn();

                expect(sessionManager.output).toBe("");
            });
        });

        describe("returns undefined when...", () => {
            it("...there are no managed sessions", () => {
                expect(sessionManager.output).toBeUndefined();
            });

            it("...the active session has not executed any commands", () => {
                sessionManager.addSession(session);

                expect(sessionManager.output).toBeUndefined();
            });
        });
    });

    describe("sessions", () => {
        it("returns an empty array when there are no managed sessions", () => {
            expect(sessionManager.sessions).toEqual([]);
        });
    });

    describe("addSession()", () => {
        beforeEach(() => {
            sessionManager.addSession(session);
        });

        it("registers a single managed session", () => {
            expect(sessionManager.sessions.length).toBe(1);
            expect(sessionManager.sessions[0].session).toBe(session);
        });

        it("registers multiple managed sessions", () => {
            const altSession = new ShellSession() as unknown as MockShellSession;

            sessionManager.addSession(altSession);

            expect(sessionManager.sessions.length).toBe(2);
            expect(sessionManager.sessions[1].session).toBe(altSession);
        });

        it("registers named managed sessions", () => {
            const altSession     = new ShellSession() as unknown as MockShellSession;
            const altSessionName = "test session";

            sessionManager.addSession(altSession, altSessionName);

            expect(sessionManager.sessions[1].name).toBe(altSessionName);
        });

        it("activates new managed sessions by default", () => {
            expect(sessionManager.activeSession.session).toBe(session);
        });

        it("switches the active session when adding more than one", () => {
            expect(sessionManager.activeSession.session).toBe(session);

            const altSession = new ShellSession() as unknown as MockShellSession;

            sessionManager.addSession(altSession);

            expect(sessionManager.activeSession.session).toBe(altSession);
        });

        it("doesn't activate new managed sessions if instructed not to", () => {
            const altSession = new ShellSession() as unknown as MockShellSession;

            sessionManager.addSession(altSession, "whatever", false);

            expect(sessionManager.activeSession.session).toBe(session);
        });
    });

    describe("kill()", () => {
        beforeEach(() => {
            sessionManager.addSession(session);
        });

        it("resolves kill() on session close", async () => {
            let resolved = false;

            const promise = sessionManager.kill().then(() => (resolved = true));

            // wait arbitrary time to ensure promise hasn't resolved
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(resolved).toBeFalsy();

            session.emitClose();

            await promise;

            expect(resolved).toBeTruthy();
            expect(session.kill).toHaveBeenCalled();
            expect(sessionManager.sessions.length).toBe(0);
        });

        it("kills only the active session by default", async () => {
            const altSession = new ShellSession() as unknown as MockShellSession;

            sessionManager.addSession(altSession);

            const promise = sessionManager.kill();

            altSession.emitClose();

            await promise;

            expect(session.kill).not.toHaveBeenCalled();
            expect(altSession.kill).toHaveBeenCalled();
            expect(sessionManager.sessions.length).toBe(1);
        });
    });

    describe("killAll()", () => {
        it("kills all managed sessions", async () => {
            const altSession = new ShellSession() as unknown as MockShellSession;

            let resolved = false;

            sessionManager.addSession(session, "session");
            sessionManager.addSession(altSession, "altSession");

            expect(sessionManager.sessions.length).toBe(2);

            const promise = sessionManager.killAll().then(() => (resolved = true));

            // wait arbitrary time to ensure promise hasn't resolved
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(resolved).toBeFalsy();

            session.emitClose();
            altSession.emitClose();

            await promise;

            expect(resolved).toBeTruthy();
            expect(session.kill).toHaveBeenCalled();
            expect(altSession.kill).toHaveBeenCalled();
            expect(sessionManager.sessions.length).toBe(0);
        });
    });

    describe("removeSession()", () => {
        beforeEach(() => {
            sessionManager.addSession(session);
        });

        it("removes the sole managed session", () => {
            expect(sessionManager.sessions.length).toBe(1);

            sessionManager.removeSession();

            expect(sessionManager.sessions.length).toBe(0);
            expect(sessionManager.activeSession).toBeNull();
        });

        it("removes one managed session among several", () => {
            const altSession     = new ShellSession() as unknown as MockShellSession;
            const altSessionMeta = sessionManager.addSession(altSession, "whatever", false);

            expect(sessionManager.sessions.length).toBe(2);
            expect(sessionManager.activeSession.session).toBe(session);

            sessionManager.removeSession({ "sessionMeta": altSessionMeta });

            expect(sessionManager.sessions.length).toBe(1);
            expect(sessionManager.activeSession.session).toBe(session);
        });

        it("removes the active session among several", () => {
            const altSession = new ShellSession() as unknown as MockShellSession;

            sessionManager.addSession(altSession);

            expect(sessionManager.sessions.length).toBe(2);
            expect(sessionManager.activeSession.session).toBe(altSession);

            sessionManager.removeSession();

            expect(sessionManager.sessions.length).toBe(1);
            expect(sessionManager.activeSession.session).toBe(session);
        });
    });

    describe("run()", () => {
        beforeEach(() => {
            sessionManager.addSession(session);
        });

        it("writes command input to the active session", () => {
            const output  = "test";
            const command = `echo ${output}`;

            sessionManager.run(command);

            session.emitOutput(output);
            session.emitDelimiter(0);

            expect(session.write).toHaveBeenCalledWith(expect.stringContaining(command));
        });

        describe("returns a well-formed CommandMeta object...", () => {
            it("with an accurate timestamp", () => {
                const startTS = Date.now();
                const cmdMeta = sessionManager.run("echo test");
                const endTS   = Date.now();

                expect(cmdMeta.timestamp).toBeGreaterThanOrEqual(startTS);
                expect(cmdMeta.timestamp).toBeLessThanOrEqual(endTS);
            });

            describe("with an output array...", () => {
                let cmdMeta: CommandMeta;

                beforeEach(() => {
                    cmdMeta = sessionManager.run("echo test");
                });

                it("which is initially empty", () => {
                    expect(cmdMeta.output).toEqual([]);
                });

                describe("which fills with OutputMeta objects as session output is received...", () => {
                    it("with accurate timestamps", () => {
                        const startTS = Date.now();

                        session.emitOutput("test");

                        const endTS = Date.now();

                        expect(cmdMeta.output[0].timestamp).toBeGreaterThanOrEqual(startTS);
                        expect(cmdMeta.output[0].timestamp).toBeLessThanOrEqual(endTS);
                    });

                    it("with accurate source stream records", () => {
                        session.emitOutput("test");
                        session.emitError("whoops");

                        expect(cmdMeta.output[0].stream).toBe(IOStream.STDOUT);
                        expect(cmdMeta.output[1].stream).toBe(IOStream.STDERR);
                    });
                });
            });

            it("with a promise that resolves after delimiter output is received", async () => {
                const cmdMeta = sessionManager.run("echo test");

                session.emitDelimiter(0);

                await expect(cmdMeta.promise).resolves.toBe(cmdMeta);
            });
        });

        it("throws if called while another command is in progress", () => {
            const command = 'echo "long-running command"';

            // this promise will never resolve due to the throw
            sessionManager.run(command);

            expect(() => sessionManager.run('echo "overlapping command"')).toThrow(
                `A command is already running: ${command}`,
            );
        });
    });

    describe("waitForReturn()", () => {
        beforeEach(() => {
            sessionManager.addSession(session);
        });

        it("resolves when delimiter output is received", async () => {
            sessionManager.run("echo test");

            session.emitOutput("test");

            // wait arbitrary time to ensure promise hasn't resolved
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(sessionManager.exitCode).toBeUndefined();

            session.emitDelimiter(0);

            await sessionManager.waitForReturn();

            expect(sessionManager.exitCode).toBeDefined();
        });

        it("throws if output contains malformed delimiter", async () => {
            // this promise will never resolve because malformed delimiter doesn't trigger resolution
            sessionManager.run("echo bad");

            session.emitDelimiter(0, true);

            await expect(async () => sessionManager.waitForReturn()).rejects.toThrow(
                /^Output does not contain a value for ".+"$/,
            );
        });
    });

    describe("waitForOutput()", () => {
        beforeEach(() => {
            sessionManager.addSession(session);

            sessionManager.run("echo foo");
        });

        it("resolves when any output is received by default", async () => {
            let resolved = false;

            const promise = sessionManager.waitForOutput().then(() => (resolved = true));

            expect(resolved).toBe(false);

            session.emitOutput("foo\n");

            await promise;

            expect(sessionManager.output).toBe("foo");
            expect(resolved).toBe(true);
        });

        it("resolves only after output is received matching a certain pattern", async () => {
            let resolved = false;

            const opts    = { "pattern": "bar" };
            const promise = sessionManager.waitForOutput(opts).then(() => (resolved = true));

            // wait arbitrary time to ensure promise hasn't resolved
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(resolved).toBe(false);

            session.emitOutput("foo");

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(resolved).toBe(false);

            session.emitOutput("bar");

            await promise;

            expect(sessionManager.output).toBe("foo\nbar");
            expect(resolved).toBe(true);
        });

        it("resolves only after output is received on a specific stream", async () => {
            let resolved = false;

            const opts    = { "stream": IOStream.STDERR };
            const promise = sessionManager.waitForOutput(opts).then(() => (resolved = true));

            // wait arbitrary time to ensure promise hasn't resolved
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(resolved).toBe(false);

            session.emitOutput("foo");

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(resolved).toBe(false);

            session.emitError("bar");

            await promise;

            expect(sessionManager.output).toBe("foo\nbar");
            expect(resolved).toBe(true);
        });

        it("resolves only after output is received matching both a certain pattern and stream", async () => {
            let resolved = false;

            const opts    = { "pattern": "baz", "stream": IOStream.STDERR };
            const promise = sessionManager.waitForOutput(opts).then(() => (resolved = true));

            // wait arbitrary time to ensure promise hasn't resolved
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(resolved).toBe(false);

            session.emitOutput("foo");

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(resolved).toBe(false);

            session.emitError("bar");

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(resolved).toBe(false);

            session.emitError("baz");

            await promise;

            expect(sessionManager.output).toBe("foo\nbar\nbaz");
            expect(resolved).toBe(true);
        });
    });
});
