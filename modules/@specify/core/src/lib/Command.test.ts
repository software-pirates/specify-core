import { Command, COMMAND_DEFAULT_OPTS } from "./Command";

class ConcreteCommand extends Command {}

describe("Command", () => {
    const emptyArgs = { "_": [] };
    const emptyOpts = {};

    describe("constructor()", () => {
        describe("iniitializes options...", () => {
            it("...with defaults when no user options are provided", () => {
                const cmd = new ConcreteCommand(emptyOpts);

                expect(cmd.debug).toBe(COMMAND_DEFAULT_OPTS.debug);
                expect(cmd.logPath).toBe(COMMAND_DEFAULT_OPTS.logPath);
            });

            it("...with merged values when user options are provided", () => {
                const userOpts = { "debug": true };
                const cmd      = new ConcreteCommand(userOpts);

                expect(cmd.debug).toBe(userOpts.debug);
            });
        });
    });

    describe("execute()", () => {
        it("returns an error result when called", async () => {
            const cmd = new ConcreteCommand(emptyOpts);
            const res = await cmd.execute(emptyArgs);

            expect(res.ok).toBe(false);
            expect(res.status).toBe(2);
            expect(res.error).toBeTruthy();
            expect(res.result).toBeUndefined();
        });
    });
});
