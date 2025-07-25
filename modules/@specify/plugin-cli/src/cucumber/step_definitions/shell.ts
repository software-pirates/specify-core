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

When("a/the user runs the command {string}", { "timeout": 60000 }, runCommand);

Then("the command should return a/an/the {ref:exitCode} exit code", verifyExitCode);

Then("the console output should be a/an/the {ref:consoleOutput}", verifyOutput);

/**
 * Run the given command via the CLI
 *
 * @param command - the command to run
 */
async function runCommand(command: string) {
    await this.cli.manager.run(command);
}

/**
 * Start a default shell
 *
 * @param name - The name of the shell (optional)
 */
async function startNamedDefaultShell(name: string) {
    const shell = new ShellSession(this.parameters.userPath);

    this.cli.manager ??= new SessionManager();
    this.cli.manager.addSession(shell, name, true);
}

/**
 * Start a default shell without a name
 */
async function startDefaultShell() {
    return startNamedDefaultShell.call(this);
}

/**
 * Verify that the CLI output for the last completed command matches the given
 * regexp
 *
 * @param consoleOutput - the matcher to use for the output
 *
 * @throws if the matcher regexp wasnt found
 */
function verifyOutput(consoleOutput: RegExp) {
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
 * @param exitCode - the status code expected from the last command
 *
 * @throws if the actual status code is different
 */
function verifyExitCode(exitCode: number) {
    assert.equal(
        this.cli.manager.exitCode,
        exitCode,
        "The command's status code did not match expectations.",
    );
}
