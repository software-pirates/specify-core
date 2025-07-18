import { Rule     } from "eslint";
import { TSESTree } from "@typescript-eslint/utils";

import { isMultiLineNode, isSingleLineNode, hasEmptyLineBetween } from "../lib/utils";

type NodeGroup = {
    values: Rule.Node[];
    targetValueStartingPosition: number;
};

export default {
    "meta": {
        "type": "layout",
        "docs": {
            "description": "Enforce consistent alignment of object properties",
            "category":    "Stylistic Issues",
        },
        "fixable":  "whitespace",
        "schema":   [],
        "messages": {
            "misalignedProperty": "Object properties should be aligned with adjacent properties",
        },
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        function getValueGroups(values: Rule.Node[]): NodeGroup[] {
            const groups: Rule.Node[][] = [];

            let currentGroup: Rule.Node[] = [];

            for (let i = 0; i < values.length; i++) {
                const current  = values[i];
                const previous = values[i - 1];

                // skip nodes that have values on separate lines from the key (prettier does this)
                if (hasValueOnSeparateLine(current)) {
                    continue;
                }

                if (
                    !previous ||
                    hasEmptyLineBetween(previous, current) ||
                    isMultiLineNode(previous) ||
                    hasValueOnSeparateLine(previous)
                ) {
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
                return {
                    "values":                      group,
                    "targetValueStartingPosition": targetValueStartingPosition(group),
                };
            });
        }

        function hasValueOnSeparateLine(node: Rule.Node): boolean {
            const propertyNode = node.parent as TSESTree.Property;

            // if the property key does not have a location, we can't determine alignment
            // this can happen if the property is a shorthand property without a value
            if (!propertyNode?.key?.loc?.end) {
                return true;
            }

            // check if the value starts on a different line than the key
            if (!node?.loc?.start) {
                return false;
            }

            return (
                node.loc.start.line !== propertyNode.key.loc.end.line ||
                node.loc.start.column < propertyNode.key.loc.end.column
            );
        }

        function targetValueStartingPosition(group: Rule.Node[]) {
            let targetValueStartingPosition = 0;

            group.forEach((node) => {
                const propertyNode = node.parent as TSESTree.Property;

                if (!propertyNode?.key?.loc?.end) {
                    return null;
                }

                // +2 for the colon and space after the key
                const propertyEndPosition = propertyNode.key.loc.end.column + 2;

                targetValueStartingPosition = Math.max(
                    targetValueStartingPosition,
                    propertyEndPosition,
                );
            });

            return targetValueStartingPosition;
        }

        return {
            "ObjectExpression": (node) => {
                if (!node.properties || node.properties.length === 0) {
                    return;
                } else if (isSingleLineNode(node)) {
                    return;
                }

                const values = node.properties
                    .filter((prop) => prop.type === "Property" && !prop.method && !prop.shorthand)
                    .map((property) => (property as TSESTree.Property).value) as Rule.Node[];

                const valueGroups = getValueGroups(values);

                if (valueGroups.length === 0) {
                    return;
                }

                valueGroups.forEach((group) => {
                    const targetPosition = group.targetValueStartingPosition;

                    group.values.forEach((valueNode) => {
                        if (!("loc" in valueNode) || !valueNode.loc || !valueNode.loc.start) {
                            return;
                        }

                        const startPosition = valueNode.loc.start.column;

                        if (startPosition !== targetPosition) {
                            context.report({
                                "node":      valueNode,
                                "messageId": "misalignedProperty",
                                "fix":       (fixer) => {
                                    const propertyNode   = valueNode.parent as TSESTree.Property;
                                    const { sourceCode } = context;

                                    const tokensBetween = sourceCode.getTokensBetween(
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        propertyNode.key as any,

                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        valueNode as any,
                                    );

                                    const colonToken = tokensBetween.find(
                                        (token) => token.value === ":",
                                    );

                                    if (!colonToken || !valueNode?.range) {
                                        return null;
                                    }

                                    const colonEndColumn = colonToken.loc.end.column;
                                    const requiredSpaces = targetPosition - colonEndColumn;
                                    const padding        = " ".repeat(Math.max(0, requiredSpaces));

                                    return fixer.replaceTextRange(
                                        [colonToken.range[1], valueNode.range[0]],
                                        padding,
                                    );
                                },
                            });
                        }
                    });
                });
            },
        };
    },
};
