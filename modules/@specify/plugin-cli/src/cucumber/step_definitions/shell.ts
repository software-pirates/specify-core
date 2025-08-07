/**
 * Shell Step Definitions Module
 *
 * Cucumber step definitions covering the provisioning of an OS shell for
 * testing purposes.
 */

import { Given, Then, When      } from "@cucumber/cucumber";
import assert, { AssertionError } from "node:assert/strict";

import { SessionManager, IOStream } from "@/lib/SessionManager";
import { ShellSession             } from "@/lib/ShellSession";

Given("a/another CLI shell", startDefaultShell);

When("a/the user starts a/another CLI shell", startDefaultShell);

When("a/the user runs the command/process {string}", { "timeout": 60000 }, execCommandSync);

When("a/the user starts the (async )command/process {string}", execCommand);

When("a/the user waits for the last command to return", { "timeout": 60000 }, waitForCommandReturn);

When("a/the user waits for terminal output", { "timeout": 60000 }, waitForAnyOutput);

When("a/the user waits for terminal output on STDERR", { "timeout": 60000 }, waitForOutputOnSTDERR);

When("a/the user waits for terminal output on STDOUT", { "timeout": 60000 }, waitForOutputOnSTDOUT);

When(
    "a/the user waits for terminal output on STDERR matching (the regular expression ){ref:terminalOutput}",
    { "timeout": 60000 },
    waitForMatchingOutputOnSTDERR,
);

When(
    "a/the user waits for terminal output on STDERR matching (the regular expression ){regexp}",
    { "timeout": 60000 },
    waitForMatchingOutputOnSTDERR,
);

When(
    "a/the user waits for terminal output on STDOUT matching (the regular expression ){ref:terminalOutput}",
    { "timeout": 60000 },
    waitForMatchingOutputOnSTDOUT,
);

When(
    "a/the user waits for terminal output on STDOUT matching (the regular expression ){regexp}",
    { "timeout": 60000 },
    waitForMatchingOutputOnSTDOUT,
);

When(
    "a/the user waits for terminal output matching (the regular expression ){ref:terminalOutput}",
    { "timeout": 60000 },
    waitForMatchingOutput,
);

When(
    "a/the user waits for terminal output matching (the regular expression ){regexp}",
    { "timeout": 60000 },
    waitForMatchingOutput,
);

Then("the command should return a/an/the {int} exit code", verifyExitCode);

Then("the command should return a/an/the {ref:exitCode} exit code", verifyExitCode);

Then(
    "the last command's terminal output should match (the regular expression ){ref:terminalOutput}",
    verifyMatchingOutput,
);

Then(
    "the last command's terminal output should match (the regular expression ){regexp}",
    verifyMatchingOutput,
);

/**
 * Execute the given command via the CLI asynchronously and move on without
 * waiting for it to return.
 *
 * @param command - The command to run
 *
 * @throws {@link AssertionError}
 * If there is no SessionManager initialized.
 */
function execCommand(command: string): void {
    assert.ok(this.cli.manager);
    this.cli.manager.run(command);
}

/**
 * Execute the given command and wait for it to return.
 *
 * @param command - The command to run
 */
async function execCommandSync(command: string): Promise<void> {
    execCommand.call(this, command);
    await waitForCommandReturn.call(this);
}

/**
 * Start a default shell.
 *
 * @param name - The name of the shell
 */
function startNamedDefaultShell(name?: string): void {
    const shell = new ShellSession(this.parameters.userPath);

    this.cli.manager ??= new SessionManager();
    this.cli.manager.addSession(shell, name);
}

/**
 * Start a default shell without a name.
 */
function startDefaultShell(): void {
    startNamedDefaultShell.call(this);
}

/**
 * Verify that the CLI exit code for the last command is as expected.
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
 * Verify that the CLI output for the last command matches the given regexp.
 *
 * @param pattern - The pattern to match output against
 *
 * @throws {@link AssertionError}
 * If no matches for the regexp pattern were found
 */
function verifyMatchingOutput(pattern: RegExp | string): void {
    const regexp = new RegExp(pattern);

    assert.ok(
        regexp.test(this.cli.manager.output),
        new AssertionError({
            "message": `Command output did not match expectations. Output:\n${this.cli.manager.output}`,
        }),
    );
}

/**
 * Wait for literally any output.
 */
async function waitForAnyOutput(): Promise<void> {
    await waitForOutput.call(this);
}

/**
 * Wait for the last command to return.
 *
 * @throws {@link AssertionError}
 * If there is no SessionManager initialized.
 */
async function waitForCommandReturn(): Promise<void> {
    assert.ok(this.cli.manager);
    await this.cli.manager.waitForReturn();
}

/**
 * Wait for the last command to send some output.
 *
 * @param stream  - The stream to watch for output
 * @param pattern - The pattern to match output against
 */
async function waitForOutput(stream?: IOStream, pattern?: RegExp): Promise<void> {
    assert.ok(this.cli.manager);
    await this.cli.manager.waitForOutput({ pattern, stream });
}

/**
 * Wait for output on the STDERR stream.
 */
async function waitForOutputOnSTDERR(): Promise<void> {
    await waitForOutput.call(this, IOStream.STDERR);
}

/**
 * Wait for output on the STDOUTstream.
 */
async function waitForOutputOnSTDOUT(): Promise<void> {
    await waitForOutput.call(this, IOStream.STDOUT);
}

/**
 * Wait for output matching a specific phrase.
 *
 * @param pattern - The pattern to match output against
 */
async function waitForMatchingOutput(pattern: RegExp): Promise<void> {
    await waitForOutput.call(this, IOStream.ANY, pattern);
}

/**
 * Wait for output matching a specific phrase on the STDERR stream.
 *
 * @param pattern - The pattern to match output against
 */
async function waitForMatchingOutputOnSTDERR(pattern: RegExp): Promise<void> {
    await waitForOutput.call(this, IOStream.STDERR, pattern);
}

/**
 * Wait for output matching a specific phrase on the STDOUT stream.
 *
 * @param pattern - The pattern to match output against
 */
async function waitForMatchingOutputOnSTDOUT(pattern: RegExp): Promise<void> {
    await waitForOutput.call(this, IOStream.STDOUT, pattern);
}
