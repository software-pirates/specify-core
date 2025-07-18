import { Rule } from "eslint";

import { isMultiLineNode, isSingleLineNode, hasEmptyLineBetween } from "../lib/utils";

type NodeGroup = {
    hasDestructuredImport: boolean;
    imports: Rule.Node[];
    targetClosingBracePosition?: number;
    targetFromPosition: number;
};

export default {
    "meta": {
        "type": "layout",
        "docs": {
            "description": "Enforce consistent alignment of import statements",
            "category":    "Stylistic Issues",
        },
        "fixable":  "whitespace",
        "schema":   [],
        "messages": {
            "misalignedImport": "Import statement should be aligned with adjacent imports",
            "missingSpacing":   "Multi-line import should have spacing around it",
        },
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        const { sourceCode } = context;

        function checkSpacingAroundMultiLine(imports: Rule.Node[]) {
            imports.forEach((node, index) => {
                if (!isMultiLineNode(node)) {
                    return;
                }

                const prevNode = imports[index - 1];
                const nextNode = imports[index + 1];

                // check spacing before multi-line import
                if (prevNode && !hasEmptyLineBetween(prevNode, node)) {
                    context.report({
                        node,

                        "messageId": "missingSpacing",

                        fix(fixer) {
                            if (!prevNode.loc || !node.loc) {
                                return null;
                            }

                            const prevLine    = prevNode.loc.end.line;
                            const currentLine = node.loc.start.line;

                            if (currentLine - prevLine === 1) {
                                return fixer.insertTextBefore(node, "\n");
                            }

                            return null;
                        },
                    });
                }

                // check spacing after multi-line import
                if (nextNode && !hasEmptyLineBetween(node, nextNode)) {
                    context.report({
                        "node":      nextNode,
                        "messageId": "missingSpacing",

                        fix(fixer) {
                            return fixer.insertTextBefore(nextNode, "\n");
                        },
                    });
                }
            });
        }

        function getClosingBracePosition(node: Rule.Node) {
            const tokens       = sourceCode.getTokens(node);
            const closingBrace = tokens.find((token) => token.value === "}");

            return closingBrace ? closingBrace.range[0] : null;
        }

        function getFromKeywordPosition(node: Rule.Node) {
            const tokens    = sourceCode.getTokens(node);
            const fromToken = tokens.find((token) => token.value === "from");

            return fromToken ? fromToken.range[0] : null;
        }

        function getImportGroups(imports: Rule.Node[]): NodeGroup[] {
            const groups: Rule.Node[][] = [];

            let currentGroup: Rule.Node[] = [];

            for (let i = 0; i < imports.length; i++) {
                const current  = imports[i];
                const previous = imports[i - 1];

                // start new group if there's a gap or it's the first import
                if (!previous || hasEmptyLineBetween(previous, current)) {
                    if (currentGroup.length > 0) {
                        groups.push(currentGroup);
                    }

                    currentGroup = [current];
                } else {
                    currentGroup.push(current);
                }
            }

            if (currentGroup.length > 0) {
                groups.push(currentGroup);
            }

            return groups.map((group) => {
                const { targetClosingBracePosition, targetFromPosition } =
                    getTargetPositions(group);

                return {
                    "hasDestructuredImport": hasDestructuredImport(group),
                    "imports":               group,

                    targetClosingBracePosition,
                    targetFromPosition,
                };
            });
        }

        function getTargetPositions(group: Rule.Node[]) {
            let targetClosingBracePosition = 0;
            let targetFromPosition         = 0;

            group.forEach((node) => {
                if (
                    !isSingleLineNode(node) ||
                    !("specifiers" in node) ||
                    node.specifiers.length === 0
                ) {
                    return null;
                }

                const lastSpecifier   = node.specifiers[node.specifiers.length - 1];
                const closingBracePos = getClosingBracePosition(node);

                if (!lastSpecifier.loc) {
                    return;
                }

                const position = lastSpecifier.loc.end.column + 1;

                targetClosingBracePosition = Math.max(
                    targetClosingBracePosition,
                    closingBracePos ? position : position - 2,
                );

                targetFromPosition = Math.max(
                    targetFromPosition,
                    closingBracePos ? position + 2 : position,
                );
            });

            return { targetClosingBracePosition, targetFromPosition };
        }

        function hasDestructuredImport(group: Rule.Node[]) {
            if (!Array.isArray(group)) {
                return false;
            }

            return group.some((node) => {
                if (!("specifiers" in node) || node.specifiers.length === 0) {
                    return false;
                }

                return node.specifiers.some((specifier) => specifier.type === "ImportSpecifier");
            });
        }

        return {
            Program(node) {
                const imports = node.body.filter((node) => node.type === "ImportDeclaration");

                if (imports.length === 0) {
                    return;
                }

                const groups = getImportGroups(imports as Rule.Node[]);

                for (const group of groups) {
                    checkSpacingAroundMultiLine(group.imports);

                    for (const importNode of group.imports) {
                        if (!isSingleLineNode(importNode)) {
                            continue;
                        }

                        // get the offset of the "from" keyword based on the group's targetFromPosition
                        const fromPos = getFromKeywordPosition(importNode);

                        if (!fromPos || !importNode.range) {
                            continue;
                        }

                        const spacesNeeded =
                            group.targetFromPosition - (fromPos - importNode.range[0]);

                        if (spacesNeeded !== 0) {
                            context.report({
                                "node":      importNode,
                                "messageId": "misalignedImport",

                                fix(fixer) {
                                    const closingBraceToken = sourceCode
                                        .getTokens(importNode)
                                        .find((token) => token.value === "}");

                                    const fromToken = sourceCode
                                        .getTokens(importNode)
                                        .find((token) => token.value === "from");

                                    if (!fromToken || !importNode.range) {
                                        return null;
                                    }

                                    if (closingBraceToken) {
                                        const prevToken =
                                            sourceCode.getTokenBefore(closingBraceToken);

                                        if (prevToken) {
                                            const start          = prevToken.range[1];
                                            const end            = closingBraceToken.range[0];
                                            const targetBracePos =
                                                group.targetClosingBracePosition ||
                                                group.targetFromPosition - 3;
                                            const spacesBeforeBrace = Math.max(
                                                1,
                                                targetBracePos -
                                                    (prevToken.range[1] - importNode.range[0]),
                                            );

                                            // always ensure at least 1 space before the closing brace (or adjust as needed)
                                            const fixes = [
                                                fixer.replaceTextRange(
                                                    [start, end],
                                                    " ".repeat(spacesBeforeBrace),
                                                ),
                                            ];

                                            // ensure exactly one space after the closing brace
                                            const afterBraceStart = closingBraceToken.range[1];
                                            const afterBraceEnd   = fromToken.range[0];

                                            if (afterBraceEnd > afterBraceStart) {
                                                fixes.push(
                                                    fixer.replaceTextRange(
                                                        [afterBraceStart, afterBraceEnd],
                                                        " ",
                                                    ),
                                                );
                                            } else if (afterBraceEnd === afterBraceStart) {
                                                fixes.push(
                                                    fixer.insertTextAfter(closingBraceToken, " "),
                                                );
                                            }

                                            return fixes;
                                        }
                                    } else {
                                        const prevToken = sourceCode.getTokenBefore(fromToken);

                                        if (prevToken) {
                                            const start        = prevToken.range[1];
                                            const end          = fromToken.range[0];
                                            const targetSpaces = Math.max(
                                                1,
                                                group.targetFromPosition -
                                                    (prevToken.range[1] - importNode.range[0]),
                                            );

                                            return fixer.replaceTextRange(
                                                [start, end],
                                                " ".repeat(targetSpaces),
                                            );
                                        }
                                    }

                                    return null;
                                },
                            });
                        }
                    }
                }
            },
        };
    },
};
