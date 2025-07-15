/**
 * A string that will be converted to a RegExp pattern
 *
 * @example "\\.test\\.ts$" or "node_modules"
 */

// more descriptive type names
type DirectoryString = string;
type RegExpString = string;

type WatchPathsConfig = {
    paths: DirectoryString[];
    ignore: RegExpString[];
};

export type PathsConfig = {
    [key: string]: string | WatchPathsConfig | undefined;

    gherkin: string;
    logs: string;
    refs: string;
    watch?: WatchPathsConfig;
};

export const paths: PathsConfig = {
    "gherkin": "./features/**/*.feature",
    "logs":    "./logs/specify",
    "refs":    "./specify.refs.json",
};
