/**
 * Param Types Module
 *
 * Cucumber parameter type definitions for all custom params used by this
 * package's step definitions or those of any Specify plugin.
 */

import { defineParameterType } from "@cucumber/cucumber";
import path                    from "node:path";

import type { FileParam } from "~/types/params";

const quotedString = /"(?:\\.|[^\\"])*"|'(?:\\.|[^\\'])*'/;
const refName      = /\$\w+/;

defineParameterType({
    "name":   "path",
    "regexp": quotedString,
    transformer(input: string): string {
        return path.resolve(input.slice(1, -1));
    },
    "useForSnippets": false,
});

defineParameterType({
    "name":   "ref:file",
    "regexp": refName,
    transformer(input: string): FileParam {
        return this.quickRef.lookup("file", input.slice(1)) as FileParam;
    },
    "useForSnippets": false,
});

defineParameterType({
    "name":   "regexp",
    "regexp": quotedString,
    transformer(input: string): RegExp {
        return RegExp(input.slice(1, -1));
    },
    "useForSnippets": false,
});
