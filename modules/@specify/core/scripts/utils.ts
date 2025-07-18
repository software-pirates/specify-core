/**
 * Utils script for generic utility functions.
 */

import { Project } from "ts-morph";
import path        from "node:path";
import ts          from "typescript";

import type { SourceFile } from "ts-morph";

export type InterfaceExportOptions = {
    outputFile: string;
};

/**
 * Generates a interface type definition export for the given glob pattern with
 * the specified interface name.
 *
 * @param interfaceName - Name of the interface to generate.
 * @param glob          - Glob pattern to match files.
 * @param opts          - Options for the export.
 *
 * @returns The generated interface export.
 *
 * @example
 * ```ts
 * import { generateInterfaceTypeExport } from "./utils";
 *
 * generateInterfaceTypeExport(
 *     "MyInterface",
 *     "./config/*.ts",
 * );
 *
 * // This will generate output with the following content:
 * // export interface MyInterface {
 * //   config1: import("./file1").Config1;
 * //   config2: import("./file2").Config2;
 * //   ...
 * // }
 * ```
 */
export const generateInterfaceTypeExport = (
    interfaceName: string,
    sourceFiles: SourceFile[],
    opts?: InterfaceExportOptions,
): string => {
    const entries: string[] = [];

    for (const file of sourceFiles) {
        const aliasMap = new Map(file.getTypeAliases().map((alias) => [alias.getName(), alias]));

        for (const [name, declarations] of file.getExportedDeclarations()) {
            const varDeclarations = declarations.filter((declaration) => {
                return declaration.getKindName() === "VariableDeclaration";
            });

            for (const declaration of varDeclarations) {
                const varDeclaration = declaration.asKindOrThrow(ts.SyntaxKind.VariableDeclaration);

                const typeNode = varDeclaration.getTypeNode();

                let typeText: string;

                if (typeNode) {
                    const typeName = typeNode.getText();

                    if (aliasMap.has(typeName)) {
                        const outputPath =
                            opts?.outputFile ||
                            path.resolve(import.meta.dirname, "..", "types", "index.d.ts");

                        const importPath = getRelativeSourceFileImportPath(file, outputPath);

                        typeText = `import("${importPath}").${typeName}`;
                    } else {
                        typeText = typeName;
                    }
                }

                entries.push(`${name}: ${typeText};`);
            }
        }
    }

    const spacer = " ".repeat(4);
    const output =
        `export interface ${interfaceName} {\n` + `${spacer}${entries.join(`\n${spacer}`)}\n` + "}";

    return output;
};

/**
 * Gets the import path of a source file relative to the given output path.
 *
 * @param sourceFile - The source file to get the relative path for.
 * @param outputPath - The path to the output file.
 *
 * @returns The relative path to the source file from the output path.
 */
export const getRelativeSourceFileImportPath = (
    sourceFile: SourceFile,
    outputPath: string,
): string => {
    // import paths are relative to the output path
    let importPath = path.relative(path.dirname(outputPath), sourceFile.getFilePath());

    if (!importPath.startsWith(".")) {
        importPath = "./" + importPath;
    }

    const pathParts = importPath.split(".");

    return pathParts.slice(0, -1).join(".");
};

/**
 * Gets the source files from the given glob pattern.
 *
 * @param glob - The glob pattern to match files.
 *
 * @returns An array of source files matching the glob pattern.
 */
export const getSourceFilesFromGlob = (glob: string): SourceFile[] => {
    const project = new Project();

    project.addSourceFilesAtPaths(glob);

    return project.getSourceFiles();
};
