/**
 * Shell Step Definitions Module
 *
 * Cucumber step definitions covering the provisioning of an OS shell for
 * testing purposes.
 */

import { Given, Then, When      } from "@cucumber/cucumber";
import assert, { AssertionError } from "node:assert/strict";

import { SessionManager } from "@/lib/SessionManager";
import { ShellSession   } from "@/lib/ShellSession";

Given("a/another CLI shell", startDefaultShell);

When("a/the user starts a/another CLI shell", startDefaultShell);

When("a/the user runs the command {string}", runCommand);

When(
    "a/the user runs the command {string} and waits for it to complete",
    { "timeout": 60000 },
    runCommandAndWait,
);

When("a/the user waits for the last command to complete", { "timeout": 60000 }, waitForLastCommand);

Then("the command should return a/an/the {ref:exitCode} exit code", verifyExitCode);

Then("the console output should be a/an/the {ref:consoleOutput}", verifyOutput);

/**
 * Run the given command via the CLI
 *
 * @param command - The command to run
 */
function runCommand(command: string): void {
    this.cli.manager.run(command);
}

/**
 * Run the given command and wait for it to complete
 *
 * @param command - The command to run
 */
async function runCommandAndWait(command: string): Promise<void> {
    runCommand.call(this, command);
    await waitForLastCommand.call(this);
}

/**
 * Start a default shell
 *
 * @param name - The name of the shell (optional)
 */
function startNamedDefaultShell(name: string): void {
    const shell = new ShellSession(this.parameters.userPath);

    this.cli.manager ??= new SessionManager();
    this.cli.manager.addSession(shell, name, true);
}

/**
 * Start a default shell without a name
 */
function startDefaultShell(): void {
    startNamedDefaultShell.call(this);
}

/**
 * Verify that the CLI output for the last completed command matches the given
 * regexp
 *
 * @param consoleOutput - The matcher to use for the output
 *
 * @throws {@link AssertionError}
 * If the matcher regexp wasnt found
 */
function verifyOutput(consoleOutput: RegExp): void {
    assert.ok(
        consoleOutput.test(this.cli.manager.output),
        new AssertionError({
            "message": `Command output did not match expectations. Output:\n${this.cli.manager.output}`,
        }),
    );
}

/**
 * Verify that the CLI exit code for the last completed command is as expected
 *
 * @param exitCode - The exit code expected from the last command
 *
 * @throws {@link AssertionError}
 * If the actual exit code is different
 */
function verifyExitCode(exitCode: number): void {
    assert.equal(
        this.cli.manager.exitCode,
        exitCode,
        "The command's status code did not match expectations.",
    );
}

/**
 * Wait for the last command to finish
 */
async function waitForLastCommand(): Promise<void> {
    await this.cli.manager.waitForReturn();
}
