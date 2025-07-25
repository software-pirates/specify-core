/**
 * Hooks Module
 *
 * Custom Cucumber hooks enabling CLI testing.
 */

import { After, AfterAll, Before, BeforeAll } from "@cucumber/cucumber";
import * as fs                                from "node:fs/promises";

const cliFiles: Array<string> = [];

BeforeAll(async function () {
    // beforeall actions
});

Before({ "name": "CLI plugin before hook" }, async function () {
    // initialize the CLI namespace
    this.cli = {
        "files": {
            "created": cliFiles,
        },
    };
});

After({ "name": "CLI plugin after hook" }, async function () {
    // terminate any remaining shell sessions
    await this.cli.manager?.killAll();
});

AfterAll(async function () {
    const promises = [];

    if (this.parameters.cliCleanup) {
        for (const file of cliFiles) {
            promises.push(fs.unlink(file));
        }
    }

    return Promise.all(promises);
});
