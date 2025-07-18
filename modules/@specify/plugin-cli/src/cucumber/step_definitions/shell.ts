/**
 * Shell Step Definitions Module
 *
 * Cucumber step definitions covering the provisioning of an OS shell for
 * testing purposes.
 */

import assert, { AssertionError } from "node:assert/strict";
import { Given, Then, When      } from "@cucumber/cucumber";
import { Commander              } from "@/lib/Commander";
import { ShellSession           } from "@/lib/ShellSession";

Given("that a command line prompt is available", setupCLI);

When("a/the user runs the command {string}", { "timeout": 60000 }, runCommand);

Then('the command should exit with a(n)/the "{ref:statusCode}" status code', verifyCLIStatusCode);

Then('the console output should be a(n)/the "{ref:consoleOutput}"', verifyCLIOutput);

/**
 * Run the given command via the CLI
 *
 * @param command - the command to run
 */
async function runCommand(command: string) {
    await this.cli.shell.run(command);
}

/**
 * Setup the CLI
 */
function setupCLI(): void {
    this.cli.shell = new Commander(new ShellSession(this.parameters.userPath));
}

/**
 * Verify that the CLI output for the last completed command matches the given
 * regexp
 *
 * @param consoleOutput - the matcher to use for the output
 *
 * @throws if the matcher regexp wasnt found
 */
function verifyCLIOutput(consoleOutput: RegExp) {
    assert.ok(
        consoleOutput.test(this.cli.shell.output),
        new AssertionError({
            "message": `Command output did not match expectations. Output:\n${this.cli.shell.output}`,
        }),
    );
}

/**
 * Verify that the CLI status code for the last completed command is as expected
 *
 * @param statusCode - the status code expected from the last command
 *
 * @throws if the actual status code is different
 */
function verifyCLIStatusCode(statusCode: number) {
    assert.equal(
        this.cli.shell.statusCode,
        statusCode,
        "The command's status code did not match expectations.",
    );
}
