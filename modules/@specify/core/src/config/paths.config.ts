export type PathsConfig = {
    [key: string]: string;
    gherkin: string;
    logs: string;
    refs: string;
};

export const paths: PathsConfig = {
    "gherkin": "./features/**/*.feature",
    "logs":    "./logs/specify",
    "refs":    "./specify.refs.json",
};
