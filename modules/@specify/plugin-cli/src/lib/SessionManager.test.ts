import { vi } from "vitest";

import { SessionManager } from "./SessionManager";
import { ShellSession   } from "./ShellSession";

import type { ShellSession as MockShellSession } from "./__mocks__/ShellSession";

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

            const promise = sessionManager.run("echo test");

            session.emitDelimiter(0);

            await promise;

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
                const promise = sessionManager.run(command);

                session.emitOutput(output);
                session.emitDelimiter(0);

                await promise;

                expect(sessionManager.output).toBe(output);
            });

            it("...the output is multiple lines", async () => {
                const output  = ["test 1", "test 2"];
                const promise = sessionManager.run("some-command");

                session.emitOutput(output[0]);
                session.emitOutput(output[1]);
                session.emitDelimiter(0);

                await promise;

                expect(sessionManager.output).toBe(output.join("\n"));
            });
        });

        it("returns an empty string when the last command had no output", async () => {
            sessionManager.addSession(session);

            const promise = sessionManager.run("cd .");

            session.emitDelimiter(0);

            await promise;

            expect(sessionManager.output).toBe("");
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
            await new Promise((resolve) => setTimeout(resolve, 100));

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
            await new Promise((resolve) => setTimeout(resolve, 100));

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

        it("removes the sole managed session", async () => {
            expect(sessionManager.sessions.length).toBe(1);

            sessionManager.removeSession();

            expect(sessionManager.sessions.length).toBe(0);
            expect(sessionManager.activeSession).toBeNull();
        });

        it("removes one managed session among several", async () => {
            const altSession = new ShellSession() as unknown as MockShellSession;

            sessionManager.addSession(altSession, "whatever", false);

            expect(sessionManager.sessions.length).toBe(2);
            expect(sessionManager.activeSession.session).toBe(session);

            sessionManager.removeSession(altSession);

            expect(sessionManager.sessions.length).toBe(1);
            expect(sessionManager.activeSession.session).toBe(session);
        });

        it("removes the active session among several", async () => {
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

        it("writes command to session and resolves after delimiter", async () => {
            const output  = "test";
            const command = `echo ${output}`;
            const promise = sessionManager.run(command);

            session.emitOutput(output);
            session.emitDelimiter(0);

            await promise;

            expect(session.write).toHaveBeenCalledWith(expect.stringContaining(command));
        });

        it("resolves when delimiter output is received", async () => {
            let resolved = false;

            const promise = sessionManager.run("echo test").then(() => (resolved = true));

            session.emitOutput("test");

            // wait arbitrary time to ensure promise hasn't resolved
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(resolved).toBeFalsy();

            session.emitDelimiter(0);

            await promise;

            expect(resolved).toBeTruthy();
        });

        it("throws if output contains malformed delimiter", async () => {
            // this promise will never resolve because malformed delimiter doesn't trigger resolution
            void sessionManager.run("echo bad");

            expect(() => {
                session.emitDelimiter(0, true);
            }).toThrow(/^Output does not contain a value for ".+"$/);
        });

        it("throws if called while another command is in progress", async () => {
            const command = 'echo "long-running command"';

            // this promise will never resolve due to the throw
            void sessionManager.run(command);

            await expect(sessionManager.run('echo "overlapping command"')).rejects.toThrow(
                `A command is already running: ${command}`,
            );
        });
    });
});
