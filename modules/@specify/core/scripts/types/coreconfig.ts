/**
 * Generates the CoreConfig type definition file.
 */

import path                                                    from "path";
import { generateInterfaceTypeExport, getSourceFilesFromGlob } from "../utils";

import type { InterfaceExportOptions } from "../utils";

const CONFIGS_GLOB = path.resolve(import.meta.dirname, "..", "..", "src", "config", "*.config.ts");

export const generateTypeExport = (opts: InterfaceExportOptions): string =>
    generateInterfaceTypeExport("CoreConfig", getSourceFilesFromGlob(CONFIGS_GLOB), opts);
