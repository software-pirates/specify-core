import { Rule } from "eslint";

export function isMultiLineNode(node: Rule.Node): boolean {
    return !isSingleLineNode(node);
}

export function isSingleLineNode(node: Rule.Node): boolean {
    if (!node.loc) {
        return false;
    }

    return node.loc.start.line === node.loc.end.line;
}

export function hasEmptyLineBetween(node1: Rule.Node, node2: Rule.Node): boolean {
    if (!node1.loc || !node2.loc) {
        return false;
    }

    return node2.loc.start.line - node1.loc.end.line > 1;
}
