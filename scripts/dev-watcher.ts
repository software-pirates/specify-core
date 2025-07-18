/**
 * This script watches for file changes in our submodules (packages) and
 * rebuilds them when changes are detected. It is intended to be used during
 * development to ensure that changes are immediately reflected in the built
 * packages.
 *
 * @example
 * pnpm run dev:watch
 */

import { watch                       } from "chokidar";
import { globbySync                  } from "globby";
import { spawn                       } from "node:child_process";
import { clear, log                  } from "node:console";
import { existsSync                  } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { pathToFileURL               } from "node:url";

import _     from "lodash";
import chalk from "chalk";

import type { PackageJson } from "type-fest";

const REBUILD_DEBOUNCE_MS = 500;

const prefix = chalk.cyan("[dev-watcher]");

const logMessage = (message: string) => {
    const statusLine = `${prefix} ${message}`;

    log(statusLine);
};

const clearAndLogMessage = (message: string) => {
    clear();
    logMessage(message);
};

const wrapLabel = (label: string) => {
    return chalk.cyan("[") + chalk.greenBright(label) + chalk.cyan("]");
};

const moduleSrcDirs = globbySync(join("modules", "**", "src"), {
    "absolute":        true,
    "onlyDirectories": true,
    "cwd":             process.cwd(),
    "ignore":          ["**/node_modules/**", "**/dist/**"],
});

clearAndLogMessage("Watching for file changes...");
moduleSrcDirs.forEach((moduleSrcDir) => watchModule(moduleSrcDir));

/*******************************************************************************
 * Supporting Functions
 ******************************************************************************/

type EventName =
    | "add"
    | "addDir"
    | "all"
    | "change"
    | "error"
    | "raw"
    | "ready"
    | "unlink"
    | "unlinkDir";

/**
 * Rebuilds the package at the specified path.
 *
 * @param PackageOpts - Options for the package rebuild.
 */
async function rebuildPackage<
    PackageOpts extends {
        event: EventName;
        path: string;
        moduleSrcDir: string;
    },
>({ event, path, moduleSrcDir }: PackageOpts): Promise<void> {
    const moduleRootDir = dirname(moduleSrcDir);
    const packageConfig = (
        await import(pathToFileURL(join(moduleRootDir, "package.json")).href, {
            "with": { "type": "json" },
        })
    ).default as PackageJson;

    const buildStartTime = new Date();
    const packageName    = packageConfig.name || moduleRootDir.split(sep).slice(-2).join("/");
    const label          = wrapLabel(packageName);

    logMessage(`${label} ${event}: ${path}`);

    if (!packageConfig.scripts?.build) {
        logMessage(label + chalk.yellow(" No build script defined, skipping rebuild."));

        return;
    }

    logMessage(`${label} Rebuilding...`);
    const child = spawn("pnpm", ["run", "build"], {
        "cwd":   moduleSrcDir,
        "shell": false,
    });

    child.on("error", (error) => {
        logMessage(label + chalk.red(` ${error.message}`));
    });

    child.on("exit", (code) => {
        const buildEndTime  = new Date();
        const buildDuration = (buildEndTime.getTime() - buildStartTime.getTime()) / 1000;

        if (code === 0) {
            logMessage(`${label} Build completed in ${buildDuration}s`);
        } else {
            logMessage(label + chalk.red(` Build failed with code ${code}`));
        }
    });
}

/**
 * Watches a package directory for changes and triggers a rebuild when files
 * are modified.
 *
 * @param moduleSrcDir - The directory of the module to monitor for changes.
 */
function watchModule(moduleSrcDir: string): void {
    if (!existsSync(resolve(moduleSrcDir, "..", "package.json"))) {
        return;
    }

    const debouncedRebuild = _.debounce((event: EventName, path: string) => {
        void rebuildPackage({ event, path, moduleSrcDir });
    }, REBUILD_DEBOUNCE_MS);

    watch(moduleSrcDir, {
        "ignoreInitial":  true, // don't trigger on watcher start
        "persistent":     true, // keep the watcher running
        "followSymlinks": false, // don't follow symlinks (prevent recursion)
        "ignored":        [/.test.ts$/, /__mocks__/, /__tests__/],
    }).on("all", (event, path) => debouncedRebuild(event, path));
}
