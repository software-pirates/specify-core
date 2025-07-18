import eslint              from "@eslint/js";
import specifyESLintPlugin from "@specify/eslint-plugin";
import globals             from "globals";
import eslintParserJSONC   from "jsonc-eslint-parser";
import eslintPluginJSONC   from "eslint-plugin-jsonc";
import eslintPluginTSDoc   from "eslint-plugin-tsdoc";
import stylisticJs         from "@stylistic/eslint-plugin-js";
import tseslint            from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,

    // json/jsonc-eslint
    {
        "files":           ["**/*.json"],
        "languageOptions": {
            "parser": eslintParserJSONC,
        },
        "plugins": {
            "jsonc": eslintPluginJSONC,
        },
        "rules": {
            "jsonc/array-bracket-newline": ["error", { "multiline": true, "minItems": 2 }],
            "jsonc/array-bracket-spacing": ["error", "always"],
            "jsonc/indent":                ["error", 4],
            "jsonc/object-curly-spacing":  ["error", "always"],
            "jsonc/no-dupe-keys":          "error",
            "jsonc/quote-props":           ["error", "always"],
        },
    },

    // typescript-eslint
    {
        "files":           ["**/*.ts"],
        "languageOptions": {
            "parser":        tseslint.parser,
            "parserOptions": {
                "ecmaVersion":         "latest",
                "sourceType":          "module",
                "extraFileExtensions": [".json"],
                "project":             "./tsconfig.eslint.json",
                "tsconfigRootDir":     import.meta.dirname,
            },
            "globals": {
                ...globals.node,
            },
        },
        "plugins": {
            "@specify-eslint": specifyESLintPlugin,
            "@stylistic/js":   stylisticJs,
            "tsdoc":           eslintPluginTSDoc,
        },
        "rules": {
            "@specify-eslint/align-assignments":                 "error",
            "@specify-eslint/align-imports":                     "error",
            "@specify-eslint/align-properties":                  "error",
            "@stylistic/js/quote-props":                         ["error", "always"],
            "@typescript-eslint/explicit-module-boundary-types": "warn",
            "@typescript-eslint/naming-convention":              [
                "error",
                {
                    "selector":           "default",
                    "format":             ["camelCase", "PascalCase", "UPPER_CASE"],
                    "leadingUnderscore":  "allow",
                    "trailingUnderscore": "allow",
                },
                {
                    "selector":          "import",
                    "format":            ["camelCase", "PascalCase"],
                    "leadingUnderscore": "allow", // allow `_` for lodash
                },
                {
                    "selector":           "variable",
                    "format":             ["camelCase", "UPPER_CASE"],
                    "leadingUnderscore":  "allowDouble",
                    "trailingUnderscore": "allow",
                },
                {
                    "selector": "typeLike",
                    "format":   ["PascalCase"],
                },
            ],
            "@typescript-eslint/no-floating-promises": "error",
            "no-console":                              "warn",
            "prefer-const":                            "error",
            "tsdoc/syntax":                            ["warn"],
        },
    },
    {
        "files": ["eslint.config.ts", "eslint-plugin/**/*.ts"],
        "rules": {
            "@typescript-eslint/naming-convention": "off",
        },
    },
    {
        "ignores": [
            "**/*.d.ts",
            "**/.DS_Store/**",
            "**/.vscode/**",
            "**/node_modules/**",
            "**/dist/**",
            "**/package.json",
            "**/package-lock.json",
            "logs/",
        ],
    },
);
