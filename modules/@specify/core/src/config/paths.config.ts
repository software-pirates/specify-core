/**
 * A string that will be converted to a RegExp pattern
 *
 * @example "\\.test\\.ts$" or "node_modules"
 */

export type PathsConfig = {
    gherkin: string;
    logs: string;
    refs: string;
};

export const paths: PathsConfig = {
    "gherkin": "./features/**/*.feature",
    "logs":    "./logs/specify",
    "refs":    "./specify.refs.json",
};
