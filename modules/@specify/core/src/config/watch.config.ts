/**
 * A string that will be converted to a RegExp pattern.
 *
 * @example "\\.test\\.ts$" or "node_modules"
 */
type RegExpString = string;

/**
 * A string representing a directory path to watch.
 *
 * @example "./features" or "./modules/\@specify/core/dist"
 */
type DirectoryString = string;

/**
 * File system events that can be watched by chokidar.
 */
type WatchEventString = "add" | "change" | "unlink" | "addDir" | "unlinkDir";

export type WatchConfig = {
    debug?: boolean;
    paths: DirectoryString[];
    ignore: RegExpString[];
    events?: WatchEventString[];
};

export const watch: WatchConfig = {
    "debug":  false,
    "paths":  ["./"],
    "ignore": [
        "\\.test\\.ts$",
        "\\.spec\\.ts$",
        "__tests__",
        "__mocks__",
        "\\.d\\.ts$",
        "\\/node_modules\\/",
        "\\.git",
    ],
    "events": ["add", "change", "unlink"],
};
