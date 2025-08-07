/**
 * Param Types Module
 *
 * Cucumber parameter type definitions for all custom params used by this
 * package's step definitions.
 */

import { defineParameterType } from "@cucumber/cucumber";

const refName = /\$\w+/;

defineParameterType({
    "name":   "ref:exitCode",
    "regexp": refName,
    transformer(input: string): number {
        return parseInt(this.quickRef.lookup("exitCode", input.slice(1)), 10);
    },
    "useForSnippets": false,
});

defineParameterType({
    "name":   "ref:terminalOutput",
    "regexp": refName,
    transformer(input: string): RegExp {
        return new RegExp(this.quickRef.lookup("terminalOutput", input.slice(1)));
    },
    "useForSnippets": false,
});
